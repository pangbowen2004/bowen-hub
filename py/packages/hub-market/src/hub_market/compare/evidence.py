"""只从现有原始记录提取来源证据，不推测缺失旧成员列表。"""

from decimal import Decimal
from typing import Any, cast

import polars as pl

from hub_market.compute.day import Computed


def evidence(computed: Computed, legacy: dict[str, Any]) -> dict[str, Any]:
    inputs = computed.inputs
    if not inputs.tables:
        return {"availability": "--input提供日文档，无附带原始表，不能推断旧成员差异原因"}
    daily = (
        inputs.required("daily")
        .filter(pl.col("trade_date") <= inputs.on.strftime("%Y%m%d"))
        .sort("ts_code", "trade_date")
    )
    equalities: list[dict[str, Any]] = []
    for frame in daily.partition_by("ts_code"):
        if frame["trade_date"][-1] != inputs.on.strftime("%Y%m%d") or frame.height < 2:
            continue
        window = frame.tail(20)
        prices = [Decimal(str(price)) for price in window["close"]]
        total = sum(prices)
        if prices[-1] * len(prices) == total:
            equalities.append(
                {
                    "code": str(frame["ts_code"][0]),
                    "prices": window.select("trade_date", "close").to_dicts(),
                    "sumDecimal": str(total),
                    "meanDecimal": str(total / len(prices)),
                    "closeDecimal": str(prices[-1]),
                    "strictAbove": False,
                    "return1d": float(window["pct_chg"][-1]) / 100,
                }
            )
    old_examples: dict[str, dict[str, Any]] = {}

    def visit(value: Any) -> None:
        if isinstance(value, dict):
            mapping = cast(dict[str, Any], value)
            if "code" in mapping and "industry" in mapping:
                old_examples[str(mapping["code"])] = mapping
            for nested in mapping.values():
                visit(nested)
        elif isinstance(value, list):
            for nested in cast(list[Any], value):
                visit(nested)

    visit(legacy)
    members = (
        inputs.required("index_member_all")
        .filter(
            (pl.col("in_date") <= inputs.on.strftime("%Y%m%d"))
            & (
                pl.col("out_date").is_null()
                | (pl.col("out_date") == "")
                | (pl.col("out_date") > inputs.on.strftime("%Y%m%d"))
            )
        )
        .sort("ts_code", "in_date")
        .unique("ts_code", keep="last")
    )
    old_examples_different: list[dict[str, Any]] = []
    for row in members.to_dicts():
        old = old_examples.get(row["ts_code"])
        if old is not None and old["industry"] != row["l1_name"]:
            old_examples_different.append(
                {
                    "code": row["ts_code"],
                    "oldName": old.get("name"),
                    "oldIndustry": old["industry"],
                    "currentSourceL1": row["l1_name"],
                    "inDate": row["in_date"],
                    "outDate": row["out_date"],
                    "sourceIsNew": row["is_new"],
                }
            )
    flow = inputs.table("moneyflow_dc", inputs.on.strftime("%Y%m%d"))
    return {
        "rawRecordingDate": inputs.membership_as_of.isoformat(),
        "maExactEqualities": equalities,
        "oldIndividualIndustryEvidence": old_examples_different,
        "industryCoverage": {
            "new": sum(row.sampleCount for row in computed.industries),
            "old": sum(row["sampleCount"] for row in legacy["industries"]["ranking"]),
            "oldFullMemberListAvailable": False,
            "boundary": "不能从聚合计数重建32个旧缺失成员；当前完整名单在原始index_member_all录制，可按点时区间核验。",
        },
        "moneyflowCoverage": {
            "sourceUniqueCodes": (flow["ts_code"].n_unique() if not flow.is_empty() else 0)
            if flow is not None
            else None,
            "sourceDates": flow["trade_date"].unique().to_list()
            if flow is not None and not flow.is_empty()
            else [],
            "duplicateCodeRows": flow.height - flow["ts_code"].n_unique()
            if flow is not None and not flow.is_empty()
            else 0
            if flow is not None
            else None,
            "sourceNullCounts": flow.null_count().to_dicts()[0]
            if flow is not None and not flow.is_empty()
            else None,
            "outsideDailyCodes": flow.join(
                daily.filter(pl.col("trade_date") == inputs.on.strftime("%Y%m%d")).select(
                    "ts_code"
                ),
                on="ts_code",
                how="anti",
            ).height
            if flow is not None and not flow.is_empty()
            else None,
            "oldCount": legacy["moneyflow"]["stockCoverageCount"],
            "oldFullCodeListAvailable": False,
        },
        "etfBoundary": "fund_basic(market=E,status=L)为实际采集日当前名单；旧红利99只的完整名单不存在，不能断言具体缺失ETF。",
    }
