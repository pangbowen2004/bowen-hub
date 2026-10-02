"""市场存取边界；完整读分页账本，写入只经过服务令牌API。"""

from collections.abc import Sequence
from datetime import date
from typing import Protocol, TypeVar
from urllib.parse import quote, urlencode

from pydantic import BaseModel

from hub_contracts import (
    Hypothesis,
    HypothesisPage,
    IndexBar,
    MarketDay,
    MarketDaySummary,
    MarketDaySummaryPage,
    MarketDayWrite,
    MarketReference,
    Run,
    WeeklyReport,
)
from hub_core.api import ApiClient
from hub_core.http import SourceRequestError

Model = TypeVar("Model", bound=BaseModel)


class Store(Protocol):
    def day(self, on: date) -> MarketDay | None: ...
    def summaries(self, before: date, oldest: date) -> list[MarketDaySummary]: ...
    def ledger(self) -> list[Hypothesis]: ...
    def hypotheses(self, values: Sequence[Hypothesis]) -> None: ...
    def bars(self, code: str, values: Sequence[IndexBar]) -> None: ...
    def write_day(self, value: MarketDayWrite) -> None: ...
    def weekly(self, value: WeeklyReport) -> None: ...
    def reference(self, value: MarketReference) -> None: ...
    def run(self, value: Run) -> None: ...


class MarketApi(ApiClient):
    def optional(self, path: str, model: type[Model]) -> Model | None:
        try:
            return self.get(path, model)
        except SourceRequestError:
            if self.http.health.get("hub-api") and self.http.health["hub-api"].error == "HTTP 404":
                return None
            raise


class Repository:
    def __init__(self, api: MarketApi) -> None:
        self.api = api

    def day(self, on: date) -> MarketDay | None:
        return self.api.optional(f"/v1/public/markets/days/{on}", MarketDay)

    def summaries(self, before: date, oldest: date) -> list[MarketDaySummary]:
        values: dict[date, MarketDaySummary] = {}
        cursor: str | None = None
        seen: set[str] = set()
        while True:
            params = {"before": str(before), "limit": "100"}
            if cursor:
                params["cursor"] = cursor
            page = self.api.get(
                "/v1/public/markets/days?" + urlencode(params), MarketDaySummaryPage
            )
            values.update((row.date, row) for row in page.items if oldest <= row.date < before)
            if not page.nextCursor or any(row.date <= oldest for row in page.items):
                break
            if page.nextCursor in seen:
                raise ValueError("交易日摘要分页游标重复")
            seen.add(page.nextCursor)
            cursor = page.nextCursor
        return sorted(values.values(), key=lambda row: row.date)

    def ledger(self) -> list[Hypothesis]:
        values: dict[str, Hypothesis] = {}
        cursor: str | None = None
        seen: set[str] = set()
        while True:
            params = {"limit": "100"}
            if cursor:
                params["cursor"] = cursor
            page = self.api.get(
                "/v1/public/markets/hypotheses?" + urlencode(params), HypothesisPage
            )
            values.update((row.id, row) for row in page.items)
            if not page.nextCursor:
                break
            if page.nextCursor in seen:
                raise ValueError("假设账本分页游标重复")
            seen.add(page.nextCursor)
            cursor = page.nextCursor
        return sorted(values.values(), key=lambda row: (row.createdOn, row.id))

    def hypotheses(self, values: Sequence[Hypothesis]) -> None:
        for start in range(0, len(values), 40):
            self.api.post_batch("/v1/internal/markets/hypotheses/batch", values[start : start + 40])

    def bars(self, code: str, values: Sequence[IndexBar]) -> None:
        from pydantic import RootModel

        self.api.put(
            "/v1/internal/markets/indices/" + quote(code, safe="") + "/bars",
            RootModel[list[IndexBar]](list(values)),
        )

    def write_day(self, value: MarketDayWrite) -> None:
        self.api.put(f"/v1/internal/markets/days/{value.day.date}", value)

    def weekly(self, value: WeeklyReport) -> None:
        self.api.put(f"/v1/internal/markets/weeklies/{value.date}", value)

    def reference(self, value: MarketReference) -> None:
        self.api.put("/v1/internal/documents/markets.reference", value)

    def run(self, value: Run) -> None:
        self.api.write_run(value)
