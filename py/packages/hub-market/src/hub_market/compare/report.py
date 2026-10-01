"""M-1逐字段对照；规则修正与来源变化明确记录，不放宽容差。"""

from decimal import Decimal
from typing import Any

from hub_market.compute.day import Computed

from .evidence import evidence


def report(computed: Computed, legacy: dict[str, Any]) -> dict[str, Any]:
    checks: list[dict[str, Any]] = []

    def check(
        path: str, actual: Any, expected: Any, tolerance: float = 0, *, yuan: bool = False
    ) -> None:
        if yuan and actual is not None and expected is not None:
            actual, expected = round(actual), round(expected)
        delta = (
            abs(actual - expected)
            if isinstance(actual, (int, float)) and isinstance(expected, (int, float))
            else None
        )
        passed = (
            abs(Decimal(str(actual)) - Decimal(str(expected))) <= Decimal(str(tolerance))
            if delta is not None and tolerance == 0.01
            else delta <= tolerance
            if delta is not None
            else actual == expected
        )
        checks.append(
            {
                "field": path,
                "actual": actual,
                "expected": expected,
                "tolerance": tolerance,
                "difference": delta,
                "passed": passed,
            }
        )

    c = computed
    for field in (
        "sampleCount",
        "advanceCount",
        "declineCount",
        "flatCount",
        "newHigh20Count",
        "newLow20Count",
    ):
        check(f"market.{field}", getattr(c.market, field), legacy["market"][field])
    for field in ("advanceShare", "medianReturn1d", "aboveMa20Share"):
        check(f"market.{field}", getattr(c.market, field), legacy["market"][field], 1e-9)
    check("market.turnoverCny", c.market.turnoverCny, legacy["market"]["turnoverCny"], yuan=True)
    ecology = legacy["limitEcology"]
    aliases = {"touchedCount": "touchedLimitUpCount", "failedCount": "failedLimitUpCount"}
    for field in (
        "limitUpCount",
        "limitDownCount",
        "touchedCount",
        "failedCount",
        "maxBoardHeight",
        "firstBoardCount",
        "multiBoardCount",
        "previousLimitUpCount",
        "advancementCount",
        "largeLoss7Count",
    ):
        check(
            f"limitEcology.{field}",
            getattr(c.limit_ecology, field),
            ecology[aliases.get(field, field)],
        )
    for field in ("sealRate", "advancementRate", "previousLimitPremium"):
        check(f"limitEcology.{field}", getattr(c.limit_ecology, field), ecology[field], 1e-9)
    check("temperature.value", c.temperature.value, legacy["temperature"]["value"])
    parts = {
        "breadth": "breadth35",
        "trend": "aboveMa20_20",
        "limitEcology": "limitEcology15",
        "liquidity": "liquidity15",
        "positiveIndices": "positiveIndices15",
    }
    for field, old in parts.items():
        check(
            f"temperature.parts.{field}",
            getattr(c.temperature.parts, field),
            legacy["temperature"]["components"][old],
            0.01,
        )
    check("sentiment.value", c.sentiment.value, legacy["sentimentProfile"]["value"])
    old_mood = {row["key"]: row for row in legacy["sentimentProfile"]["dimensions"]}
    for row in c.sentiment.dimensions:
        check(f"sentiment.{row.key}.score", row.score, old_mood[row.key]["score"], 0.01)
    old_style = {row["name"]: row for row in legacy["marketStyle"]["distribution"]}
    for group in c.style.groups:
        check(f"style.{group.name}.count", group.count, old_style[group.name]["count"])
    if c.moneyflow is not None:
        for field in (
            "marketNetCny",
            "extraLargeNetCny",
            "largeNetCny",
            "mediumNetCny",
            "smallNetCny",
        ):
            check(
                f"moneyflow.{field}",
                getattr(c.moneyflow, field),
                legacy["moneyflow"][field],
                yuan=True,
            )
        check(
            "moneyflow.stockCoverageCount",
            c.moneyflow.stockCoverageCount,
            legacy["moneyflow"]["stockCoverageCount"],
        )
    else:
        check("moneyflow", None, legacy["moneyflow"])
    old_technical = legacy["technicalPressure"]
    for field in ("ma5", "ma10", "ma20", "atr20"):
        check(f"technical.{field}", getattr(c.technical, field), old_technical[field], 1e-6)
    for field in ("support", "resistance"):
        for i, row in enumerate(getattr(c.technical, field)):
            check(
                f"technical.{field}[{i}].value", row.value, old_technical[field][i]["value"], 1e-6
            )
    old_directions = {row["name"]: row for row in legacy["directionMatrix"]["directions"]}
    check(
        "directions.count", len(c.directions.items) if c.directions else None, len(old_directions)
    )
    for row in c.directions.items if c.directions else []:
        for field in ("return1d", "return5d", "return20d"):
            check(
                f"directions.{row.name}.{field}",
                getattr(row, field),
                old_directions[row.name][field],
                1e-9,
            )
    old_industries = {row["name"]: row for row in legacy["industries"]["ranking"]}
    check("industries.count", len(c.industries), legacy["industries"]["count"])
    industry_differences: list[dict[str, Any]] = []
    for row in c.industries:
        old = old_industries.get(row.name)
        for field in ("sampleCount", "return1d", "lifecycle"):
            before = len(checks)
            check(
                f"industries.{row.name}.{field}",
                getattr(row, field),
                old.get(field) if old else None,
                1e-9 if field == "return1d" else 0,
            )
            if not checks[before]["passed"]:
                industry_differences.append(checks[before])
    old_etfs = {row["name"]: row for row in legacy["etfRotation"]["groups"]}
    check("etfGroups.count", len(c.etf_groups.groups) if c.etf_groups else None, len(old_etfs))
    for row in c.etf_groups.groups if c.etf_groups else []:
        old = old_etfs.get(row.name)
        for field in ("sampleCount", "amountWeightedReturn1d"):
            check(
                f"etfGroups.{row.name}.{field}",
                getattr(row, field),
                old.get(field) if old else None,
                1e-9 if field.endswith("Return1d") else 0,
            )
    failures = [row for row in checks if not row["passed"]]
    return {
        "date": c.inputs.on.isoformat(),
        "passed": not failures,
        "total": len(checks),
        "passedCount": len(checks) - len(failures),
        "failures": failures,
        "checks": checks,
        "sourceEvidence": evidence(c, legacy),
        "industryDifferences": sorted(
            industry_differences, key=lambda row: -(row["difference"] or 0)
        )[:5],
        "boundaries": [
            f"成员快照实际采集于{c.inputs.membership_as_of}，成员统计不参与M-1官方收益比较。",
            "按市场上一交易日判定昨日涨停；差异不得以股票自己的最近行情替代解释。",
            "ETF份额缺记录保持null，未使用手写演化样例。",
        ],
    }
