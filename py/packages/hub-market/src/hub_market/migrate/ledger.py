"""老假设账本转换（docs/06 第 2 节第 2 步）：只读 ledger.json，不联网，不打开老代码。

每个老键都有去处：保留的写进 Hypothesis，要删的在统计里列出次数，既不保留也不在删除清单里的
键直接失败，不静默丢数据。
"""

import json
from collections import Counter
from collections.abc import Mapping
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

from pydantic import BaseModel, Field, ValidationError

from hub_contracts import Hypothesis

from .errors import MigrationError, locations
from .shared import LegacyModel, counts

SOURCE_NOTE_PREFIX = "来源确认："
# docs/06 第 2 节：DATA_PENDING → PENDING；SOURCE_CONFIRMED → CONFIRMED（说明前加前缀）；其余不变。
RESULTS: dict[str, str] = {
    "PENDING": "PENDING",
    "DATA_PENDING": "PENDING",
    "CONFIRMED": "CONFIRMED",
    "SOURCE_CONFIRMED": "CONFIRMED",
    "NOT_CONFIRMED": "NOT_CONFIRMED",
    "INCONCLUSIVE": "INCONCLUSIVE",
}
# 删除清单（docs/06 第 2 节）：只统计次数；顶层的 schemaVersion、integrity 同样不进新系统。
DISCARDED_RECORD_KEYS = frozenset({"evidenceIds"})
KEPT_GENERATION_KEYS = frozenset({"engineVersion"})
KEPT_SETTLEMENT_KEYS = frozenset({"actual"})


class LegacyGeneration(LegacyModel):
    engineVersion: str | None = None
    sourceSnapshotSha256: str | None = None
    mode: str | None = None


class LegacySettlement(LegacyModel):
    engineVersion: str | None = None
    actual: dict[str, Any] | None = None
    sourceSnapshotSha256: str | None = None


class LegacyHypothesis(LegacyModel):
    id: str
    createdOn: date
    dueOn: date
    title: str
    scope: str
    confirmation: str
    invalidation: str
    risk: str
    counterEvidence: str
    result: str
    settledOn: date | None
    resultNote: str
    evidenceIds: list[str] = Field(default_factory=list)
    rule: dict[str, Any] | None = None
    generation: LegacyGeneration | None = None
    settlement: LegacySettlement | None = None


class LegacyLedger(LegacyModel):
    schemaVersion: str
    hypotheses: list[LegacyHypothesis]
    integrity: dict[str, Any]


@dataclass(frozen=True)
class LedgerPlan:
    hypotheses: list[Hypothesis]
    source_results: dict[str, int]
    discarded: dict[str, int]


def parse_ledger(raw: object) -> LegacyLedger:
    try:
        return LegacyLedger.model_validate(raw)
    except ValidationError as error:
        raise MigrationError("旧账本结构不符合预期：" + locations(error)) from None


def read_ledger(path: Path) -> LegacyLedger:
    try:
        raw: object = json.loads(path.read_text(encoding="utf-8"))
    except OSError, ValueError:
        raise MigrationError(f"读不到旧账本，或不是有效的JSON：{path.name}") from None
    return parse_ledger(raw)


def _kept(raw: Mapping[str, Any] | None, model: BaseModel | None) -> bool:
    """契约模型默认忽略多余键；原样回写后必须和老 JSON 完全相同，才算没丢字段。"""
    if raw is None or model is None:
        return raw is None and model is None
    return model.model_dump(mode="json", exclude_unset=True) == raw


def _check_lifecycle(model: Hypothesis) -> None:
    if model.result == "PENDING":
        if model.settledOn is not None or model.actual is not None:
            raise MigrationError(f"假设{model.id}仍待结算，却带有结算日或实际值")
    elif model.settledOn is None:
        raise MigrationError(f"假设{model.id}已结算，却没有结算日")


def convert_ledger(legacy: LegacyLedger) -> LedgerPlan:
    if not legacy.hypotheses:
        raise MigrationError("旧账本为空")
    seen: set[str] = set()
    converted: list[Hypothesis] = []
    source_results: Counter[str] = Counter()
    discarded: Counter[str] = Counter({"顶层.schemaVersion": 1, "顶层.integrity": 1})
    for row in legacy.hypotheses:
        if row.id in seen:
            raise MigrationError(f"旧账本的假设ID重复：{row.id}")
        seen.add(row.id)
        source_results[row.result] += 1
        result = RESULTS.get(row.result)
        if result is None:
            raise MigrationError(f"假设{row.id}的结果值未登记：{row.result}")
        generation, settlement = row.generation, row.settlement
        actual = settlement.actual if settlement else None
        payload: dict[str, Any] = {
            "id": row.id,
            "createdOn": row.createdOn,
            "dueOn": row.dueOn,
            "mode": "realtime",
            "title": row.title,
            "confirmation": row.confirmation,
            "invalidation": row.invalidation,
            "risk": row.risk,
            "counterEvidence": row.counterEvidence,
            "resultNote": (
                SOURCE_NOTE_PREFIX + row.resultNote
                if row.result == "SOURCE_CONFIRMED"
                else row.resultNote
            ),
            "scope": row.scope,
            "rule": row.rule,
            "result": result,
            "settledOn": row.settledOn,
            "actual": actual,
        }
        # engineVersion 是可选字段：老记录没有就不写，不补造。
        if generation is not None and generation.engineVersion:
            payload["engineVersion"] = generation.engineVersion
        try:
            model = Hypothesis.model_validate(payload)
        except ValidationError as error:
            raise MigrationError(f"假设{row.id}不符合契约：{locations(error)}") from None
        if not _kept(row.rule, model.rule):
            raise MigrationError(f"假设{row.id}的规则字段没有被契约完整保留")
        if not _kept(actual, model.actual):
            raise MigrationError(f"假设{row.id}的实际值字段没有被契约完整保留")
        _check_lifecycle(model)
        discarded.update(row.model_fields_set & DISCARDED_RECORD_KEYS)
        if generation is not None:
            discarded.update(
                f"generation.{key}" for key in generation.model_fields_set - KEPT_GENERATION_KEYS
            )
            if not generation.engineVersion:
                discarded["generation.engineVersion（空）"] += 1
        if settlement is not None:
            discarded.update(
                f"settlement.{key}" for key in settlement.model_fields_set - KEPT_SETTLEMENT_KEYS
            )
        converted.append(model)
    converted.sort(key=lambda item: (item.createdOn, item.id))
    return LedgerPlan(converted, dict(source_results), dict(discarded))


def ledger_lines(plan: LedgerPlan) -> list[str]:
    rows = plan.hypotheses
    created = [row.createdOn for row in rows]
    return [
        f"账本转换：{len(rows)}条，createdOn {min(created)} 至 {max(created)}，mode 全部为 realtime",
        "老结果分布：" + counts(plan.source_results),
        "转换后结果：" + counts(Counter(row.result for row in rows)),
        "scope：" + counts(Counter(row.scope for row in rows)),
        "规则类型：" + counts(Counter(row.rule.type if row.rule else "（无规则）" for row in rows)),
        f"engineVersion 保留 {sum(1 for row in rows if row.engineVersion)} 条；"
        f"rule 为 null {sum(1 for row in rows if row.rule is None)} 条",
        "待结算（补跑到期日时结算）："
        + counts(Counter(str(row.dueOn) for row in rows if row.result == "PENDING")),
        "丢弃的键（次数）：" + counts(plan.discarded),
    ]
