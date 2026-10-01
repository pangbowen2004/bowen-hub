"""Tiingo 日线只作股票/ETF 兜底，不拿股票接口代替加密日线。"""

from collections.abc import Sequence
from datetime import date
from typing import Any

from hub_contracts import NewsCloseSnapshot
from hub_core.calendar import NyseCalendar
from hub_core.http import HttpClient
from hub_core.protocols import PriceBar
from hub_providers.common.base import Provider
from hub_providers.common.parsing import bars, instant
from hub_providers.common.quotes import snapshot


class TiingoSource(Provider):
    def __init__(
        self, http: HttpClient, key: str, *, index_symbols: Sequence[str] = (), price_field: str
    ) -> None:
        super().__init__(http, "tiingo-eod", headers={"Authorization": "Token " + key})

        self.price_field = price_field
        self.index_symbols = index_symbols

    def fetch_bars(self, symbols: Sequence[str], start: date, end: date) -> Sequence[PriceBar]:
        def fetch() -> list[PriceBar]:
            previous = NyseCalendar().previous_session(start)
            result: list[PriceBar] = []
            for symbol in symbols:
                if symbol in {"BTC", "XRP"}:
                    continue
                values = self.get(
                    "https://api.tiingo.com/tiingo/daily/" + symbol + "/prices",
                    params={"startDate": previous.isoformat(), "endDate": end.isoformat()},
                )
                result.extend(
                    bars(
                        symbol,
                        [
                            (instant(row["date"]).date(), float(row[self.price_field]))
                            for row in values
                        ],
                        start,
                        end,
                    )
                )
            return result

        return self.run(fetch)

    def fetch_snapshot(self, session: date, symbols: Sequence[str]) -> NewsCloseSnapshot:
        requested = list(dict.fromkeys([*self.index_symbols, *symbols]))
        return snapshot(self.fetch_bars(requested, session, session), self.index_symbols, symbols)

    def metadata(self, symbol: str) -> dict[str, Any]:
        return self.run(lambda: self.get("https://api.tiingo.com/tiingo/daily/" + symbol))
