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
        self, start: date, end: date, symbols: Sequence[str] = ()
    ) -> Sequence[CalendarEvent]:
        def fetch() -> list[CalendarEvent]:
            page = self.get(
                "https://finnhub.io/api/v1/calendar/earnings",
                params={"from": start.isoformat(), "to": end.isoformat()},
            )
            result: dict[tuple[date, str], CalendarEvent] = {}
            for row in page["earningsCalendar"]:
                day = date.fromisoformat(row["date"])
                symbol = row["symbol"]
                if start <= day <= end and (not symbols or symbol in symbols):
                    timing = row.get("hour")
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
