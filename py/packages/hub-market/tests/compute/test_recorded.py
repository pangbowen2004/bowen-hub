"""真实原始Parquet覆盖全部指标块，不把手写样例当计算真值。"""

from datetime import date
from pathlib import Path

import pytest

from hub_contracts import MoneyflowCoverage
from hub_core.config import load_config
from hub_market.compare.load import recorded
from hub_market.compute.day import Computed, compute, day_summary

ROOT = Path(__file__).resolve().parents[5]


@pytest.fixture(scope="module")
def result() -> Computed:
    return compute(
        recorded(ROOT, date(2026, 8, 28)), load_config(ROOT / "config/market_summary.yaml")
    )


def test_market(result: Computed) -> None:
    assert (
        result.market.sampleCount,
        result.market.advanceCount,
        result.market.declineCount,
        result.market.flatCount,
    ) == (5547, 3013, 2390, 144)
    assert round(result.market.turnoverCny) == 2117732336241
    assert result.market.medianTurnoverRate == 0.019674


def test_indices(result: Computed) -> None:
    assert len(result.indices) == 6
    assert result.indices[0].close == 3952.179
    assert result.indices[0].amountCny == pytest.approx(970365152112.9)


def test_temperature(result: Computed) -> None:
    assert result.temperature.value == 51.9
    assert result.temperature.parts.breadth == 19.01
    assert result.temperature.parts.positiveIndices == 0


def test_sentiment(result: Computed) -> None:
    assert result.sentiment.value == 81.1
    assert len(result.sentiment.dimensions) == 9
    assert sum(row.weight for row in result.sentiment.dimensions) == 100
    assert all(
        row.formula and row.unit and row.input is not None for row in result.sentiment.dimensions
    )


def test_style(result: Computed) -> None:
    assert sum(row.count for row in result.style.groups) == 5547
    assert result.style.groups[0].count == 347
    assert result.style.groups[1].count == 972  # 301221严格十进制相等，不站上MA。


def test_ecology(result: Computed) -> None:
    x = result.limit_ecology
    assert (x.limitUpCount, x.limitDownCount, x.touchedCount, x.failedCount) == (83, 3, 106, 23)
    assert (x.previousLimitUpCount, x.advancementCount, x.maxBoardHeight) == (78, 18, 7)
    assert x.providerDetail is not None
    assert x.providerDetail.rowCount == 99
    assert sum(row.count for row in x.heightDistribution) == 83
    assert x.progression[0].name == "深中华A"
    assert any(row.limitDetail and row.limitDetail.upStat for row in x.progression)


def test_moneyflow(result: Computed) -> None:
    assert result.moneyflow is not None
    assert result.moneyflow.marketNetCny == -34371002368
    assert result.moneyflow.stockCoverageCount == 6007
    assert result.moneyflow.marketNetRate == pytest.approx(-0.0164)


def test_industries(result: Computed) -> None:
    assert len(result.industries) == 31
    assert result.industries[0].name == "农林牧渔"
    assert result.industries[0].sampleCount == 114
    assert sum(row.sampleCount for row in result.industries) <= 5547


def test_themes(result: Computed) -> None:
    assert len(result.themes) == 8
    agriculture = next(row for row in result.themes if row.name == "大消费")
    assert "农林牧渔" in agriculture.members


def test_directions(result: Computed) -> None:
    x = result.directions
    assert x is not None
    assert len(x.items) == 16
    assert x.membershipAsOf == date(2026, 10, 2)
    for row in x.items:
        assert row.memberCodes is not None
        assert len(row.memberCodes) == row.memberCount
        assert row.coveredCount <= row.memberCount
        assert isinstance(row.moneyflowCoverage, MoneyflowCoverage)
        assert 0 <= row.moneyflowCoverage.root <= 1
    assert x.items[0].name == "文化传媒"


def test_etf(result: Computed) -> None:
    x = result.etf_groups
    assert x is not None
    assert len(x.groups) == 8
    assert x.groups[0].name == "资源周期"
    assert x.groups[0].sampleCount == 61
    assert x.groups[0].representative.code == "512400.SH"


