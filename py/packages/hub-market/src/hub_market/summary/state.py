"""固定规则状态摘要，不调用模型，文案由配置显式注入。"""

from collections.abc import Sequence
from typing import Any

from hub_contracts import (
    MarketDirections,
    MarketIndustry,
    MarketLimitEcology,
    MarketMoneyflow,
    MarketOverview,
    MarketQuestion,
    MarketStateSummary,
    MarketTemperature,
)


def build(
    market: MarketOverview,
    limits: MarketLimitEcology,
    temperature: MarketTemperature,
    industries: Sequence[MarketIndustry],
    directions: MarketDirections | None,
    moneyflow: MarketMoneyflow | None,
    templates: dict[str, Any],
) -> MarketStateSummary:
    a, m, c = market.advanceShare, market.aboveMa20Share, market.turnoverChange
    category = "weak" if a < 0.35 else "strong" if a > 0.65 else "mixed"
    headline = (
        "weakTrend"
        if a < 0.35 and m >= 0.75
        else "weakBreadth"
        if a < 0.35
        else "strongLiquidity"
        if a > 0.65 and c > 0
        else "strongBreadth"
        if a > 0.65
        else "mixed"
    )
    ranked = sorted(industries, key=lambda row: (-row.return1d, row.name))
    if len(ranked) < 2:
        raise ValueError("状态摘要需要至少两个有证据的行业")
    best, worst = (
        (directions.items[0], directions.items[-1])
        if directions and directions.items
        else (None, None)
    )
    arguments: dict[str, Any] = {
        "a": a,
        "m": m,
        "c": c,
        "up": market.advanceCount,
        "down": market.declineCount,
        "trillion": market.turnoverCny / 1e12,
        "median": market.medianReturn1d,
        "limit_up": limits.limitUpCount,
        "limit_down": limits.limitDownCount,
        "touched": limits.touchedCount,
        "failed": limits.failedCount,
        "height": limits.maxBoardHeight,
        "seal": f"{limits.sealRate:.1%}" if limits.sealRate is not None else "证据不足",
        "temperature": temperature.value,
        "weak_industry": ranked[-1].name,
        "weak_industry_return": ranked[-1].return1d,
        "industry1": ranked[-2].name,
        "industry2": ranked[-1].name,
        "r1": ranked[-2].return1d,
        "r2": ranked[-1].return1d,
        "direction_count": len(directions.items) if directions else None,
        "best": best.name if best else None,
        "best_return": best.return1d if best else None,
        "worst": worst.name if worst else None,
        "worst_return": worst.return1d if worst else None,
        "money": moneyflow.marketNetCny / 1e8 if moneyflow else None,
    }

    def text(template: str) -> str:
        return template.format(**arguments)

    def question(config: dict[str, str]) -> MarketQuestion:
        return MarketQuestion(title=text(config["title"]), text=text(config["text"]))

    support = (text(templates["directionSupport"]) if best else "") + text(templates["support"])
    counter = (
        text(templates["counterIndustry"])
        + (text(templates["counterDirection"]) if worst else "")
        + text(templates["counterTurnover"])
        + (text(templates["counterMoney"]) if moneyflow else "")
        + "。"
    )
    risks = templates["risks"]
    validations = templates["validations"]
    next_validations = [question(validations[category])]
    if best and worst:
        next_validations.extend([question(validations["best"]), question(validations["worst"])])
    next_validations.append(question(validations["ecology"]))
    return MarketStateSummary(
        headline=templates["headlines"][headline],
        text=text(templates["first"]) + text(templates["structure"][category]),
        support=support,
        counterEvidence=counter,
        tags=[
            templates["tags"][category],
            templates["tags"]["shrink" if c < 0 else "expand"],
            *[text(templates["tags"][key]) for key in ("ma", "limit", "temperature")],
        ],
        risks=[
            question(risks[category]),
            MarketQuestion(
                title=risks[
                    "divergenceWeak"
                    if any(row.return1d < 0 for row in ranked[-2:])
                    else "divergenceStrong"
                ],
                text=text(risks["divergence"]),
            ),
            MarketQuestion(
                title=risks["liquidityStrong" if c > 0 else "liquidityWeak"],
                text=text(risks["liquidity"]),
            ),
        ],
        nextValidations=next_validations,
    )
