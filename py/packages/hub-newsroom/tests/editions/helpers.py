"""发行测试替身；所有IO记录在内存，不访问外网或SMTP。"""

import json
from collections.abc import Sequence
from datetime import datetime
from pathlib import Path
from typing import Any

from pydantic import BaseModel

from hub_contracts import (
    Article,
    CalendarEvent,
    Edition,
    Filing,
    InsiderTrade,
    NewsCloseSnapshot,
    NewsSourceHealth,
    Run,
    WatchItem,
)
from hub_newsroom.pipeline import PipelineInput
from hub_newsroom.pipeline.windows import EditionKind, WindowPlan

ROOT = Path(__file__).resolve().parents[5]


def fixture(kind: EditionKind) -> tuple[datetime, PipelineInput, list[Edition]]:
    raw: dict[str, Any] = json.loads(
        (ROOT / f"py/packages/hub-newsroom/tests/pipeline/data/{kind}-input.json").read_text()
    )
    return (
        datetime.fromisoformat(raw["now"]),
        PipelineInput(
            articles=[Article.model_validate(row) for row in raw.get("articles", [])],
            filings=[Filing.model_validate(row) for row in raw.get("filings", [])],
            insiders=[InsiderTrade.model_validate(row) for row in raw.get("insiders", [])],
            events=[CalendarEvent.model_validate(row) for row in raw.get("events", [])],
            exhibit_texts=raw.get("exhibit_texts", {}),
            filing_texts=raw.get("filing_texts", {}),
            snapshot=NewsCloseSnapshot.model_validate(raw["snapshot"])
            if raw.get("snapshot")
            else None,
            snapshot_session=datetime.fromisoformat(raw["snapshot_session"]).date()
            if raw.get("snapshot_session")
            else None,
        ),
        [
            Edition.model_validate(
                json.loads(
                    (ROOT / "py/packages/hub-newsroom/tests/pipeline/data/morning.json").read_text()
                )
            )
        ]
        if kind != "morning"
        else [],
    )


class FakeStore:
    def __init__(self, watchlist: Sequence[WatchItem], history: Sequence[Edition] = ()) -> None:
        self.items = {row.id: row.model_copy(deep=True) for row in history}
        self.watches = list(watchlist)
        self.events: list[str] = []
        self.runs: list[Run] = []
        self.batches: dict[str, list[BaseModel]] = {}
        self.htmls: dict[str, str] = {}
        self.fail_at: str | None = None
        self.weekly = PipelineInput()

    def history(self, day: object) -> list[Edition]:
        self.events.append("history")
        return list(self.items.values())

    def watchlist(self) -> list[WatchItem]:
        return self.watches

    def weekly_facts(self, day: object, watchlist: Sequence[WatchItem]) -> PipelineInput:
        self.events.append("weekly-facts")
        return self.weekly

    def batch(self, path: str, rows: Sequence[BaseModel]) -> None:
        self.events.append(path)
        self.batches[path] = list(rows)
        if self.fail_at == path:
            raise ValueError("测试敏感正文不可透出")

    def edition(self, edition: Edition) -> None:
        self.events.append("sentAt" if edition.email and edition.email.sentAt else "edition")
        if self.fail_at == "sentAt" and edition.email and edition.email.sentAt:
            raise ValueError("测试敏感正文不可透出")
        self.items[edition.id] = edition.model_copy(deep=True)

    def html(self, ident: str, html: str) -> None:
        self.events.append("html")
        if self.fail_at == "html":
            raise ValueError("测试敏感正文不可透出")
        self.htmls[ident] = html

    def health(self, value: NewsSourceHealth) -> None:
        self.events.append("source-health")

    def run(self, value: Run) -> None:
        self.events.append("run:" + value.status)
        self.runs.append(value.model_copy(deep=True))


class FakeCollector:
    def __init__(self, data: PipelineInput) -> None:
        self.data = data
        self.calls: list[WindowPlan] = []

    def collect(self, plan: WindowPlan, watchlist: Sequence[WatchItem]) -> PipelineInput:
        self.calls.append(plan)
        return self.data


class FakeTransport:
    def __init__(self, store: FakeStore) -> None:
        self.store = store
        self.fail = False
        self.notifications: list[str] = []
        self.messages: list[tuple[str, str, str]] = []

    def send(self, subject: str, text: str, html: str) -> None:
        self.store.events.append("smtp")
        if self.fail:
            raise OSError("测试敏感SMTP凭据不可透出")
        self.messages.append((subject, text, html))

    def notify_failure(
        self, job: str, business_date: object, summary: str, actions_url: str
    ) -> bool:
        self.notifications.append(summary)
        return True
