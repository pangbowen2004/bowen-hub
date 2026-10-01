"""周报统计口径、缺失方向与Markdown一致性。"""

import json
from pathlib import Path
from typing import Any

import pytest

from hub_contracts import Hypothesis, MarketDay, MarketDaySummary
from hub_market.hypotheses import generate
from hub_market.weekly import build, render_markdown, summary

ROOT = Path(__file__).resolve().parents[5]


def rows() -> list[MarketDaySummary]:
    payload = json.loads(
        (ROOT / "fixtures/samples/markets/MarketDaySummary.2026-08-28.json").read_text()
    )
    return [
        MarketDaySummary.model_validate(
            {
                **payload,
                "date": f"2026-08-{24 + i}",
                "turnoverCny": (i + 1) * 1e12,
                "advanceShare": 0.3 + i * 0.1,
                "aboveMa20Share": 0.4 + i * 0.05,
                "complete": True,
                "directionsRelative": [{"name": "文化传媒", "relativeVsAllA": value}],
            }
        )
        for i, value in enumerate([0.01, -0.01, 0.02, -0.02, 0.03])
    ]


def hypothesis(result: str, **changes: Any) -> Hypothesis:
    day = MarketDay.model_validate_json(
        (ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text()
    )
    row = generate(day.model_copy(update={"date": day.date.replace(day=24)}), day.date)[0]
    return Hypothesis.model_validate(
        {
            **row.model_dump(),
            "id": result,
            "result": result,
            "settledOn": day.date if result != "PENDING" else None,
            "resultNote": "实际证据",
            **changes,
        }
    )


def test_only_not_confirmed_is_research_error_and_pending_excluded() -> None:
    report = build(
        rows(),
        [
            hypothesis(result)
            for result in ["CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE", "PENDING"]
        ],
    )
    assert report.settledCount == 3
    assert report.researchErrorCount == 1
    assert report.inconclusiveCount == 1
    assert [row.id for row in report.researchErrors.items] == ["NOT_CONFIRMED"]
    assert report.previousJudgmentVerification.unsettledDueCount == 1
    assert len(report.researchErrors.unsettledDue) == 1
    assert report.markdown == render_markdown(report)
    assert summary(report).researchErrorCount == 1
    assert report.threeStructuralChanges[2].change == 4
    assert report.lifecycle.oscillatingDirections[0].signChanges == 4
    assert report.lifecycle.persistentDirections[0].top3Appearances == 5
    assert all(f"## {i}." in report.markdown for i in range(1, 7))
    assert "研究辅助，不构成投资建议" in report.markdown


def test_missing_days_break_sign_comparisons_and_latest_not_backfilled() -> None:
    data = rows()
    data[2] = MarketDaySummary.model_validate({**data[2].model_dump(), "directionsRelative": None})
    data[4] = MarketDaySummary.model_validate({**data[4].model_dump(), "directionsRelative": None})
    report = build(data, [], missing=["来源受限"])
    assert report.lifecycle.directionCoverageDays == 3
    assert report.lifecycle.persistentDirections[0].top3Appearances == 3
    assert report.lifecycle.oscillatingDirections == []
    assert report.lifecycle.latestWeakDirections is None
    assert report.nextWeekQuestions[0] is None
    assert "来源受限" in report.dataAndMethodHealth.missing
    assert "最新方向数据未就绪" in report.markdown


def test_settlement_outside_window_is_excluded() -> None:
    report = build(rows(), [hypothesis("NOT_CONFIRMED", settledOn="2026-08-21")])
    assert report.settledCount == 0
    assert report.researchErrors.items == []


def test_zero_first_turnover_does_not_fabricate_zero_change() -> None:
    data = rows()
    data[0] = MarketDaySummary.model_validate({**data[0].model_dump(), "turnoverCny": 0})
    with pytest.raises(ValueError, match="成交额为零"):
        build(data, [])


def test_incomplete_optional_sources_not_described_as_core_failure() -> None:
    data = rows()
    data[0] = MarketDaySummary.model_validate({**data[0].model_dump(), "complete": False})
    report = build(data, [], missing=["资金流未就绪"])
    assert "2026-08-24数据不完整" in report.dataAndMethodHealth.missing
    assert "核心" not in report.markdown
