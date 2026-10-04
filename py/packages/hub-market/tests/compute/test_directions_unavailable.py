"""同花顺板块当日没有官方日线时：只有这个方向不进当日方向列表，其余方向照常计算和排名。

真实情况（2026-10-04 的 TuShare 实测）：玻璃基板（886111.TI）官方日线从 2026-06-30 起、
MLCC（886112.TI）从 2026-07-30 起，更早日期接口返回零行（DataFrame 没有任何列）；
两个板块上市首日 pct_change 为空，紧接着的下一个交易日也没有行（玻璃基板缺 07-01、MLCC 缺 07-31）。
补跑 7 月和 8 月初的历史交易日会碰到。接口整体失败（缺 ths_daily/ths_member）仍然是整块为空，
由 tests/compute/test_recorded.py 覆盖。
"""

from dataclasses import replace
from datetime import date
from pathlib import Path

import polars as pl

from hub_core.config import load_config
from hub_market.compare.load import recorded
from hub_market.compute.day import Computed, compute, day_summary
from hub_market.compute.input import ComputeInput

ROOT = Path(__file__).resolve().parents[5]
TARGET = date(2026, 8, 28)
STAMP = TARGET.strftime("%Y%m%d")


def run(update: dict[str, pl.DataFrame]) -> tuple[Computed, ComputeInput]:
    inputs = recorded(ROOT, TARGET)
    changed = replace(inputs, tables={**inputs.tables, **update})
    return compute(changed, load_config(ROOT / "config/market_summary.yaml")), changed


def board(inputs: ComputeInput) -> tuple[str, str]:
    """取配置里排第一的方向（名称，代码）。"""
    return inputs.directions[0]["name"], inputs.directions[0]["code"]


def test_recorded_day_still_has_all_sixteen_directions() -> None:
    result, _ = run({})
    assert result.directions is not None
    assert len(result.directions.items) == 16
    assert "directions" not in result.data_status.missing


def check_only_that_board_is_left_out(update: dict[str, pl.DataFrame], name: str) -> None:
    full, _ = run({})
    result, _ = run(update)
    assert full.directions is not None
    assert result.directions is not None
    assert len(result.directions.items) == 15
    assert name not in {row.name for row in result.directions.items}
    # 其余 15 个方向与完整数据时逐项一致，排名顺序不变。
    assert result.directions.items == [row for row in full.directions.items if row.name != name]
    assert result.directions.membershipAsOf == full.directions.membershipAsOf
    # 摘要里的方向只来自还在列表里的方向；其余各块照常计算。
    summary = day_summary(result)
    assert summary.directionsRelative is not None
    assert name not in {row.name for row in summary.directionsRelative}
    assert len(summary.directionsRelative) == 15
    assert result.temperature.value == 51.9
    assert result.market.sampleCount == full.market.sampleCount


def test_board_with_zero_rows_is_left_out() -> None:
    inputs = recorded(ROOT, TARGET)
    name, code = board(inputs)
    # 零行结果没有任何列，不能因此让整天的计算崩溃。
    check_only_that_board_is_left_out({f"ths_daily/{code}": pl.DataFrame()}, name)


def test_board_without_a_row_for_the_day_is_left_out() -> None:
    inputs = recorded(ROOT, TARGET)
    name, code = board(inputs)
    frame = inputs.tables[f"ths_daily/{code}"]
    check_only_that_board_is_left_out(
        {f"ths_daily/{code}": frame.filter(pl.col("trade_date") != STAMP)}, name
    )


def test_board_whose_first_day_has_no_pct_change_is_left_out() -> None:
    inputs = recorded(ROOT, TARGET)
    name, code = board(inputs)
    frame = inputs.tables[f"ths_daily/{code}"]
    blank = frame.with_columns(
        pl.when(pl.col("trade_date") == STAMP)
        .then(None)
        .otherwise(pl.col("pct_change"))
        .alias("pct_change")
    )
    check_only_that_board_is_left_out({f"ths_daily/{code}": blank}, name)


def test_new_board_with_short_history_stays_with_empty_long_returns() -> None:
    inputs = recorded(ROOT, TARGET)
    name, code = board(inputs)
    frame = inputs.tables[f"ths_daily/{code}"].sort("trade_date").tail(3)
    result, _ = run({f"ths_daily/{code}": frame})
    assert result.directions is not None
    row = next(row for row in result.directions.items if row.name == name)
    # 历史不足时 5、20 日收益为空（契约允许），当日收益仍来自官方涨跌幅。
    assert row.return5d is None
    assert row.return20d is None
    assert row.return1d == float(frame["pct_change"][-1]) / 100
    assert len(result.directions.items) == 16


def test_no_direction_block_when_no_board_has_data_for_the_day() -> None:
    inputs = recorded(ROOT, TARGET)
    update = {f"ths_daily/{row['code']}": pl.DataFrame() for row in inputs.directions}
    result, _ = run(update)
    assert result.directions is None
    assert "directions" in result.data_status.missing
    assert day_summary(result).directionsRelative is None
