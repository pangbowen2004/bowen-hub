"""全市场、行业、主题、风格和分层的确定性聚合。"""

from collections.abc import Sequence
from datetime import date
from math import fsum
from typing import Any, Literal

import polars as pl

from hub_contracts import (
    MarketBoardSegment,
    MarketCapSegment,
    MarketIndustry,
    MarketOverview,
    MarketSegments,
    MarketStyle,
    MarketStyleGroup,
    MarketTheme,
)


def sum_values(values: pl.Series) -> float:
    # 固定相同数值集合的累加顺序；补偿求和避免金额量级差异丢失低位。
    return fsum(values.drop_nulls().sort().to_list())


def value(frame: pl.DataFrame, column: str, operation: str = "mean") -> float | None:
    if operation == "sum":
        return sum_values(frame.get_column(column))
    expression = pl.col(column)
    result = frame.select(getattr(expression, operation)()).item()
    return float(result) if result is not None else None


def required(frame: pl.DataFrame, column: str, operation: str = "mean") -> float:
    result = value(frame, column, operation)
    if result is None:
        raise ValueError(f"{column} 缺少计算证据")
    return result


def positive_median(frame: pl.DataFrame, column: str) -> float | None:
    return value(frame.filter(pl.col(column) > 0), column, "median")


def overview(current: pl.DataFrame, history: pl.DataFrame, previous: date) -> MarketOverview:
    totals = (
        history.filter(pl.col("pct_chg").is_not_null())
        .group_by("trade_date")
        .agg(pl.col("amountCny"))
        .with_columns(pl.col("amountCny").map_elements(sum_values, return_dtype=pl.Float64))
        .sort("trade_date")
    )
    prev = totals.filter(pl.col("trade_date") == previous.strftime("%Y%m%d"))
    turnover_prev = required(prev, "amountCny")
    if turnover_prev <= 0 or totals.height < 20:
        raise ValueError("前日成交额或20日成交额窗口证据不足")
    turnover = required(current, "amountCny", "sum")
    return MarketOverview(
        sampleCount=current.height,
        advanceCount=current.filter(pl.col("return1d") > 0).height,
        declineCount=current.filter(pl.col("return1d") < 0).height,
        flatCount=current.filter(pl.col("return1d") == 0).height,
        newHigh20Count=current.filter(pl.col("newHigh20")).height,
        newLow20Count=current.filter(pl.col("newLow20")).height,
        advanceShare=current.filter(pl.col("return1d") > 0).height / current.height,
        medianReturn1d=required(current, "return1d", "median"),
        aboveMa20Share=current.filter(pl.col("aboveMa20")).height
        / current.filter(pl.col("ma20").is_not_null()).height,
        turnoverCny=turnover,
        turnoverPrevCny=turnover_prev,
        turnoverChange=turnover / turnover_prev - 1,
        turnoverMedian20Cny=required(totals.tail(20), "amountCny", "median"),
        totalMarketCapCny=required(current, "marketCapCny", "sum"),
        medianTurnoverRate=value(current, "turnoverRate", "median"),
        medianPeTtm=positive_median(current, "pe_ttm"),
        medianPb=positive_median(current, "pb"),
    )


def lifecycle(
    r1: float, r5: float | None, advance: float, ma: float
) -> Literal["趋势扩散", "高位分歧", "修复延续", "退潮观察", "低位修复", "方向待明"]:
    if r5 is not None:
        if r5 >= 0.03 and advance >= 0.55 and ma >= 0.55:
            return "趋势扩散"
        if r5 >= 0.02 and r1 < 0 and ma >= 0.55:
            return "高位分歧"
        if r5 > 0 and advance >= 0.5:
            return "修复延续"
        if r5 <= -0.03 and advance <= 0.4:
            return "退潮观察"
    if r1 > 0 and (r5 is None or r5 <= 0):
        return "低位修复"
    return "方向待明"


def industries(current: pl.DataFrame, turnover: float, minimum: int = 10) -> list[MarketIndustry]:
    output: list[MarketIndustry] = []
    for frame in current.partition_by("industry"):
        name = str(frame["industry"][0])
        if frame.height < minimum or name == "未分类":
            continue
        r1, r5 = required(frame, "return1d"), value(frame, "return5d")
        advance, ma = (
            required(frame.with_columns((pl.col("return1d") > 0).alias("advance")), "advance"),
            required(frame, "aboveMa20"),
        )
        amount = required(frame, "amountCny", "sum")
        output.append(
            MarketIndustry(
                name=name,
                sampleCount=frame.height,
                return1d=r1,
                medianReturn1d=required(frame, "return1d", "median"),
                return5d=r5,
                return20d=value(frame, "return20d"),
                advanceShare=advance,
                aboveMa20Share=ma,
                amountCny=amount,
                amountShare=amount / turnover,
                limitUpCount=frame.filter(pl.col("limitUp")).height,
                limitDownCount=frame.filter(pl.col("limitDown")).height,
                medianPeTtm=positive_median(frame, "pe_ttm"),
                medianPb=positive_median(frame, "pb"),
                lifecycle=lifecycle(r1, r5, advance, ma),
            )
        )
    return sorted(output, key=lambda row: (-row.return1d, row.name))