def test_segments(result: Computed) -> None:
    assert sum(row.sampleCount for row in result.segments.boards) == 5547
    assert sum(row.sampleCount for row in result.segments.marketCap) == 5547
    assert len(result.segments.boards) == len(result.segments.marketCap) == 4


def test_stocks(result: Computed) -> None:
    assert len(result.stocks.top) == len(result.stocks.bottom) == 12
    assert result.stocks.top[0].return1d >= result.stocks.top[-1].return1d
    assert result.stocks.bottom[0].return1d <= result.stocks.bottom[-1].return1d


def test_technical(result: Computed) -> None:
    assert result.technical.ma20 == pytest.approx(3916.06494)
    assert result.technical.atr20 == pytest.approx(43.99832)
    assert result.technical.confirmationNow is False
    assert len(result.technical.support) == 3
    assert len(result.technical.resistance) == 2


def test_state_summary(result: Computed) -> None:
    assert result.summary.headline == "涨跌分化，市场仍在寻找一致方向"
    assert "资金流分类代理-343.7亿元" in result.summary.counterEvidence
    assert len(result.summary.risks) == 3
    assert len(result.summary.nextValidations) == 4


def test_daily_summary(result: Computed) -> None:
    summary = day_summary(result)
    assert summary.date == date(2026, 8, 28)
    assert summary.topDirections is not None
    assert len(summary.topDirections) == 3
    assert summary.directionsRelative is not None
    assert len(summary.directionsRelative) == 16


def test_two_real_ma_equalities(result: Computed) -> None:
    from decimal import Decimal

    import polars as pl

    from hub_market.compute.panel import panel

    inputs = result.inputs
    current, history = panel(
        inputs.required("daily"),
        inputs.required("stk_limit"),
        inputs.required("daily_basic", "20260828"),
        inputs.required("stock_basic"),
        inputs.required("index_member_all"),
        inputs.on,
        inputs.previous,
    )
    for code, expected in [("002340.SZ", "6.67"), ("301221.SZ", "28.37")]:
        raw = history.filter(pl.col("ts_code") == code).tail(20)
        assert sum(Decimal(str(price)) for price in raw["close"]) / 20 == Decimal(expected)
        row = current.filter(pl.col("ts_code") == code).row(0, named=True)
        assert row["aboveMa20"] is False


@pytest.mark.parametrize(
    ("endpoint", "missing"),
    [
        ("moneyflow_mkt_dc", "moneyflow"),
        ("moneyflow_dc", "moneyflow"),
        ("limit_list_d", "limitDetail"),
        ("fund_basic", "etfGroups"),
        ("fund_daily", "etfGroups"),
        ("fund_share", "etfShares"),
        ("ths_member", "directions"),
        ("ths_daily", "directions"),
    ],
)
def test_optional_failures_keep_core_and_null_only_affected(
    result: Computed, endpoint: str, missing: str
) -> None:
    from dataclasses import replace

    modified = compute(
        replace(result.inputs, missing_endpoints=frozenset({endpoint})),
        load_config(ROOT / "config/market_summary.yaml"),
    )
    assert not modified.data_status.complete
    assert modified.data_status.missing == [missing]
    assert modified.market.model_dump() == pytest.approx(
        result.market.model_dump(), rel=1e-15, abs=1e-12
    )
    if endpoint == "moneyflow_mkt_dc":
        assert modified.moneyflow is None
        assert "资金流分类代理" not in modified.summary.counterEvidence
    elif endpoint == "moneyflow_dc":
        assert modified.moneyflow is not None
        assert modified.moneyflow.stockCoverageCount is None
        assert modified.directions is not None
        assert all(
            row.moneyflowCoverage is None and row.moneyflowProxyCny is None
            for row in modified.directions.items
        )
    elif endpoint == "limit_list_d":
        assert modified.limit_ecology.providerDetail is None
        assert all(row.limitDetail is None for row in modified.limit_ecology.progression)
    elif endpoint in ("fund_basic", "fund_daily"):
        assert modified.etf_groups is None
    elif endpoint == "fund_share":
        assert modified.etf_groups is not None
        assert all(
            row.shareCoverage is None
            and row.shareIncreaseCount is None
            and row.shareDecreaseCount is None
            and row.representative.shareDelta is None
            for row in modified.etf_groups.groups
        )
    else:
        assert modified.directions is None
        assert day_summary(modified).topDirections is None
        assert day_summary(modified).directionsRelative is None
        assert len(modified.summary.nextValidations) == 2
        assert "16方向" not in modified.summary.support


