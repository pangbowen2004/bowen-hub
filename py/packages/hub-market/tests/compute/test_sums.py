"""金额求和不随输入顺序、并行分组顺序或可选数据缺失而改变。"""

from datetime import date, timedelta
from decimal import Decimal, localcontext
from pathlib import Path

import polars as pl
import pytest

from hub_market.compare.load import recorded
from hub_market.compute.aggregate import overview, required
from hub_market.compute.directions import directions

ROOT = Path(__file__).resolve().parents[5]


@pytest.mark.parametrize(
    ("amounts", "expected"),
    [([1e16, 1.0, 1.0], 10000000000000002.0), ([1e16, 1.0, -1e16], 1.0)],
)
def test_money_sum_preserves_small_values_across_orders(
    amounts: list[float], expected: float
) -> None:
    frame = pl.DataFrame({"amountCny": amounts})
    for candidate in [frame, frame.reverse(), frame.sample(fraction=1, shuffle=True, seed=4)]:
        assert required(candidate, "amountCny", "sum") == expected


def test_sum_keeps_existing_null_and_empty_semantics() -> None:
    assert required(pl.DataFrame({"x": [1.0, None, 2.0]}), "x", "sum") == 3.0
    assert required(pl.DataFrame({"x": [None]}, schema={"x": pl.Float64}), "x", "sum") == 0
    assert required(pl.DataFrame(schema={"x": pl.Float64}), "x", "sum") == 0


def test_recorded_daily_money_totals_are_exactly_repeatable() -> None:
    inputs = recorded(ROOT, date(2026, 8, 28))
    history = inputs.required("daily").with_columns((pl.col("amount") * 1000).alias("amountCny"))
    # 此例只隔离金额聚合；真实全面板及缺可选源由 test_recorded 继续验收。
    current = history.filter(pl.col("trade_date") == "20260828").with_columns(
        (pl.col("pct_chg") / 100).alias("return1d"),
        pl.lit(False).alias("newHigh20"),
        pl.lit(False).alias("newLow20"),
        pl.lit(False).alias("aboveMa20"),
        pl.lit(1.0).alias("ma20"),
        pl.lit(1.0).alias("marketCapCny"),
        pl.lit(None, dtype=pl.Float64).alias("turnoverRate"),
        pl.lit(None, dtype=pl.Float64).alias("pe_ttm"),
        pl.lit(None, dtype=pl.Float64).alias("pb"),
    )
    expected = overview(current, history, inputs.previous)
    previous_amounts = history.filter(
        (pl.col("trade_date") == "20260827") & pl.col("pct_chg").is_not_null()
    )["amountCny"]
    with localcontext() as context:
        context.prec = 60
        exact_sum = sum((Decimal.from_float(amount) for amount in previous_amounts), Decimal(0))
    assert expected.turnoverPrevCny == float(exact_sum) == 2140962320554.67
    for _ in range(3):
        assert (
            overview(current, history, inputs.previous).turnoverPrevCny == expected.turnoverPrevCny
        )
    for seed in range(6):
        candidate = overview(
            current.sample(fraction=1, shuffle=True, seed=seed),
            history.sample(fraction=1, shuffle=True, seed=seed),
            inputs.previous,
        )
        assert candidate.turnoverCny == expected.turnoverCny
        assert candidate.turnoverPrevCny == expected.turnoverPrevCny
        assert candidate.turnoverChange == expected.turnoverChange
        assert candidate.turnoverMedian20Cny == expected.turnoverMedian20Cny
        assert candidate.totalMarketCapCny == expected.totalMarketCapCny


def test_direction_equal_daily_amounts_keep_full_percentile_across_orders() -> None:
    on = date(2026, 8, 28)
    inputs = recorded(ROOT, on)
    amounts = (
        inputs.required("daily").filter(
            (pl.col("trade_date") == "20260827") & pl.col("pct_chg").is_not_null()
        )["amount"]
        * 1000
    )
    size = len(amounts)
    codes = [f"TEST{i}" for i in range(size)]
    current = pl.DataFrame(
        {
            "ts_code": codes,
            "name": codes,
            "amountCny": amounts,
            "return1d": [0.01] * size,
            "return5d": [0.02] * size,
            "return20d": [0.03] * size,
            "aboveMa20": [True] * size,
            "limitUp": [False] * size,
            "limitDown": [False] * size,
        }
    )
    history = pl.concat(
        [
            current.select("ts_code", "amountCny").with_columns(
                pl.lit((on - timedelta(days=i)).strftime("%Y%m%d")).alias("trade_date"),
                pl.lit(1.0).alias("pct_chg"),
            )
            for i in range(20)
        ]
    )
    tables = {
        "ths_member/test": pl.DataFrame({"con_code": codes}),
        "ths_daily/test": pl.DataFrame(
            {
                "trade_date": [on.strftime("%Y%m%d")],
                "close": [100.0],
                "pct_change": [1.0],
            }
        ),
    }
    for seed in range(6):
        result = directions(
            current.sample(fraction=1, shuffle=True, seed=seed),
            history.sample(fraction=1, shuffle=True, seed=seed),
            tables,
            [{"code": "test", "name": "测试方向"}],
            on,
            on,
            None,
        )
        assert result is not None
        assert result.items[0].amount20dPercentile == 1.0
