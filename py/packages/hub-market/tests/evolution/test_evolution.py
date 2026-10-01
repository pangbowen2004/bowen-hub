"""五日窗口及相邻日比较，缺失方向不能回填。"""

import json
from pathlib import Path
from typing import Any

import pytest

from hub_contracts import MarketDay, MarketDaySummary
from hub_market.evolution import build

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
                "temperature": 40 + i * 3,
            }
        )
        for i in range(5)
    ]


def snapshot() -> MarketDay:
    return MarketDay.model_validate_json(
        (ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text()
    )


def replace(row: MarketDaySummary, **changes: Any) -> MarketDaySummary:
    return MarketDaySummary.model_validate({**row.model_dump(), **changes})


def test_evolution_uses_sorted_five_sessions_and_previous_day() -> None:
    day = snapshot()
    result = build(list(reversed(rows())), directions=day.directions, ecology=day.limitEcology)
    assert [row.date.day for row in result.rows] == [24, 25, 26, 27, 28]
    assert result.summary.turnoverMedianCny == 3e12
    assert result.summary.temperatureRange == [40, 52]
    assert result.edgeChanges.turnover is not None
    assert result.edgeChanges.turnover.change == 0.25
    assert result.edgeChanges.advanceShare is not None
    assert result.edgeChanges.advanceShare.change == pytest.approx(0.1)
    assert result.summary.directionCoverageDays == 5
    assert result.summary.directions[0].top3Appearances == 5
    assert result.transmission.direction is not None


def test_missing_directions_and_zero_previous_turnover_are_explicit() -> None:
    data = rows()
    data[1] = replace(data[1], directionsRelative=None, topDirections=[])
    data[3] = replace(data[3], turnoverCny=0)
    data[4] = replace(data[4], directionsRelative=None, topDirections=[])
    result = build(data, directions=None, ecology=snapshot().limitEcology)
    assert result.summary.directionCoverageDays == 3
    assert result.transmission.direction is None
    assert result.signals.direction is None
    assert result.edgeChanges.turnover is None
    assert "无法计算" in result.transmission.liquidityBreadth.text
    assert result.summary.directions[0].top3Appearances == 3


@pytest.mark.parametrize("data", [rows()[:4], rows() + rows()[:1], rows()[:4] + rows()[:1]])
def test_invalid_windows_are_rejected(data: list[MarketDaySummary]) -> None:
    with pytest.raises(ValueError, match="五个不同交易日"):
        build(data, directions=None, ecology=snapshot().limitEcology)
