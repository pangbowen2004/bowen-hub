"""FRED 名称精确查 release id，再按配置发布时间转 UTC。"""

from collections.abc import Sequence
from datetime import UTC, date, datetime, time
from typing import Any

from hub_contracts import CalendarEvent
from hub_core.http import HttpClient
from hub_providers.common.base import Provider
from hub_providers.common.parsing import ET


class FredSource(Provider):
    def __init__(
        self, http: HttpClient, key: str, releases: Sequence[dict[str, str]], *, importance: str
    ) -> None:
        super().__init__(http, "fred-calendar")
        self.key = key
        self.releases = releases
        self.importance = importance

    def collection(
        self, path: str, field: str, params: dict[str, str | int]
    ) -> list[dict[str, Any]]:
        result: list[dict[str, Any]] = []
        offset = 0
        while True:
            page = self.get(
                "https://api.stlouisfed.org/fred/" + path,
                params=params
                | {"api_key": self.key, "file_type": "json", "limit": 1000, "offset": offset},
            )
            values = page[field]
            result.extend(values)
            offset += len(values)
            if offset >= page["count"]:
                return result
            if not values:
                raise ValueError("日历分页未前进")

    def release_ids(self) -> dict[str, int]:
        return self.run(
            lambda: {
                row["name"]: int(row["id"]) for row in self.collection("releases", "releases", {})
            }
        )

    def fetch_events(
        self, start: date, end: date, symbols: Sequence[str] = ()
    ) -> Sequence[CalendarEvent]:
        def fetch() -> list[CalendarEvent]:
            mapping = self.release_ids()
            result: list[CalendarEvent] = []
            for config in self.releases:
                identity = mapping[config["fredName"]]
                dates = self.collection(
                    "release/dates",
                    "release_dates",
                    {
                        "release_id": identity,
                        "realtime_start": start.isoformat(),
                        "realtime_end": end.isoformat(),
                        "include_release_dates_with_no_data": "true",
                    },
                )
                for row in dates:
                    day = date.fromisoformat(row["date"])
                    if start <= day <= end:
                        at = datetime.combine(
                            day, time.fromisoformat(config["timeEt"]), ET
                        ).astimezone(UTC)
                        result.append(
                            CalendarEvent(
                                kind="macro",
                                date=day,
                                fredReleaseId=identity,
                                at=at,
                                title=config["label"],
                                tickers=[],
                                timing=config["timeEt"],
                                importance=self.importance,
                            )
                        )
            return result

        return self.run(fetch)