def test_short_mlcc_window_cannot_fabricate_twentieth_return() -> None:
    x = compute(recorded(ROOT, date(2026, 8, 27)), load_config(ROOT / "config/market_summary.yaml"))
    assert x.directions is not None
    row = next(row for row in x.directions.items if row.name == "MLCC")
    assert row.return20d is None
    assert row.return5d is not None


def test_empty_available_flows_and_shares_are_zero_coverage_not_missing(result: Computed) -> None:
    from dataclasses import replace

    import polars as pl

    tables = dict(result.inputs.tables)
    for key in tables:
        if key.startswith(("moneyflow_dc/", "fund_share/")):
            tables[key] = pl.DataFrame()
    modified = compute(
        replace(result.inputs, tables=tables), load_config(ROOT / "config/market_summary.yaml")
    )
    assert modified.moneyflow is not None
    assert modified.moneyflow.stockCoverageCount == 0
    assert modified.directions is not None
    for row in modified.directions.items:
        assert isinstance(row.moneyflowCoverage, MoneyflowCoverage)
        assert row.moneyflowCoverage.root == 0
        assert row.moneyflowProxyCny == 0
    assert modified.etf_groups is not None
    assert all(
        row.shareCoverage == 0 and row.shareIncreaseCount == 0 and row.shareDecreaseCount == 0
        for row in modified.etf_groups.groups
    )
    assert modified.data_status.complete


def test_missing_sentiment_input_is_evidence_failure(result: Computed) -> None:
    from hub_market.compute.scores import sentiment

    with pytest.raises(ValueError, match="情绪九维输入证据不足"):
        sentiment(result.market, result.limit_ecology.model_copy(update={"sealRate": None}))


def test_direction_coverage_denominator_is_complete_source_members(result: Computed) -> None:
    import polars as pl

    from hub_market.compute.directions import directions
    from hub_market.compute.panel import panel

    inputs = result.inputs
    current, history = panel(
        inputs.required("daily"),
        inputs.required("stk_limit"),
        inputs.required("daily_basic", "20260828"),
        inputs.required("stock_basic"),
        inputs.required("index_member_all"),
        inputs.on,
        inputs.previous,
    )
    tables = dict(inputs.tables)
    # 测试用无行情来源成员，明确不作为生产事实保存。
    code = inputs.directions[0]["code"]
    frame = tables[f"ths_member/{code}"]
    tables[f"ths_member/{code}"] = pl.concat(
        [
            frame,
            pl.DataFrame(
                {
                    "ts_code": [code],
                    "con_code": ["TEST_NO_QUOTE.SH"],
                    "con_name": ["测试无行情成员"],
                }
            ),
        ]
    )
    computed = directions(
        current,
        history,
        tables,
        inputs.directions,
        inputs.on,
        inputs.membership_as_of,
        inputs.required("moneyflow_dc", "20260828"),
    )
    assert computed is not None
    assert result.directions is not None
    actual = next(row for row in computed.items if row.sourceIndexCode == code)
    original = next(row for row in result.directions.items if row.sourceIndexCode == code)
    assert actual.memberCount == original.memberCount + 1
    assert actual.coveredCount == original.coveredCount
    assert actual.memberCodes is not None
    assert "TEST_NO_QUOTE.SH" in actual.memberCodes
    assert isinstance(actual.moneyflowCoverage, MoneyflowCoverage)
    assert isinstance(original.moneyflowCoverage, MoneyflowCoverage)
    assert actual.moneyflowCoverage.root == pytest.approx(
        original.moneyflowCoverage.root * original.memberCount / actual.memberCount
    )
    assert actual.return1d == original.return1d
