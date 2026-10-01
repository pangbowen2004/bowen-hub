"""Alpaca 免费新闻和 IEX 日线；加密日线按 UTC 日。"""

from collections.abc import Sequence
from datetime import UTC, date, datetime, time, timedelta
from typing import Any

from hub_contracts import Article, NewsCloseSnapshot
from hub_core.calendar import NyseCalendar
from hub_core.http import HttpClient
from hub_core.protocols import PriceBar
from hub_providers.common.base import Provider
from hub_providers.common.parsing import ET, bars, instant
from hub_providers.common.quotes import snapshot


class AlpacaSource(Provider):
    def __init__(
        self,
        http: HttpClient,
        key: str,
        secret: str,
        *,
        adjustment: str,
        index_symbols: Sequence[str] = (),
        source_id: str = "alpaca-news",
    ) -> None:
        super().__init__(
            http, source_id, headers={"APCA-API-KEY-ID": key, "APCA-API-SECRET-KEY": secret}
        )

        self.adjustment = adjustment
        self.index_symbols = index_symbols

    def pages(self, path: str, params: dict[str, str | int]) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        seen: set[str] = set()
        while True:
            page = self.get("https://data.alpaca.markets" + path, params=params)
            result.append(page)
            token = page.get("next_page_token")
            if not token:
                return result
            if token in seen:
                raise ValueError("分页 token 重复")
            seen.add(token)
            params = params | {"page_token": token}

    def fetch_news(
        self, start: datetime, end: datetime, symbols: Sequence[str] = ()
    ) -> Sequence[Article]:
        def fetch() -> list[Article]:
            params: dict[str, str | int] = {
                "start": start.isoformat(),
                "end": end.isoformat(),
                "limit": 50,
                "sort": "asc",
                "include_content": "true",
            }
            if symbols:
                params["symbols"] = ",".join(
                    s + "USD" if s in {"BTC", "XRP"} else s for s in symbols
                )
            result: dict[str, Article] = {}
            for page in self.pages("/v1beta1/news", params):
                for row in page["news"]:
                    published = instant(row["created_at"])
                    if not start <= published < end:
                        continue
                    identity = self.source_id + ":" + str(row["id"])
                    result[identity] = Article(
                        id=identity,
                        sourceId=self.source_id,
                        kind="news",
                        title=row["headline"],
                        url=row["url"],
                        publishedAt=published,
                        summary=row.get("summary") or None,
                        lang="en",
                        tickers=[
                            s[:-3] if s in {"BTCUSD", "XRPUSD"} else s
                            for s in row.get("symbols", [])
                        ],
                        topics=[],
                        paywall="none",
                        clusterId=None,
                    )
            return list(result.values())

        return self.run(fetch)

    def fetch_bars(self, symbols: Sequence[str], start: date, end: date) -> Sequence[PriceBar]:
        def fetch() -> list[PriceBar]:
            result: list[PriceBar] = []
            for crypto in (False, True):
                selected = [s for s in symbols if (s in {"BTC", "XRP"}) == crypto]
                if not selected:
                    continue
                previous = (
                    start - timedelta(days=1) if crypto else NyseCalendar().previous_session(start)
                )
                zone = UTC if crypto else ET
                params: dict[str, str | int] = {
                    "symbols": ",".join(s + "/USD" if crypto else s for s in selected),
                    "timeframe": "1Day",
                    "start": datetime.combine(previous, time.min, zone).isoformat(),
                    "end": datetime.combine(end + timedelta(days=1), time.min, zone).isoformat(),
                    "limit": 10000,
                    "sort": "asc",
                }
                if not crypto:
                    params |= {"feed": "iex", "adjustment": self.adjustment}
                path = "/v1beta3/crypto/us/bars" if crypto else "/v2/stocks/bars"
                raw: dict[str, list[tuple[date, float]]] = {}
                for page in self.pages(path, params):
                    for symbol, values in page["bars"].items():
                        name = symbol.removesuffix("/USD") if crypto else symbol
                        raw.setdefault(name, []).extend(
                            (instant(row["t"]).astimezone(zone).date(), float(row["c"]))
                            for row in values
                        )
                for symbol in selected:
                    result.extend(bars(symbol, raw.get(symbol, []), start, end, crypto=crypto))
            return result

        return self.run(fetch)

    def fetch_snapshot(self, session: date, symbols: Sequence[str]) -> NewsCloseSnapshot:
        requested = list(dict.fromkeys([*self.index_symbols, *symbols]))
        return snapshot(self.fetch_bars(requested, session, session), self.index_symbols, symbols)
