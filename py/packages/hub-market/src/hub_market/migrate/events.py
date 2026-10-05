"""老事件日历转换（docs/06 第 2 节第 3 步）：只读 calendar.json，不联网，不打开老代码。"""

import json
from collections import Counter
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from pydantic import ValidationError

from hub_contracts import MarketEvent

from .errors import MigrationError, locations
from .shared import LegacyModel, counts

# docs/06：OFFICIAL_CONFIRMED → confirmed，PENDING_OFFICIAL_CONFIRMATION → pending。
STATUSES: dict[str, str] = {
    "OFFICIAL_CONFIRMED": "confirmed",
    "PENDING_OFFICIAL_CONFIRMATION": "pending",
}


class LegacyEvent(LegacyModel):
    id: str
    startDate: date
    endDate: date
    title: str
    status: str
    sourceLabel: str
    sourceUrl: str | None
    watchItems: list[str]
    aShareMappings: list[str]
    confirmation: str
    invalidation: str
    # 要删除的发现过程记录；只统计次数。
    discovery: dict[str, Any] | None = None


class LegacyCalendar(LegacyModel):
    schemaVersion: str
    updatedAt: str
    boundary: str
    events: list[LegacyEvent]
    discovery: dict[str, Any]


@dataclass(frozen=True)
class EventPlan:
    events: list[MarketEvent]
    source_statuses: dict[str, int]
    discarded: dict[str, int]


def parse_calendar(raw: object) -> LegacyCalendar:
    try:
        return LegacyCalendar.model_validate(raw)
    except ValidationError as error:
        raise MigrationError("旧事件日历结构不符合预期：" + locations(error)) from None


def read_calendar(path: Path) -> LegacyCalendar:
    try:
        raw: object = json.loads(path.read_text(encoding="utf-8"))
    except OSError, ValueError:
        raise MigrationError(f"读不到旧事件日历，或不是有效的JSON：{path.name}") from None
    return parse_calendar(raw)


def convert_events(legacy: LegacyCalendar) -> EventPlan:
    if not legacy.events:
        raise MigrationError("旧事件日历为空")
    seen: set[str] = set()
    converted: list[MarketEvent] = []
    source_statuses: Counter[str] = Counter()
    # 顶层的版本、更新日期、边界说明和发现汇总不属于任何一条事件，不进新系统。
    discarded: Counter[str] = Counter(
        {f"顶层.{key}": 1 for key in ("schemaVersion", "updatedAt", "boundary", "discovery")}
    )
    for row in legacy.events:
        if row.id in seen:
            raise MigrationError(f"旧事件日历的事件ID重复：{row.id}")
        seen.add(row.id)
        source_statuses[row.status] += 1
        status = STATUSES.get(row.status)
        if status is None:
            raise MigrationError(f"事件{row.id}的状态值未登记：{row.status}")
        if row.startDate > row.endDate:
            raise MigrationError(f"事件{row.id}的开始日期晚于结束日期")
        try:
            converted.append(
                MarketEvent.model_validate(
                    {
                        "id": row.id,
                        "title": row.title,
                        "sourceLabel": row.sourceLabel,
                        # 老数据缺链接时保留 null，不虚构。
                        "sourceUrl": row.sourceUrl or None,
                        "confirmation": row.confirmation,
                        "invalidation": row.invalidation,
                        "startDate": row.startDate,
                        "endDate": row.endDate,
                        "status": status,
                        "watchItems": row.watchItems,
                        "aShareMappings": row.aShareMappings,
                    }
                )
            )
        except ValidationError as error:
            raise MigrationError(f"事件{row.id}不符合契约：{locations(error)}") from None
        if row.discovery is not None:
            discarded["事件.discovery"] += 1
    converted.sort(key=lambda item: (item.startDate, item.id))
    return EventPlan(converted, dict(source_statuses), dict(discarded))


def event_lines(plan: EventPlan) -> list[str]:
    rows = plan.events
    return [
        f"事件转换：{len(rows)}条，startDate {min(row.startDate for row in rows)} 至 "
        f"endDate {max(row.endDate for row in rows)}",
        "老状态：" + counts(plan.source_statuses),
        "转换后状态：" + counts(Counter(row.status for row in rows)),
        f"sourceUrl 为空 {sum(1 for row in rows if row.sourceUrl is None)} 条（保留 null）",
        "丢弃的键（次数）：" + counts(plan.discarded),
    ]
