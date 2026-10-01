"""供应商只读验收；任何单源失败不阻断其他源。"""

from collections.abc import Callable
from dataclasses import replace
from datetime import UTC, date, datetime, time, timedelta
from functools import partial
from pathlib import Path
from typing import Any

import httpx

from hub_contracts import NewsSourceHealth
from hub_core.config import load_config
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_providers.alpaca.adapter import AlpacaSource
from hub_providers.cboe.adapter import CboeSource
from hub_providers.common.base import Provider
from hub_providers.common.config import sources_config
from hub_providers.common.parsing import ET
from hub_providers.common.recording import Recorder
from hub_providers.finnhub.adapter import FinnhubSource
from hub_providers.fred.adapter import FredSource
from hub_providers.rss.adapter import RssSource
from hub_providers.sec.adapter import SecSource
from hub_providers.tiingo.adapter import TiingoSource
from hub_providers.treasury.adapter import TreasurySource


# check 只测原始日历，不给未裁定 importance 填值。
def calendar_probe(
    provider: Provider, kind: str, start: date, end: date, config: dict[str, Any]
) -> None:
    if isinstance(provider, FredSource):
        identities = provider.release_ids()
        for release in config["macro"]["releases"]:
            identity = identities[release["fredName"]]
            provider.collection(
                "release/dates",
                "release_dates",
                {
                    "release_id": identity,
                    "realtime_start": start.isoformat(),
                    "realtime_end": end.isoformat(),
                    "include_release_dates_with_no_data": "true",
                },
            )
    else:
        page = provider.get(
            "https://finnhub.io/api/v1/calendar/earnings",
            params={"from": start.isoformat(), "to": end.isoformat()},
        )
        if not isinstance(page.get("earningsCalendar"), list):
            raise ValueError("缺少日历列表")


def check_sources(
    settings: Settings,
    config_dir: Path,
    day: date,
    *,
    include_disabled: bool = False,
    recorder: Recorder | None = None,
    client_factory: Callable[[], httpx.Client] | None = None,
) -> list[NewsSourceHealth]:
    config = load_config(config_dir / "newsroom.yaml")
    sources = sources_config(load_config(config_dir / "news_sources.yaml"))
    watchlist = load_config(config_dir / "us_watchlist.yaml")["items"]
    symbols = list(
        dict.fromkeys(config["snapshot"]["indexEtfs"] + [row["symbol"] for row in watchlist])
    )
    news_symbols = list(dict.fromkeys(row.get("underlying", row["symbol"]) for row in watchlist))
    start = datetime.combine(day, time.min, ET).astimezone(UTC)
    end = datetime.combine(day + timedelta(days=1), time.min, ET).astimezone(UTC)
    health: list[NewsSourceHealth] = []
    for source in sources:
        if not source.enabled and not include_disabled:
            continue
        client = (
            client_factory()
            if client_factory
            else httpx.Client(
                follow_redirects=True,
                event_hooks={"response": [recorder.response]} if recorder else {},
            )
        )
        http = HttpClient(timeout=source.timeout, client=client)
        provider: Provider | None = None
        try:
            kind = source.type
            if kind == "rss":
                provider = RssSource(
                    http,
                    source if source.enabled else replace(source, enabled=True),
                )
                provider.fetch_news(start, end)
            elif kind in {"alpaca_news", "alpaca_bars"}:
                if settings.alpaca_api_key_id is None or settings.alpaca_api_secret_key is None:
                    raise LookupError("缺少 ALPACA_API_KEY_ID/ALPACA_API_SECRET_KEY")
                provider = AlpacaSource(
                    http,
                    settings.alpaca_api_key_id.get_secret_value(),
                    settings.alpaca_api_secret_key.get_secret_value(),
                    adjustment="raw",
                    source_id=source.id,
                )
                if kind == "alpaca_news":
                    # 全市场新闻也覆盖股票与加密标记；不局限自选造成漏掉要闻。
                    provider.fetch_news(start, end)
                else:
                    provider.fetch_bars(symbols, day, day)
            elif kind == "tiingo":
                if settings.tiingo_api_key is None:
                    raise LookupError("缺少 TIINGO_API_KEY")
                provider = TiingoSource(
                    http, settings.tiingo_api_key.get_secret_value(), price_field="close"
                )
                provider.fetch_bars(symbols, day, day)
            elif kind == "sec":
                if not settings.sec_user_agent:
                    raise LookupError("缺少 SEC_USER_AGENT")
                filing = config["filings"]
                provider = SecSource(
                    http,
                    settings.sec_user_agent,
                    forms=[
                        filing["eightK"],
                        filing["sixK"],
                        *filing["periodic"],
                        *filing["offerings"],
                        *filing["ownership"],
                    ],
                )
                filings = provider.fetch_filings(start, end, news_symbols)
                provider.fetch_insiders(start, end, news_symbols)
                for filing in filings:
                    for exhibit in filing.exhibits:
                        provider.fetch_text(exhibit.url)
            elif kind in {"fred", "finnhub"}:
                key = settings.fred_api_key if kind == "fred" else settings.finnhub_api_key
                if key is None:
                    raise LookupError(
                        "缺少 " + ("FRED_API_KEY" if kind == "fred" else "FINNHUB_API_KEY")
                    )
                provider = (
                    FredSource(
                        http, key.get_secret_value(), config["macro"]["releases"], importance=""
                    )
                    if kind == "fred"
                    else FinnhubSource(http, key.get_secret_value(), importance="")
                )
                provider.run(
                    partial(calendar_probe, provider, kind, day, day + timedelta(days=7), config)
                )
            elif kind == "treasury" and source.url:
                provider = TreasurySource(http, source.url)
                provider.fetch_yield(day)
            elif kind == "cboe" and source.url:
                provider = CboeSource(http, source.url)
                provider.fetch_vix(day)
            else:
                raise LookupError("来源类型尚未接入")
            if provider.health is not None:
                health.append(provider.health)
        except LookupError as error:
            health.append(
                NewsSourceHealth(
                    id=source.id, checkedAt=datetime.now(UTC), status="failed", error=str(error)
                )
            )
        except Exception:
            health.append(
                provider.health
                if provider is not None and provider.health is not None
                else NewsSourceHealth(
                    id=source.id,
                    checkedAt=datetime.now(UTC),
                    status="failed",
                    error="来源请求或解析失败",
                )
            )
        finally:
            client.close()
    return health
