"""Finnhub 财报只保留供应商日期与盘前/盘后，未知时间不补造。"""

from collections.abc import Sequence
from datetime import date

from hub_contracts import CalendarEvent
from hub_core.http import HttpClient
from hub_providers.common.base import Provider


class FinnhubSource(Provider):
    def __init__(self, http: HttpClient, key: str, *, importance: str) -> None:
        super().__init__(http, "finnhub-earnings", headers={"X-Finnhub-Token": key})
        self.importance = importance

    def fetch_events(
        self,
        start: date,
        end: date,
        symbols: Sequence[str] = (),
        *,
        per_symbol: bool = False,
        aliases: dict[str, list[str]] | None = None,
    ) -> Sequence[CalendarEvent]:
        def fetch() -> list[CalendarEvent]:
            result: dict[tuple[date, str], CalendarEvent] = {}
            # 全市场返回并不完整；有名单时逐公司查询，仍服从上游限流与重试。
            for requested in dict.fromkeys(symbols if per_symbol and symbols else [""]):
                params: dict[str, str | int] = {"from": start.isoformat(), "to": end.isoformat()}
                if requested:
                    params["symbol"] = requested
                page = self.get("https://finnhub.io/api/v1/calendar/earnings", params=params)
                accepted = {requested, *(aliases or {}).get(requested, [])}
                for row in page["earningsCalendar"]:
                    day = date.fromisoformat(row["date"])
                    symbol = row["symbol"]
                    if (
                        not start <= day <= end
                        or (requested and symbol not in accepted)
                        or (not requested and symbols and symbol not in symbols)
                    ):
                        continue
                    # 映射主上市地/股类后，不把原市场的盘前盘后时刻冒充美股时刻。
                    timing = row.get("hour") if not requested or symbol == requested else None
                    symbol = requested or symbol
                    result[(day, symbol)] = CalendarEvent(
                        kind="earnings",
                        date=day,
                        fredReleaseId=None,
                        at=None,
                        title=symbol,
                        tickers=[symbol],
                        timing=timing if timing in {"bmo", "amc"} else None,
                        importance=self.importance,
                    )
            return list(result.values())

        return self.run(fetch)
