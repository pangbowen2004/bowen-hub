"""真实五日复算与T22既有账本融合；不读取手写日摘要。"""

import json
from datetime import UTC, date, datetime
from pathlib import Path

import polars as pl
import pytest

from hub_contracts import Hypothesis, MarketDayWrite
from hub_core.config import load_config
from hub_market.compare.load import recorded
from hub_market.compute import complete_day, compute, day_summary

ROOT = Path(__file__).resolve().parents[5]


def test_actual_five_days_full_document_and_ledger() -> None:
    days = [
        compute(recorded(ROOT, date(2026, 8, n)), load_config(ROOT / "config/market_summary.yaml"))
        for n in (24, 25, 26, 27, 28)
    ]
    calendar = (
        days[-1]
        .inputs.required("trade_cal")
        .filter((pl.col("is_open") == 1) & (pl.col("cal_date") <= "20260828"))
        .sort("cal_date")
    )
    sessions = [date.fromisoformat(value) for value in calendar["cal_date"].tail(20)]
    ledger = [
        Hypothesis.model_validate(row)
        for row in json.loads(
            (ROOT / "fixtures/samples/markets/Hypothesis.ledger.json").read_text()
        )
    ]
    raw = json.loads((ROOT / "fixtures/market/hypotheses-ledger.json").read_text())["hypotheses"]
    assert {row.id for row in ledger} == {row["id"] for row in raw}
    assert len(ledger) == 61
    written = complete_day(
        days[-1],
        generated_at=datetime(2026, 10, 2, tzinfo=UTC),
        previous_summaries=[day_summary(day) for day in days[:-1]],
        settled_hypotheses=ledger,
        recent_sessions=sessions,
    )
    assert MarketDayWrite.model_validate_json(written.model_dump_json()) == written
    assert [row.temperature for row in written.day.evolution.rows] == [41.8, 62.5, 65.4, 77.3, 51.9]
    assert written.day.evolution.summary.directionCoverageDays == 5
    assert len(written.day.validation.createdToday) == 4
    assert written.day.validation.settledToday
    counts = written.day.validation.stats.cumulative
    assert sum(row.notConfirmedCount for row in counts) == sum(
        row.result == "NOT_CONFIRMED" for row in ledger
    )
    assert sum(row.inconclusiveCount for row in counts) == sum(
        row.result == "INCONCLUSIVE" for row in ledger
    )
    with pytest.raises(ValueError, match="真实最近五日"):
        complete_day(
            days[-1],
            generated_at=datetime.now(UTC),
            previous_summaries=[day_summary(day) for day in days[1:-1]],
            settled_hypotheses=ledger,
            recent_sessions=sessions,
        )
