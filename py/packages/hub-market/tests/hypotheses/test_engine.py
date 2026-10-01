"""既有账本阈值、边界条件与结算质量回归。"""

import json
from datetime import date
from pathlib import Path
from typing import Any

import pytest

from hub_contracts import Hypothesis, MarketDay
from hub_market.hypotheses import generate, merge_pending, settle
from hub_market.hypotheses.stats import validation

ROOT = Path(__file__).resolve().parents[5]
DUE = date(2026, 8, 31)


def day(**changes: Any) -> MarketDay:
    payload = json.loads((ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text())
    payload.update(changes)
    return MarketDay.model_validate(payload)


def changed(current: MarketDay, block: str, **changes: Any) -> MarketDay:
    payload = current.model_dump(mode="json")
    payload[block].update(changes)
    return MarketDay.model_validate(payload)


def hypothesis(slug: str = "MARKET-PERSISTENCE") -> Hypothesis:
    return next(row for row in generate(day(), DUE) if row.id.endswith(slug))


def test_generated_rules_match_original_20260828_ledger() -> None:
    ledger = json.loads((ROOT / "fixtures/market/hypotheses-ledger.json").read_text())["hypotheses"]
    expected = {row["id"]: row["rule"] for row in ledger if row["id"].startswith("HYP-20260828-")}
    actual = {
        row.id: row.rule.model_dump(mode="json", exclude_none=True)
        for row in generate(day(), DUE)
        if row.rule
    }
    assert actual == expected
    assert all(
        row.result == "PENDING" and row.dueOn == DUE and row.actual is None
        for row in generate(day(), DUE)
    )
    assert len(generate(day(directions=None), DUE)) == 2
    with pytest.raises(ValueError, match="到期日"):
        generate(day(), date(2026, 8, 28))


@pytest.mark.parametrize(
    ("a", "ma", "turnover", "result"),
    [
        (0.5, 0.6, 1905959102616.9001, "CONFIRMED"),
        (0.39, 0.7, 3e12, "NOT_CONFIRMED"),
        (0.45, 0.55, 2e12, "INCONCLUSIVE"),
        (0.45, 0.50, 1.7e12, "NOT_CONFIRMED"),
    ],
)
def test_saved_market_thresholds_and_three_results(
    a: float, ma: float, turnover: float, result: str
) -> None:
    actual = changed(
        day(date=str(DUE)), "market", advanceShare=a, aboveMa20Share=ma, turnoverCny=turnover
    )
    settled = settle(hypothesis(), actual, DUE)
    assert settled.result == result
    assert settled.settledOn == DUE
    assert "亿元" in settled.resultNote
    assert "%" in settled.resultNote
    assert settle(settled, None, date(2026, 9, 4), sessions_after_due=4) == settled


def test_missing_block_waits_then_expires_and_wrong_day_not_substituted() -> None:
    row = hypothesis()
    assert settle(row, None, DUE, sessions_after_due=3) == row
    assert settle(row, None, date(2026, 9, 4), sessions_after_due=4).result == "INCONCLUSIVE"
    assert settle(row, day(date="2026-09-01"), date(2026, 9, 1)) == row
    assert settle(row, None, date(2026, 8, 28)) == row
    hand = Hypothesis.model_validate({**row.model_dump(), "rule": None})
    assert settle(hand, None, DUE).resultNote == "手写假设无可复算规则"
    eco = hypothesis("LIMIT-ECOLOGY")
    assert settle(eco, changed(day(date=str(DUE)), "limitEcology", sealRate=None), DUE) == eco
    assert (
        settle(hypothesis("TOP-DIRECTION"), day(date=str(DUE), directions=None), DUE).result
        == "PENDING"
    )


@pytest.mark.parametrize(
    ("seal", "multi", "down", "expected"),
    [
        (0.75, 13, 5, "CONFIRMED"),
        (0.64, 20, 0, "NOT_CONFIRMED"),
        (0.70, 20, 0, "INCONCLUSIVE"),
        (0.7, 8, 7, "NOT_CONFIRMED"),
    ],
)
def test_ecology_saved_limits(seal: float, multi: int, down: int, expected: str) -> None:
    actual = changed(
        day(date=str(DUE)),
        "limitEcology",
        sealRate=seal,
        multiBoardCount=multi,
        limitDownCount=down,
    )
    assert settle(hypothesis("LIMIT-ECOLOGY"), actual, DUE).result == expected


def member_day() -> MarketDay:
    payload = day(date=str(DUE)).model_dump(mode="json")
    for item in payload["directions"]["items"]:
        item.update(memberCodes=["A", "B"], memberCount=2, coveredCount=2)
    return MarketDay.model_validate(payload)


def test_direction_member_sets_not_dates_counts_or_covered_samples() -> None:
    original = hypothesis("TOP-DIRECTION")
    current = member_day()
    assert settle(original, current, DUE).resultNote.startswith("无法核实")
    assert original.rule is not None
    assert original.rule.type == "DIRECTION_PERSISTENCE"
    name = original.rule.entity
    result = settle(original, current, DUE, baseline_members={name: ["B", "A"]})
    assert result.result == "CONFIRMED"  # 此样例全部数值满足确认，完整成员集合顺序不影响结算。
    changed_members = settle(original, current, DUE, baseline_members={name: ["A", "C"]})
    assert changed_members.resultNote == "方向成员发生变化"
    missing_payload = current.model_dump(mode="json")
    missing_payload["directions"]["items"] = [
        x for x in missing_payload["directions"]["items"] if x["name"] != name
    ]
    assert (
        settle(original, MarketDay.model_validate(missing_payload), DUE).resultNote
        == "到期快照缺少该方向"
    )


def test_top_direction_text_extra_condition_not_part_of_invalidation() -> None:
    row = hypothesis("TOP-DIRECTION")
    assert row.rule is not None
    assert row.rule.type == "DIRECTION_PERSISTENCE"
    payload = member_day().model_dump(mode="json")
    for item in payload["directions"]["items"]:
        if item["name"] == row.rule.entity:
            item.update(
                relativeVsAllA=0.001, advanceShare=0.7, amountShare=0.1, medianReturn1d=-0.01
            )
    result = settle(
        row, MarketDay.model_validate(payload), DUE, baseline_members={row.rule.entity: ["A", "B"]}
    )
    assert result.result == "INCONCLUSIVE"  # 文字“中位数转负”不能额外算失效。
    for item in payload["directions"]["items"]:
        if item["name"] == row.rule.entity:
            item["medianReturn1d"] = 0
    assert (
        settle(
            row,
            MarketDay.model_validate(payload),
            DUE,
            baseline_members={row.rule.entity: ["A", "B"]},
        ).result
        == "CONFIRMED"
    )


def test_spread_generation_boundary_and_stable_two_entities() -> None:
    payload = day().model_dump(mode="json")
    ordered = sorted(payload["directions"]["items"], key=lambda x: (-x["return1d"], x["name"]))
    ordered[-1]["relativeVsAllA"] = ordered[0]["relativeVsAllA"] - 0.031
    rows = generate(MarketDay.model_validate(payload), DUE)
    spread = next(row for row in rows if row.rule and row.rule.type == "DIRECTION_SPREAD")
    assert spread.rule is not None
    assert spread.rule.type == "DIRECTION_SPREAD"
    assert spread.rule.entities == [ordered[0]["name"], ordered[-1]["name"]]
    assert spread.rule.thresholds.spreadMax == pytest.approx(0.031 * 0.75)


def test_rerun_preserves_settled_and_stats_exclude_pending_denominator() -> None:
    row = hypothesis()
    failed = settle(row, changed(day(date=str(DUE)), "market", advanceShare=0.1), DUE)
    inconclusive = Hypothesis.model_validate(
        {**failed.model_dump(), "id": "manual", "rule": None, "result": "INCONCLUSIVE"}
    )
    pending = Hypothesis.model_validate({**row.model_dump(), "id": "pending"})
    assert merge_pending([failed], [row]) == [failed]
    stats = validation([failed, inconclusive, pending], DUE, [DUE])
    market = next(x for x in stats.stats.cumulative if x.ruleType == "MARKET_PERSISTENCE")
    assert market.settledCount == 1
    assert market.notConfirmedShare == 1
    assert market.inconclusiveCount == 0
    assert next(x for x in stats.stats.cumulative if x.ruleType is None).inconclusiveCount == 1
    assert stats.settledToday == [failed.id, "manual"]
    assert (
        stats.stats.last20TradingDays
        == validation([failed, inconclusive], DUE, [DUE]).stats.cumulative
    )
