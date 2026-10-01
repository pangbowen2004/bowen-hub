"""停牌、短窗口、点时行业、真实成员集合与缺失的独立边界。"""

from datetime import date

import polars as pl
import pytest

from hub_market.compute.aggregate import lifecycle, segments
from hub_market.compute.ecology import ecology
from hub_market.compute.indices import bars
from hub_market.compute.panel import panel


def inputs() -> tuple[pl.DataFrame, pl.DataFrame, pl.DataFrame, pl.DataFrame, pl.DataFrame]:
    daily = pl.DataFrame(
        [
            {
                "ts_code": code,
                "trade_date": day,
                "close": close,
                "high": close,
                "pct_chg": change,
                "amount": 100.0,
            }
            for code, day, close, change in [
                ("300001.SZ", "20260825", 10.0, 0.0),
                ("300001.SZ", "20260826", 11.0, 10.0),
                ("300001.SZ", "20260827", 12.0, 9.0),
                ("688001.SH", "20260825", 10.0, 0.0),
                ("688001.SH", "20260826", 11.0, 10.0),
                ("688001.SH", "20260828", 12.0, 9.0),
                ("920001.BJ", "20260827", 10.0, 0.0),
                ("920001.BJ", "20260828", 11.0, 10.0),
                ("600001.SH", "20260828", 10.0, 0.0),
            ]
        ]
    )
    limits = daily.select("ts_code", "trade_date").with_columns(
        pl.lit(11.0).alias("up_limit"), pl.lit(9.0).alias("down_limit")
    )
    basic = pl.DataFrame(
        {
            "ts_code": ["300001.SZ", "688001.SH", "920001.BJ", "600001.SH"],
            "turnover_rate": [2.0, 3.0, 4.0, 5.0],
            "pe_ttm": [10.0] * 4,
            "pb": [2.0] * 4,
            "total_mv": [100.0] * 4,
        }
    )
    names = basic.select("ts_code").with_columns(pl.col("ts_code").alias("name"))
    members = pl.DataFrame(
        {
            "ts_code": ["688001.SH", "688001.SH", "920001.BJ", "600001.SH"],
            "in_date": ["20200101", "20260829", "20200101", "20200101"],
            "out_date": [None, None, None, None],
            "l1_name": ["历史行业", "未来行业", "行业B", "行业C"],
        },
        schema_overrides={"out_date": pl.String},
    )
    return daily, limits, basic, names, members


def test_suspension_and_previous_market_session() -> None:
    current, history = panel(*inputs(), date(2026, 8, 28), date(2026, 8, 27))
    result = ecology(current, history, "20260827", None)
    # 300001前日未涨停，688001更早涨停但前日停牌，均不能作昨日涨停。
    assert result.previousLimitUpCount == 0
    row = current.filter(pl.col("ts_code") == "688001.SH").row(0, named=True)
    assert row["prevBoardHeight"] == 0
    assert row["industry"] == "历史行业"
    assert row["return5d"] is None
    assert row["return20d"] is None
    assert row["ma20"] == 11
    assert row["turnoverRate"] == 0.03
    assert row["marketCapCny"] == 1000000


def test_yesterday_limit_today_suspended_still_in_denominator() -> None:
    daily, limits, basic, names, members = inputs()
    daily = daily.with_columns(
        pl.when((pl.col("ts_code") == "300001.SZ") & (pl.col("trade_date") == "20260827"))
        .then(11.0)
        .otherwise(pl.col("close"))
        .alias("close")
    )
    current, history = panel(
        daily, limits, basic, names, members, date(2026, 8, 28), date(2026, 8, 27)
    )
    result = ecology(current, history, "20260827", None)
    assert result.previousLimitUpCount == 1
    assert result.advancementCount == 0
    assert result.advancementRate == 0
    assert result.previousLimitPremium is None
    assert result.failedPromotions == []


