"""薄 API 读写：写入全是按自然键覆盖（可重复运行），核对只读；不直连数据库。"""

from collections import Counter
from dataclasses import dataclass, field
from datetime import date

from pydantic import BaseModel

from hub_contracts import MarketEvent
from hub_market.eod.repository import MarketApi, Repository

from .events import EventPlan
from .ledger import LedgerPlan
from .shared import counts

BATCH = 40
# docs/06 第 4 节：createdOn 不晚于 2026-08-28 且 mode = realtime 的假设，就是老账本导入的那一批。
LEDGER_CUTOFF = date(2026, 8, 28)
SETTLED = frozenset({"CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE"})
# 老账本里仍是 PENDING 的假设，补跑到期日结算时只会改这四个字段。
SETTLEMENT_FIELDS = frozenset({"result", "settledOn", "actual", "resultNote"})


@dataclass
class Check:
    """差异为空才算通过；lines 是要写进进度记录的统计。"""

    differences: list[str] = field(default_factory=list[str])
    lines: list[str] = field(default_factory=list[str])


def write_ledger(store: Repository, plan: LedgerPlan) -> int:
    """同一 ID 已结算的记录由 API 保留原结果；只有仍是 PENDING 的才会被覆盖。"""
    store.hypotheses(plan.hypotheses)
    return len(plan.hypotheses)


def write_events(api: MarketApi, plan: EventPlan) -> int:
    for start in range(0, len(plan.events), BATCH):
        api.post_batch("/v1/internal/markets/events/batch", plan.events[start : start + BATCH])
    return len(plan.events)


def read_events(api: MarketApi) -> list[MarketEvent]:
    # 公开接口按日期窗口取事件；窗口放到足够宽，才能一次读全。
    return api.get_list("/v1/public/markets/events?from=2000-01-01&to=2100-12-31", MarketEvent)


def _differing(want: BaseModel, got: BaseModel) -> list[str]:
    return [name for name in type(want).model_fields if getattr(want, name) != getattr(got, name)]


def verify_ledger(store: Repository, plan: LedgerPlan) -> Check:
    check = Check()
    expected = {row.id: row for row in plan.hypotheses}
    actual = {row.id: row for row in store.ledger()}
    imported = {
        key: row
        for key, row in actual.items()
        if row.createdOn <= LEDGER_CUTOFF and row.mode == "realtime"
    }
    if len(imported) != len(expected):
        check.differences.append(
            f"createdOn≤{LEDGER_CUTOFF}且mode=realtime的假设有{len(imported)}条，应为{len(expected)}条"
        )
    check.differences.extend(f"缺假设：{key}" for key in sorted(expected.keys() - actual.keys()))
    check.differences.extend(
        f"多余假设（createdOn≤{LEDGER_CUTOFF}）：{key}"
        for key in sorted(imported.keys() - expected.keys())
    )
    settled_later: list[str] = []
    for key in sorted(expected.keys() & actual.keys()):
        want, got = expected[key], actual[key]
        if got == want:
            continue
        changed = _differing(want, got)
        # 老账本里待结算的假设，补跑后允许从 PENDING 变成结算结果，其余字段仍须与老账本一致。
        if (
            want.result == "PENDING"
            and got.result in SETTLED
            and set(changed) <= SETTLEMENT_FIELDS
            and got.settledOn is not None
            and got.settledOn >= want.dueOn
        ):
            settled_later.append(key)
        else:
            check.differences.append(f"假设内容不一致：{key}（{'、'.join(changed)}）")
    waiting = sum(1 for row in expected.values() if row.result == "PENDING")
    check.lines = [
        f"账本核对：老账本{len(expected)}条；API 中 createdOn≤{LEDGER_CUTOFF} 且 mode=realtime "
        f"共{len(imported)}条",
        f"老账本待结算{waiting}条：补跑已结算{len(settled_later)}条，仍待结算"
        f"{waiting - len(settled_later)}条",
        "API 里这批假设的结果：" + counts(Counter(row.result for row in imported.values())),
    ]
    return check


def verify_events(api: MarketApi, plan: EventPlan) -> Check:
    check = Check()
    expected = {row.id: row for row in plan.events}
    actual = {row.id: row for row in read_events(api)}
    check.differences.extend(f"缺事件：{key}" for key in sorted(expected.keys() - actual.keys()))
    check.differences.extend(f"多余事件：{key}" for key in sorted(actual.keys() - expected.keys()))
    check.differences.extend(
        f"事件内容不一致：{key}（{'、'.join(_differing(expected[key], actual[key]))}）"
        for key in sorted(expected.keys() & actual.keys())
        if expected[key] != actual[key]
    )
    check.lines = [
        f"事件核对：老日历{len(expected)}条；API 共{len(actual)}条（{counts(Counter(row.status for row in actual.values()))}）"
    ]
    return check
