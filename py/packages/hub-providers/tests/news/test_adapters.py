"""所有供应商请求离线回放；事实边界和故障隔离。"""

from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest

from hub_core.http import HttpClient, SourceRequestError
from hub_providers.alpaca.adapter import AlpacaSource
from hub_providers.cboe.adapter import CboeSource
from hub_providers.common.base import ProviderError
from hub_providers.common.config import SourceConfig
from hub_providers.common.parsing import bars
from hub_providers.finnhub.adapter import FinnhubSource
from hub_providers.fred.adapter import FredSource
from hub_providers.rss.adapter import RssSource
from hub_providers.sec.adapter import SecRateLimiter, SecSource, form4
from hub_providers.tiingo.adapter import TiingoSource
from hub_providers.treasury.adapter import TreasurySource

ROOT = Path(__file__).resolve().parents[5]
DAY = date(2026, 9, 30)
START = datetime(2026, 9, 30, 4, tzinfo=UTC)
END = datetime(2026, 10, 1, 4, tzinfo=UTC)


def http(handler: Callable[[httpx.Request], httpx.Response], *, retries: int = 0) -> HttpClient:
    return HttpClient(
        client=httpx.Client(transport=httpx.MockTransport(handler)),
        retries=retries,
        sleeper=lambda _: None,
    )


def response(data: Any) -> Callable[[httpx.Request], httpx.Response]:
    return lambda _: httpx.Response(200, json=data)


def rss_config(enabled: bool = True) -> SourceConfig:
    return SourceConfig(
        "test-rss",
        "测试源",
        "rss",
        enabled,
        "https://example.test/rss",
        "zh",
        "metered",
        8,
        20,
        "us",
        2,
        None,
    )


def test_rss_window_timestamp_and_paywall() -> None:
    source = RssSource(
        http(
            lambda _: httpx.Response(
                200, text=(ROOT / "fixtures/http/news/rss-edge.xml").read_text()
            )
        ),
        rss_config(),
    )
    news = source.fetch_news(START, END)
    assert len(news) == 1
    assert news[0].summary == "摘要"
    assert news[0].paywall == "metered"
    assert news[0].lang == "zh"
    assert news[0].tickers == []
    assert news[0].clusterId is None
    assert source.health is not None
    assert source.health.status == "ok"


def test_disabled_rss_does_not_request() -> None:
    def forbidden(_: httpx.Request) -> httpx.Response:
        raise AssertionError("停用源不应请求")

    assert RssSource(http(forbidden), rss_config(False)).fetch_news(START, END) == []


def test_alpaca_news_pagination_crypto_and_half_open_window() -> None:
    requests: list[httpx.Request] = []
    row = {
        "id": 123,
        "headline": "标题",
        "url": "https://example.test/news",
        "created_at": START.isoformat(),
        "symbols": ["BTCUSD", "NVDA"],
        "summary": "摘要",
    }

    def replay(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "news": [
                    row | ({"id": 124, "created_at": END.isoformat()} if len(requests) == 2 else {})
                ],
                "next_page_token": "p2" if len(requests) == 1 else None,
            },
        )

    source = AlpacaSource(http(replay), "offline-key", "offline-secret", adjustment="raw")
    news = source.fetch_news(START, END, ["BTC", "NVDA"])
    assert len(news) == 1
    assert news[0].id == "alpaca-news:123"
    assert news[0].tickers == ["BTC", "NVDA"]
    assert requests[0].url.params["symbols"] == "BTCUSD,NVDA"
    assert requests[1].url.params["page_token"] == "p2"


