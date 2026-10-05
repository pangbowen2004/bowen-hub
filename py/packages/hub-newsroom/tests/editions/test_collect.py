"""采集编排离线边界：无Alpaca、财报确证、健康状态与快照同源。"""

import asyncio
from datetime import UTC, datetime

import httpx
from pydantic import SecretStr

from hub_contracts import Article, WatchItem
from hub_core.calendar import NyseCalendar
from hub_core.config import load_config
from hub_core.http import HttpClient
from hub_core.settings import Settings as EnvironmentSettings
from hub_newsroom.common.settings import Settings
from hub_newsroom.editions.collect import Collector, earnings_news
from hub_newsroom.editions.service import Options, Publisher
from hub_newsroom.pipeline.windows import edition_window
from hub_providers.common.config import sources_config

from .helpers import ROOT, FakeStore, FakeTransport


def test_no_alpaca_rss_matches_watchlist(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    now = datetime(2026, 9, 29, 23, 10, tzinfo=UTC)
    calls: list[str] = []

    def response(request: httpx.Request) -> httpx.Response:
        calls.append(str(request.url))
        assert request.url.host == "www.cnbc.com"
        return httpx.Response(
            200,
            text="""<rss version="2.0"><channel><title>离线合成</title><item><title>Nvidia signs synthetic contract</title><link>https://example.test/contract</link><pubDate>Tue, 29 Sep 2026 20:00:00 GMT</pubDate><description>明确的合成测试材料。</description></item></channel></rss>""",
            request=request,
        )

    sources = [
        row
        for row in sources_config(load_config(ROOT / "config/news_sources.yaml"))
        if row.id in {"alpaca-news", "cnbc-top"}
    ]
    env = EnvironmentSettings.model_construct()
    store = FakeStore(watchlist)
    transport = FakeTransport(store)
    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        collector = Collector(
            env, settings, sources, HttpClient(client=client, retries=0), calendar
        )
        service = Publisher(
            settings,
            store,
            collector,
            calendar,
            transport,
            clock=lambda: now,
            subjects={"morning": "合成早报｜{date}"},
        )
        result = asyncio.run(service.publish(Options("morning", no_ai=True, no_email=True)))
    assert result.edition
    assert result.mail
    assert not result.sent
    assert not transport.messages
    assert "Nvidia signs synthetic contract" in result.mail.text
    assert "RSS 匹配" in result.mail.text
    assert any(row.id == "alpaca-news" and row.status == "failed" for row in result.edition.sources)
    articles = store.batches["/v1/internal/news/articles/batch"]
    assert articles[0].model_dump()["tickers"] == ["NVDA"]
    assert len(calls) == 1


def test_calendar_unspecified_and_same_source_price_endpoints(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    now = datetime(2026, 10, 1, 4, tzinfo=UTC)
    sources = [
        row
        for row in sources_config(load_config(ROOT / "config/news_sources.yaml"))
        if row.id in {"alpaca-bars", "tiingo-eod"}
    ]
    adjustments: list[str] = []

    def response(request: httpx.Request) -> httpx.Response:
        if request.url.host == "data.alpaca.markets":
            adjustments.append(request.url.params["adjustment"])
            # 只有末端：不能把Tiingo前值与这个未配对的价格混合。
            symbols = request.url.params["symbols"].split(",")
            return httpx.Response(
                200,
                json={
                    "bars": {
                        symbol: [{"t": "2026-09-30T04:00:00Z", "c": 999}] for symbol in symbols
                    },
                    "next_page_token": None,
                },
                request=request,
            )
        assert request.url.host == "api.tiingo.com"
        return httpx.Response(
            200,
            json=[
                {"date": "2026-09-28T00:00:00Z", "close": 1600, "adjClose": 160},
                {"date": "2026-09-29T00:00:00Z", "close": 1700, "adjClose": 170},
                {"date": "2026-09-30T00:00:00Z", "close": 1800, "adjClose": 180},
            ],
            request=request,
        )

    env = EnvironmentSettings.model_construct(
        alpaca_api_key_id=SecretStr("offline"),
        alpaca_api_secret_key=SecretStr("offline"),
        tiingo_api_key=SecretStr("offline"),
    )
    watches = [watchlist[0]]
    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        collector = Collector(
            env, settings, sources, HttpClient(client=client, retries=0), calendar
        )
        result = collector.collect(edition_window("morning", now, settings, calendar), watches)
    assert result.snapshot
    assert result.snapshot_session.isoformat() == "2026-09-30"  # pyright: ignore[reportOptionalMemberAccess]
    assert adjustments == ["all"]
    assert all(abs(row.change - (180 / 170 - 1)) < 1e-12 for row in result.snapshot.watchlist)
    assert result.snapshot.watchlist[0].symbol == "NVDA"


def test_one_source_failure_is_sticky_and_safe(settings: Settings, calendar: NyseCalendar) -> None:
    with httpx.Client(
        transport=httpx.MockTransport(lambda req: httpx.Response(200, request=req))
    ) as client:
        collector = Collector(
            EnvironmentSettings.model_construct(), settings, [], HttpClient(client=client), calendar
        )

        def fail() -> int:
            raise ValueError("test-private-key-must-not-appear")

        assert collector.attempt("source", fail, 0) == 0
        assert collector.attempt("source", lambda: 1, 0) == 1
        assert collector.health["source"].status == "failed"
        assert "test-private" not in (collector.health["source"].error or "")


def test_earnings_news_requires_body_and_retains_confirmation() -> None:
    def article(title: str, body: str | None) -> Article:
        return Article(
            id="earnings",
            sourceId="alpaca-news",
            kind="news",
            title=title,
            url="https://example.test/results",
            publishedAt=datetime(2026, 9, 30, tzinfo=UTC),
            summary=body,
            lang="en",
            tickers=["TEST"],
            topics=[],
            paywall="none",
            clusterId=None,
        )

    assert not earnings_news([article("TEST announces earnings", None)])
    unconfirmed = earnings_news(
        [
            article(
                "TEST announces quarterly results", "Please attend our upcoming earnings webcast."
            )
        ]
    )
    assert len(unconfirmed) == 1
    assert not unconfirmed[0].confirmed
    actual = earnings_news(
        [
            article(
                "TEST reports quarterly results",
                "TEST reported financial results for the fiscal quarter. Revenue was $12 million.",
            )
        ]
    )
    assert len(actual) == 1
    assert actual[0].confirmed  # 合法财报不要求EPS存在。


def test_calendar_importance_is_unspecified(settings: Settings, calendar: NyseCalendar) -> None:
    sources = [
        row
        for row in sources_config(load_config(ROOT / "config/news_sources.yaml"))
        if row.id in {"fred-calendar", "finnhub-earnings"}
    ]
    now = datetime(2026, 9, 29, 23, 10, tzinfo=UTC)

    def response(req: httpx.Request) -> httpx.Response:
        if req.url.path.endswith("releases"):
            releases = [
                {"id": index, "name": row.fredName}
                for index, row in enumerate(settings.newsroom.macro.releases, 1)
            ]
            return httpx.Response(
                200, json={"releases": releases, "count": len(releases)}, request=req
            )
        if req.url.path.endswith("release/dates"):
            return httpx.Response(
                200, json={"release_dates": [{"date": "2026-09-30"}], "count": 1}, request=req
            )
        return httpx.Response(
            200,
            json={"earningsCalendar": [{"date": "2026-09-30", "symbol": "NVDA", "hour": "amc"}]},
            request=req,
        )

    environment = EnvironmentSettings.model_construct(
        fred_api_key=SecretStr("offline"), finnhub_api_key=SecretStr("offline")
    )
    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        collector = Collector(
            environment, settings, sources, HttpClient(client=client, retries=0), calendar
        )
        result = collector.collect(edition_window("morning", now, settings, calendar), [])
    assert len(result.events) == len(settings.newsroom.macro.releases) + 1
    assert all(row.importance == "unspecified" for row in result.events)
    assert result.events[-1].at is None
    assert result.events[-1].timing == "amc"