def test_missing_limit_does_not_prove_chain_broken() -> None:
    daily, limits, basic, names, members = inputs()
    # 昨日收盘涨停，前一自身交易日限价缺失，不能把高度截为1。
    daily = daily.with_columns(
        pl.when((pl.col("ts_code") == "300001.SZ") & (pl.col("trade_date") == "20260827"))
        .then(11.0)
        .otherwise(pl.col("close"))
        .alias("close")
    )
    limits = limits.filter(
        ~((pl.col("ts_code") == "300001.SZ") & (pl.col("trade_date") == "20260826"))
    )
    with pytest.raises(ValueError, match="连板历史限价缺失"):
        panel(daily, limits, basic, names, members, date(2026, 8, 28), date(2026, 8, 27))


def test_price_tolerance_strict() -> None:
    daily, limits, basic, names, members = inputs()
    daily = daily.with_columns(
        pl.when(pl.col("ts_code") == "920001.BJ")
        .then(10.9995)
        .otherwise(pl.col("close"))
        .alias("close")
    )
    current, _ = panel(daily, limits, basic, names, members, date(2026, 8, 28), date(2026, 8, 27))
    assert current.filter(pl.col("ts_code") == "920001.BJ")["limitUp"][0]


def test_cap_ties_use_array_cut_not_quantile() -> None:
    frame = pl.DataFrame(
        {
            "board": ["主板"] * 10,
            "marketCapCny": [1.0, 1.0, 1.0, 1.0, 1.0, 1.0, 2.0, 2.0, 3.0, 3.0],
            "return1d": [0.01] * 10,
            "aboveMa20": [True] * 10,
            "turnoverRate": [0.02] * 10,
        }
    )
    result = segments(frame)
    assert [(row.name, row.sampleCount) for row in result.marketCap] == [("小盘", 6), ("中盘", 4)]


@pytest.mark.parametrize(
    ("r1", "r5", "a", "ma", "expected"),
    [
        (0.01, 0.03, 0.55, 0.55, "趋势扩散"),
        (-0.01, 0.02, 0.4, 0.55, "高位分歧"),
        (0.01, None, 0.6, 0.2, "低位修复"),
        (-0.01, -0.03, 0.4, 0.3, "退潮观察"),
    ],
)
def test_industry_rule_boundaries(
    r1: float, r5: float | None, a: float, ma: float, expected: str
) -> None:
    assert lifecycle(r1, r5, a, ma) == expected


def test_index_bars_units_and_previous_close() -> None:
    frame = pl.DataFrame(
        {
            "trade_date": ["20260828"],
            "open": [10.0],
            "high": [11.0],
            "low": [9.0],
            "close": [10.5],
            "pre_close": [10.0],
            "pct_chg": [5.0],
            "amount": [123.0],
        }
    )
    result = bars(frame, date(2026, 8, 28))
    assert result[0].amountCny == 123000
    assert result[0].preClose == 10
    assert result[0].return1d == 0.05


@pytest.mark.parametrize(
    ("prices", "expected"),
    [
        ([6.67] * 20, False),
        ([6.0] * 19 + [6.67], True),
        ([7.0] * 19 + [6.67], False),
        ([6.67], False),
    ],
)
def test_exact_decimal_ma_comparison(prices: list[float], expected: bool) -> None:
    daily, limits, basic, names, members = inputs()
    dates = [f"202608{day:02}" for day in range(29 - len(prices), 29)]
    rows = pl.DataFrame(
        {
            "ts_code": ["600001.SH"] * len(prices),
            "trade_date": dates,
            "close": prices,
            "high": prices,
            "pct_chg": [0.0] * len(prices),
            "amount": [100.0] * len(prices),
        }
    )
    daily = pl.concat([daily.filter(pl.col("ts_code") != "600001.SH"), rows])
    limits = daily.select("ts_code", "trade_date").with_columns(
        pl.lit(11.0).alias("up_limit"), pl.lit(5.0).alias("down_limit")
    )
    current, _ = panel(daily, limits, basic, names, members, date(2026, 8, 28), date(2026, 8, 27))
    assert current.filter(pl.col("ts_code") == "600001.SH")["aboveMa20"][0] is expected