def themes(
    rows: Sequence[MarketIndustry], configuration: Sequence[dict[str, Any]]
) -> list[MarketTheme]:
    result: list[MarketTheme] = []
    for config in configuration:
        selected = [row for row in rows if row.name in config["industries"]]
        if not selected:
            continue

        def weighted(field: str, selected: list[MarketIndustry] = selected) -> float | None:
            available = [
                (getattr(row, field), row.sampleCount)
                for row in selected
                if getattr(row, field) is not None
            ]
            return (
                sum(x * n for x, n in available) / sum(n for _, n in available)
                if available
                else None
            )

        result.append(
            MarketTheme(
                name=config["name"],
                members=[row.name for row in selected],
                sampleCount=sum(row.sampleCount for row in selected),
                return1d=sum(row.return1d * row.sampleCount for row in selected)
                / sum(row.sampleCount for row in selected),
                return5d=weighted("return5d"),
                return20d=weighted("return20d"),
                advanceShare=sum(row.advanceShare * row.sampleCount for row in selected)
                / sum(row.sampleCount for row in selected),
                aboveMa20Share=sum(row.aboveMa20Share * row.sampleCount for row in selected)
                / sum(row.sampleCount for row in selected),
                amountShare=sum(row.amountShare for row in selected),
                limitUpCount=sum(row.limitUpCount for row in selected),
                limitDownCount=sum(row.limitDownCount for row in selected),
            )
        )
    return sorted(result, key=lambda row: (-row.return1d, row.name))


def style(current: pl.DataFrame) -> MarketStyle:
    frame = current.with_columns(
        pl.when(
            (pl.col("return1d") >= 0.03)
            & (pl.col("return5d").fill_null(0) >= 0.05)
            & pl.col("aboveMa20")
        )
        .then(pl.lit("高位加速"))
        .when(
            (pl.col("return1d") > 0)
            & (pl.col("return5d").fill_null(0) >= 0.03)
            & pl.col("aboveMa20")
        )
        .then(pl.lit("趋势延续"))
        .when((pl.col("return1d") > 0) & ~pl.col("aboveMa20"))
        .then(pl.lit("低位修复"))
        .otherwise(pl.lit("中间状态"))
        .alias("style")
    )
    groups: list[MarketStyleGroup] = []
    for name in ("高位加速", "趋势延续", "低位修复", "中间状态"):
        subset = frame.filter(pl.col("style") == name)
        if subset.is_empty():
            raise ValueError(f"{name} 无样本，契约均值字段不允许null")
        groups.append(
            MarketStyleGroup(
                name=name,
                count=subset.height,
                share=subset.height / frame.height,
                meanReturn1d=required(subset, "return1d"),
                medianReturn1d=required(subset, "return1d", "median"),
            )
        )
    return MarketStyle(
        version="transparent-style-v1",
        groups=groups,
        trendStrongShare=sum(row.share for row in groups[:2]),
    )


def segments(current: pl.DataFrame) -> MarketSegments:
    boards: list[MarketBoardSegment] = []
    for name in ("主板", "创业板", "科创板", "北交所"):
        subset = current.filter(pl.col("board") == name)
        if subset.is_empty():
            continue
        boards.append(
            MarketBoardSegment(
                name=name,
                sampleCount=subset.height,
                return1d=required(subset, "return1d"),
                advanceShare=subset.filter(pl.col("return1d") > 0).height / subset.height,
                aboveMa20Share=required(subset, "aboveMa20"),
                turnoverRateMedian=value(subset, "turnoverRate", "median"),
            )
        )
    caps = current.filter(pl.col("marketCapCny").is_not_null()).sort("marketCapCny")
    cuts = [float(caps["marketCapCny"][int(caps.height * q)]) for q in (0.5, 0.8, 0.95)]
    categories = caps.with_columns(
        pl.when(pl.col("marketCapCny") <= cuts[0])
        .then(pl.lit("小盘"))
        .when(pl.col("marketCapCny") <= cuts[1])
        .then(pl.lit("中盘"))
        .when(pl.col("marketCapCny") <= cuts[2])
        .then(pl.lit("大盘"))
        .otherwise(pl.lit("超大盘"))
        .alias("segment")
    )
    result: list[MarketCapSegment] = []
    for name in ("小盘", "中盘", "大盘", "超大盘"):
        subset = categories.filter(pl.col("segment") == name)
        if subset.is_empty():
            continue
        result.append(
            MarketCapSegment(
                name=name,
                sampleCount=subset.height,
                return1d=required(subset, "return1d"),
                advanceShare=subset.filter(pl.col("return1d") > 0).height / subset.height,
                medianMarketCapCny=required(subset, "marketCapCny", "median"),
            )
        )
    return MarketSegments(boards=boards, marketCap=result)
