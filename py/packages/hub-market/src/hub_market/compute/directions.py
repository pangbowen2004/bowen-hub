"""官方方向收益与当前成员统计分离，保留完整来源集合。"""

from collections.abc import Mapping, Sequence
from datetime import date
from typing import Any, Literal

import polars as pl

from hub_contracts import (
    MarketComponentCrossCheck,
    MarketDirection,
    MarketDirectionLaggard,
    MarketDirectionLeader,
    MarketDirections,
    MarketMoneyflow,
    MoneyflowCoverage,
)

from .aggregate import required, sum_values, value


def state(
    r1: float, r5: float | None, advance: float
) -> Literal["趋势扩散", "高位分歧", "低位修复", "趋势转弱", "方向待明"]:
    if r5 is not None and r5 >= 0.05 and advance >= 0.55:
        return "趋势扩散"
    if r5 is not None and r5 >= 0.03 and r1 < 0:
        return "高位分歧"
    if r1 > 0 and (r5 is None or r5 <= 0):
        return "低位修复"
    if r5 is not None and r5 < -0.03:
        return "趋势转弱"
    return "方向待明"


def moneyflow(market: pl.DataFrame | None, stocks: pl.DataFrame | None) -> MarketMoneyflow | None:
    if market is None or market.is_empty():
        return None
    if market.height != 1:
        raise ValueError("大盘资金流应有一条目标日记录")
    if stocks is not None and stocks.is_empty():
        stocks = pl.DataFrame(schema={"ts_code": pl.String, "net_amount": pl.Float64})
    row = market.row(0, named=True)
    return MarketMoneyflow(
        marketNetCny=row["net_amount"],
        marketNetRate=row["net_amount_rate"] / 100,
        extraLargeNetCny=row["buy_elg_amount"],
        largeNetCny=row["buy_lg_amount"],
        mediumNetCny=row["buy_md_amount"],
        smallNetCny=row["buy_sm_amount"],
        stockCoverageCount=stocks["ts_code"].n_unique() if stocks is not None else None,
        classificationBoundary="供应商订单分类代理，不等于机构、游资或真实主体资金。",
    )


def directions(
    current: pl.DataFrame,
    history: pl.DataFrame,
    tables: Mapping[str, pl.DataFrame],
    configuration: Sequence[dict[str, Any]],
    on: date,
    membership_as_of: date,
    flows: pl.DataFrame | None,
) -> MarketDirections | None:
    stamp = on.strftime("%Y%m%d")
    if any(
        f"{endpoint}/{row['code']}" not in tables
        for row in configuration
        for endpoint in ("ths_member", "ths_daily")
    ):
        return None
    if flows is not None and flows.is_empty():
        flows = pl.DataFrame(schema={"ts_code": pl.String, "net_amount": pl.Float64})
    output: list[MarketDirection] = []
    turnover = required(current, "amountCny", "sum")
    all_return = required(current, "return1d")
    for config in configuration:
        code = config["code"]
        member_codes = sorted(set(tables[f"ths_member/{code}"]["con_code"].to_list()))
        members = current.filter(pl.col("ts_code").is_in(member_codes))
        official = (
            tables[f"ths_daily/{code}"].filter(pl.col("trade_date") <= stamp).sort("trade_date")
        )
        if members.is_empty() or official.is_empty() or official["trade_date"][-1] != stamp:
            return None
        close = float(official["close"][-1])
        r1 = float(official["pct_change"][-1]) / 100
        r5 = close / float(official["close"][-6]) - 1 if official.height >= 6 else None
        r20 = close / float(official["close"][-21]) - 1 if official.height >= 21 else None
        amount = required(members, "amountCny", "sum")
        daily_amounts = (
            history.filter(pl.col("ts_code").is_in(member_codes) & pl.col("pct_chg").is_not_null())
            .group_by("trade_date")
            .agg(pl.col("amountCny"))
            .with_columns(pl.col("amountCny").map_elements(sum_values, return_dtype=pl.Float64))
            .sort("trade_date")
            .tail(20)
        )
        if daily_amounts.height != 20:
            raise ValueError(f"{config['name']} 成员成交分位不足20日")
        advance = members.filter(pl.col("return1d") > 0).height / members.height
        member_flows = (
            flows.filter(pl.col("ts_code").is_in(member_codes)).unique("ts_code")
            if flows is not None
            else None
        )
        leaders = members.sort(
            ["return1d", "amountCny", "ts_code"], descending=[True, True, False]
        ).head(3)
        laggards = members.sort(["return1d", "ts_code"]).head(3)
        output.append(
            MarketDirection(
                name=config["name"],
                sourceIndexCode=code,
                memberCount=len(member_codes),
                memberCodes=member_codes,
                coveredCount=members.height,
                return1d=r1,
                return5d=r5,
                return20d=r20,
                medianReturn1d=required(members, "return1d", "median"),
                advanceShare=advance,
                aboveMa20Share=required(members, "aboveMa20"),
                amountCny=amount,
                amountShare=amount / turnover,
                amount20dPercentile=daily_amounts.filter(pl.col("amountCny") <= amount).height
                / daily_amounts.height,
                relativeVsAllA=r1 - all_return,
                limitUpCount=members.filter(pl.col("limitUp")).height,
                limitDownCount=members.filter(pl.col("limitDown")).height,
                loss5Count=members.filter(pl.col("return1d") <= -0.05).height,
                moneyflowProxyCny=required(member_flows, "net_amount", "sum") * 10000
                if member_flows is not None
                else None,
                moneyflowCoverage=MoneyflowCoverage(member_flows.height / len(member_codes))
                if member_flows is not None
                else None,
                componentCrossCheck=MarketComponentCrossCheck(
                    return1d=required(members, "return1d"),
                    return5d=value(members, "return5d"),
                    return20d=value(members, "return20d"),
                    delta1dVsOfficial=required(members, "return1d") - r1,
                ),
                leaders=[
                    MarketDirectionLeader(
                        code=row["ts_code"],
                        name=row["name"],
                        return1d=row["return1d"],
                        amountCny=row["amountCny"],
                    )
                    for row in leaders.to_dicts()
                ],
                laggards=[
                    MarketDirectionLaggard(
                        code=row["ts_code"], name=row["name"], return1d=row["return1d"]
                    )
                    for row in laggards.to_dicts()
                ],
                state=state(r1, r5, advance),
            )
        )
    return MarketDirections(
        membershipAsOf=membership_as_of,
        items=sorted(output, key=lambda row: (-row.return1d, row.name)),
    )