def test_duplicate_daily_key_is_explicit_failure() -> None:
    daily, limits, basic, names, members = inputs()
    with pytest.raises(ValueError, match="重复自然键"):
        panel(
            pl.concat([daily, daily.head(1)]),
            limits,
            basic,
            names,
            members,
            date(2026, 8, 28),
            date(2026, 8, 27),
        )


def test_missing_previous_limit_not_silently_excluded() -> None:
    daily, limits, basic, names, members = inputs()
    limits = limits.filter(
        ~((pl.col("ts_code") == "920001.BJ") & (pl.col("trade_date") == "20260827"))
    )
    daily = daily.with_columns(
        pl.when((pl.col("ts_code") == "920001.BJ") & (pl.col("trade_date") == "20260828"))
        .then(10.0)
        .otherwise(pl.col("close"))
        .alias("close")
    )
    with pytest.raises(ValueError, match="上一市场交易日限价"):
        panel(daily, limits, basic, names, members, date(2026, 8, 28), date(2026, 8, 27))


def test_zero_sample_style_cannot_fabricate_mean() -> None:
    from hub_market.compute.aggregate import style

    frame = pl.DataFrame({"return1d": [0.01], "return5d": [0.01], "aboveMa20": [True]})
    with pytest.raises(ValueError, match="无样本"):
        style(frame)


def test_technical_breakout_excludes_current_high() -> None:
    from pathlib import Path

    from hub_contracts import MarketDay
    from hub_market.compute.indices import technical

    root = Path(__file__).resolve().parents[5]
    market = MarketDay.model_validate_json(
        (root / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text()
    ).market.model_copy(
        update={"advanceShare": 0.5, "turnoverCny": 100.0, "turnoverMedian20Cny": 100.0}
    )
    frame = pl.DataFrame(
        {
            "trade_date": [f"202608{n:02}" for n in range(8, 29)],
            "close": [10.0] * 20 + [15.0],
            "high": [10.0] * 20 + [20.0],
            "low": [9.0] * 20 + [10.0],
            "pre_close": [10.0] * 21,
        }
    )
    result = technical(frame, date(2026, 8, 28), market)
    assert result.confirmationNow is True
    assert result.atr20 == 1.45
    assert result.resistance[-1].value == 20
    assert (
        technical(
            frame, date(2026, 8, 28), market.model_copy(update={"advanceShare": 0.499})
        ).confirmationNow
        is False
    )


@pytest.mark.parametrize(
    ("previous_record", "coverage", "delta"), [(True, 1.0, 0.0), (False, 0.0, None)]
)
def test_etf_share_absence_not_flat(
    previous_record: bool, coverage: float, delta: float | None
) -> None:
    from hub_market.compute.etf import etf_groups

    basic = pl.DataFrame(
        {
            "ts_code": ["TEST.SH"],
            "name": ["境内股票ETF"],
            "fund_type": ["股票型"],
            "list_date": ["20200101"],
        }
    )
    daily = pl.DataFrame(
        {
            "ts_code": ["TEST.SH"],
            "trade_date": ["20260828"],
            "pct_chg": [1.0],
            "amount": [0.0],
            "close": [10.0],
        }
    )
    shares = pl.DataFrame(
        {
            "ts_code": ["TEST.SH"] * (2 if previous_record else 1),
            "trade_date": ["20260827", "20260828"] if previous_record else ["20260828"],
            "fd_share": [100.0] * (2 if previous_record else 1),
        }
    )
    result = etf_groups(
        basic,
        daily,
        shares,
        {
            "excludeKeywords": [],
            "requireFundTypeContains": "股票",
            "groups": [{"name": "测试组", "pattern": "股票"}],
        },
        date(2026, 8, 28),
        date(2026, 8, 27),
    )
    assert result is not None
    group = result.groups[0]
    assert group.amountWeightedReturn1d == 0.01
    assert group.shareCoverage == coverage
    assert group.representative.shareDelta == delta
    assert group.medianReturn5d is None
    assert group.medianReturn20d is None