@pytest.mark.parametrize("adjustment", ["raw", "split", "all"])
def test_alpaca_stock_bars_paginate_and_explicit_adjustment(adjustment: str) -> None:
    requests: list[httpx.Request] = []

    def replay(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        rows = (
            [{"t": "2026-09-29T04:00:00Z", "c": 100}]
            if len(requests) == 1
            else [{"t": "2026-09-30T04:00:00Z", "c": 103}]
        )
        return httpx.Response(
            200,
            json={"bars": {"SPY": rows}, "next_page_token": "next" if len(requests) == 1 else None},
        )

    source = AlpacaSource(
        http(replay), "offline", "offline", adjustment=adjustment, index_symbols=["SPY"]
    )
    snapshot = source.fetch_snapshot(DAY, ["SPY"])
    assert snapshot.indices[0].change == pytest.approx(0.03)
    assert requests[0].url.params["adjustment"] == adjustment
    assert requests[0].url.params["feed"] == "iex"
    assert snapshot.vix is None
    assert snapshot.treasury10Year is None


def test_crypto_utc_daily_and_missing_day_no_cross_gap() -> None:
    requests: list[httpx.Request] = []

    def replay(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json={
                "bars": {
                    "BTC/USD": [
                        {"t": "2026-09-29T00:00:00Z", "c": 100},
                        {"t": "2026-09-30T00:00:00Z", "c": 101},
                    ]
                }
            },
        )

    values = AlpacaSource(http(replay), "offline", "offline", adjustment="raw").fetch_bars(
        ["BTC"], DAY, DAY
    )
    assert values[0].date == DAY
    assert values[0].return1d == pytest.approx(0.01)
    assert requests[0].url.params["start"] == "2026-09-29T00:00:00+00:00"
    assert (
        bars("BTC", [(date(2026, 9, 28), 100), (DAY, 101)], DAY, DAY, crypto=True)[0].return1d
        is None
    )


@pytest.mark.parametrize("price_field", ["close", "adjClose"])
def test_tiingo_explicit_field_and_no_crypto_stock_requests(price_field: str) -> None:
    requests: list[httpx.Request] = []

    def replay(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(
            200,
            json=[
                {"date": "2026-09-29T00:00:00Z", "close": 100, "adjClose": 50},
                {"date": "2026-09-30T00:00:00Z", "close": 110, "adjClose": 51},
            ],
        )

    values = TiingoSource(http(replay), "offline", price_field=price_field).fetch_bars(
        ["NVDA", "BTC"], DAY, DAY
    )
    assert len(requests) == len(values) == 1
    assert values[0].return1d == pytest.approx(0.1 if price_field == "close" else 0.02)


def test_form4_all_codes_and_original_row_keys_unknown_price() -> None:
    trades = form4(
        (ROOT / "fixtures/http/news/form4-edge.xml").read_text(),
        accession="0001-26-000001",
        ticker="NVDA",
        filed_at=START,
        url="https://example.test/4.xml",
    )
    assert [row.code for row in trades] == ["P", "S", "M", "F", "A"]
    assert [row.transactionIndex for row in trades] == list(range(5))
    assert trades[0].valueUsd == 1000
    assert trades[3].priceUsd is None
    assert trades[3].valueUsd is None
    assert trades[4].priceUsd is None


def test_sec_company_cik_submissions_index_and_exhibit_text() -> None:
    def replay(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if path.endswith("company_tickers.json"):
            return httpx.Response(
                200,
                json={"0": {"ticker": "TSM", "cik_str": 1046179, "title": "Taiwan Semiconductor"}},
            )
        if path.endswith("CIK0001046179.json"):
            return httpx.Response(
                200,
                json={
                    "filings": {
                        "recent": {
                            "accessionNumber": ["0001046179-26-000001"],
                            "form": ["6-K"],
                            "acceptanceDateTime": [START.isoformat()],
                            "primaryDocument": ["primary.htm"],
                            "items": [""],
                        },
                        "files": [],
                    }
                },
            )
        if path.endswith("-index.htm"):
            return httpx.Response(
                200,
                text='<table class="tableFile"><tr><td>1</td><td>财报</td><td><a href="ex99.htm">附件</a></td><td>EX-99.2</td></tr></table>',
            )
        return httpx.Response(200, text="<html><body><p>Revenue 123</p></body></html>")

    source = SecSource(
        http(replay),
        "Offline tests contact@example.test",
        forms=["6-K"],
        limiter=SecRateLimiter(sleeper=lambda _: None),
    )
    filings = source.fetch_filings(START, END, ["TSM"])
    assert filings[0].cik == "0001046179"
    assert filings[0].items == []
    assert filings[0].exhibits[0].name == "EX-99.2"
    assert source.fetch_text(filings[0].exhibits[0].url) == "Revenue 123"


def test_sec_rate_limit() -> None:
    now = [0.0]
    waits: list[float] = []

    def wait(delay: float) -> None:
        waits.append(delay)
        now[0] += delay

    limiter = SecRateLimiter(clock=lambda: now[0], sleeper=wait)
    for _ in range(12):
        limiter.wait()
    assert sum(waits) == pytest.approx(1.1)
    assert all(delay >= 0.099 for delay in waits)


@pytest.mark.parametrize(("day", "hour"), [(date(2026, 3, 6), 13), (date(2026, 3, 9), 12)])
def test_fred_exact_name_and_dst(day: date, hour: int) -> None:
    def replay(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/releases"):
            return httpx.Response(
                200, json={"count": 1, "releases": [{"id": 10, "name": "Consumer Price Index"}]}
            )
        assert request.url.params["release_id"] == "10"
        return httpx.Response(200, json={"count": 1, "release_dates": [{"date": day.isoformat()}]})

    event = FredSource(
        http(replay),
        "offline",
        [{"fredName": "Consumer Price Index", "label": "CPI", "timeEt": "08:30"}],
        importance="调用方明确值",
    ).fetch_events(day, day)[0]
    assert event.at is not None
    assert event.at.hour == hour
    assert event.fredReleaseId == 10
    assert event.importance == "调用方明确值"


def test_finnhub_unknown_time_and_all_symbols() -> None:
    calendar = [
        {"date": DAY.isoformat(), "symbol": symbol, "hour": timing}
        for symbol, timing in [("NVDA", "amc"), ("TSM", "bmo"), ("AAPL", "dmh")]
    ]
    events = FinnhubSource(
        http(response({"earningsCalendar": calendar})), "offline", importance="调用方明确值"
    ).fetch_events(DAY, DAY)
    assert [event.timing for event in events] == ["amc", "bmo", None]
    assert all(event.at is None for event in events)


def test_treasury_and_vix_exact_session_and_missing() -> None:
    treasury = TreasurySource(
        http(
            lambda _: httpx.Response(
                200,
                text='<root xmlns:d="urn:test"><d:properties><d:NEW_DATE>2026-09-30T00:00:00</d:NEW_DATE><d:BC_10YEAR>4.2</d:BC_10YEAR></d:properties></root>',
            )
        ),
        "https://example.test/yield",
    )
    assert treasury.fetch_yield(DAY) == 4.2
    assert treasury.fetch_yield(date(2026, 10, 1)) is None
    cboe = CboeSource(
        http(
            lambda _: httpx.Response(
                200, text="DATE,OPEN,HIGH,LOW,CLOSE\n09/30/2026,20,21,19,20.5\n"
            )
        ),
        "https://example.test/vix",
    )
    assert cboe.fetch_vix(DAY) == 20.5
    assert cboe.fetch_vix(date(2026, 10, 1)) is None


def test_429_retry_timeout_parse_failure_do_not_leak_and_rss_survives() -> None:
    calls = [0]

    def throttled(_: httpx.Request) -> httpx.Response:
        calls[0] += 1
        return (
            httpx.Response(429, text="敏感正文")
            if calls[0] < 3
            else httpx.Response(200, json={"news": []})
        )

    source = AlpacaSource(http(throttled, retries=2), "offline", "offline", adjustment="raw")
    assert source.fetch_news(START, END) == []
    assert calls[0] == 3

    def timeout(request: httpx.Request) -> httpx.Response:
        raise httpx.ReadTimeout("敏感内容", request=request)

    source = AlpacaSource(http(timeout), "offline", "offline", adjustment="raw")
    with pytest.raises(SourceRequestError, match="ReadTimeout") as failure:
        source.fetch_news(START, END)
    assert "敏感" not in str(failure.value)
    assert RssSource(
        http(
            lambda _: httpx.Response(
                200, text=(ROOT / "fixtures/http/news/rss-edge.xml").read_text()
            )
        ),
        rss_config(),
    ).fetch_news(START, END)
    source = AlpacaSource(
        http(lambda _: httpx.Response(200, text="敏感非法 JSON")),
        "offline",
        "offline",
        adjustment="raw",
    )
    with pytest.raises(ProviderError, match="响应解析失败") as failure:
        source.fetch_news(START, END)
    assert "敏感" not in str(failure.value)


def test_sec_old_submissions_page_and_8k_items() -> None:
    requests: list[str] = []
    table = {
        "accessionNumber": ["0001-26-000002"],
        "form": ["8-K/A"],
        "acceptanceDateTime": [START.isoformat()],
        "primaryDocument": ["primary.htm"],
    }

    def replay(request: httpx.Request) -> httpx.Response:
        requests.append(request.url.path)
        if request.url.path.endswith("company_tickers.json"):
            return httpx.Response(
                200, json={"0": {"ticker": "NVDA", "cik_str": 1, "title": "NVIDIA"}}
            )
        if request.url.path.endswith("CIK0000000001.json"):
            return httpx.Response(
                200,
                json={
                    "filings": {
                        "recent": {"accessionNumber": []},
                        "files": [
                            {
                                "filingFrom": "2026-09-01",
                                "filingTo": "2026-10-01",
                                "name": "old.json",
                            },
                            {
                                "filingFrom": "2025-01-01",
                                "filingTo": "2025-02-01",
                                "name": "unrelated.json",
                            },
                        ],
                    }
                },
            )
        if request.url.path.endswith("old.json"):
            return httpx.Response(200, json=table)
        if request.url.path.endswith("-index.htm"):
            return httpx.Response(
                200,
                text='<table class="tableFile"><tr><td>2</td><td>财报</td><td><a href="ex.htm">附件</a></td><td>EX-99.1</td></tr><tr><td>3</td><td>其它</td><td><a href="other.htm">附件</a></td><td>EX-99.2</td></tr></table>',
            )
        return httpx.Response(200, text="<body>Item 2.02 Results. Item 9.01 Exhibits.</body>")

    source = SecSource(
        http(replay),
        "Tests contact@example.test",
        forms=["8-K"],
        limiter=SecRateLimiter(sleeper=lambda _: None),
    )
    filings = source.fetch_filings(START, END, ["NVDA"])
    assert len(filings) == 1
    assert filings[0].form == "8-K/A"
    assert filings[0].items == ["2.02", "9.01"]
    assert [exhibit.name for exhibit in filings[0].exhibits] == ["EX-99.1"]
    assert not any(path.endswith("unrelated.json") for path in requests)


def test_sec_form4_raw_xml_not_xsl_display_path() -> None:
    requests: list[str] = []

    def replay(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        requests.append(path)
        if path.endswith("company_tickers.json"):
            return httpx.Response(
                200, json={"0": {"ticker": "NVDA", "cik_str": 1, "title": "NVIDIA"}}
            )
        if path.endswith("CIK0000000001.json"):
            return httpx.Response(
                200,
                json={
                    "filings": {
                        "recent": {
                            "accessionNumber": ["0001-26-000001"],
                            "form": ["4"],
                            "acceptanceDateTime": [START.isoformat()],
                            "primaryDocument": ["xslF345X05/ownership.xml"],
                        },
                        "files": [],
                    }
                },
            )
        if path.endswith("-index.htm"):
            return httpx.Response(
                200,
                text='<table class="tableFile"><tr><td>1</td><td>Form 4</td><td><a href="xslF345X05/ownership.xml">XML</a></td><td>4</td></tr></table>',
            )
        assert "xslF345" not in path
        return httpx.Response(200, text=(ROOT / "fixtures/http/news/form4-edge.xml").read_text())

    source = SecSource(
        http(replay),
        "Tests contact@example.test",
        forms=["8-K"],
        limiter=SecRateLimiter(sleeper=lambda _: None),
    )
    assert len(source.fetch_insiders(START, END, ["NVDA"])) == 5
    assert requests[-1].endswith("/ownership.xml")


def test_repeated_alpaca_token_and_missing_fred_name_fail_health() -> None:
    source = AlpacaSource(
        http(response({"news": [], "next_page_token": "repeat"})),
        "offline",
        "offline",
        adjustment="raw",
    )
    with pytest.raises(ProviderError):
        source.fetch_news(START, END)
    assert source.health is not None
    assert source.health.status == "failed"
    fred = FredSource(
        http(response({"count": 1, "releases": [{"id": 1, "name": "Different"}]})),
        "offline",
        [{"fredName": "Consumer Price Index", "label": "CPI", "timeEt": "08:30"}],
        importance="调用方明确值",
    )
    with pytest.raises(ProviderError):
        fred.fetch_events(DAY, DAY)
    assert fred.health is not None
    assert fred.health.status == "failed"


def test_fred_release_list_pagination() -> None:
    offsets: list[str] = []

    def replay(request: httpx.Request) -> httpx.Response:
        offset = request.url.params["offset"]
        offsets.append(offset)
        return httpx.Response(
            200, json={"count": 2, "releases": [{"id": int(offset) + 1, "name": offset}]}
        )

    source = FredSource(http(replay), "offline", [], importance="调用方明确值")
    assert source.release_ids() == {"0": 1, "1": 2}
    assert offsets == ["0", "1"]


def test_optional_series_invalid_payload_is_failure_not_empty_success() -> None:
    treasury = TreasurySource(
        http(lambda _: httpx.Response(200, text="<html/>")), "https://example.test/yield"
    )
    with pytest.raises(ProviderError):
        treasury.fetch_yield(DAY)
    cboe = CboeSource(
        http(lambda _: httpx.Response(200, text="WRONG,HEADER\n")), "https://example.test/vix"
    )
    with pytest.raises(ProviderError):
        cboe.fetch_vix(DAY)
    with pytest.raises(ValueError, match="非有限"):
        bars("NVDA", [(DAY, float("nan"))], DAY, DAY)


def test_form4_computed_value_must_be_representable_no_business_threshold() -> None:
    xml = "<ownershipDocument><nonDerivativeTable><nonDerivativeTransaction><transactionCoding><transactionCode>S</transactionCode></transactionCoding><transactionAmounts><transactionShares><value>1e300</value></transactionShares><transactionPricePerShare><value>1e300</value></transactionPricePerShare></transactionAmounts></nonDerivativeTransaction></nonDerivativeTable></ownershipDocument>"
    with pytest.raises(ValueError, match="非有限"):
        form4(
            xml,
            accession="test",
            ticker="NVDA",
            filed_at=START,
            url="https://example.test/form4.xml",
        )


@pytest.mark.parametrize(
    ("source_id", "kind"),
    [("fed-monetary", "press_release"), ("fed-all", "press_release"), ("fed-unverified", "news")],
)
def test_known_fed_feeds_are_press_releases_not_guessed_topics(source_id: str, kind: str) -> None:
    source = RssSource(
        http(
            lambda _: httpx.Response(
                200, text=(ROOT / "fixtures/http/news/rss-edge.xml").read_text()
            )
        ),
        replace(rss_config(), id=source_id),
    )
    article = source.fetch_news(START, END)[0]
    assert article.kind == kind
    assert article.topics == []


def test_snapshot_indices_and_watch_etf_own_prices_even_when_same_symbol() -> None:
    requests: list[httpx.Request] = []

    def replay(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        symbols = request.url.params["symbols"].split(",")
        return httpx.Response(
            200,
            json={
                "bars": {
                    symbol: [
                        {"t": "2026-09-29T04:00:00Z", "c": 100},
                        {"t": "2026-09-30T04:00:00Z", "c": 110 if symbol == "TSMX" else 101},
                    ]
                    for symbol in symbols
                }
            },
        )

    source = AlpacaSource(
        http(replay), "offline", "offline", adjustment="raw", index_symbols=["SPY"]
    )
    snapshot = source.fetch_snapshot(DAY, ["TSMX", "SPY"])
    assert [item.symbol for item in snapshot.indices] == ["SPY"]
    assert [item.symbol for item in snapshot.watchlist] == ["SPY", "TSMX"]
    assert snapshot.watchlist[1].change == pytest.approx(0.1)
    assert requests[0].url.params["symbols"] == "SPY,TSMX"
    assert "TSM" not in requests[0].url.params["symbols"].split(",")
