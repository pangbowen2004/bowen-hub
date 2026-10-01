"""只将未确认计为研究错误，按结算日统计近20交易日。"""

from collections.abc import Sequence
from datetime import date
from typing import Literal

from hub_contracts import Hypothesis, MarketValidation, MarketValidationCount, MarketValidationStats

RuleType = Literal[
    "MARKET_PERSISTENCE",
    "DIRECTION_PERSISTENCE",
    "DIRECTION_REPAIR",
    "LIMIT_ECOLOGY",
    "DIRECTION_SPREAD",
]


def counts(hypotheses: Sequence[Hypothesis]) -> list[MarketValidationCount]:
    grouped: dict[RuleType | None, list[Hypothesis]] = {}
    for row in hypotheses:
        grouped.setdefault(row.rule.type if row.rule is not None else None, []).append(row)
    result: list[MarketValidationCount] = []
    for key in sorted(grouped, key=lambda value: value or ""):
        items = grouped[key]
        confirmed = sum(row.result == "CONFIRMED" for row in items)
        failed = sum(row.result == "NOT_CONFIRMED" for row in items)
        inconclusive = sum(row.result == "INCONCLUSIVE" for row in items)
        settled = confirmed + failed + inconclusive
        result.append(
            MarketValidationCount(
                ruleType=key,
                settledCount=settled,
                confirmedCount=confirmed,
                notConfirmedCount=failed,
                inconclusiveCount=inconclusive,
                confirmedShare=confirmed / settled if settled else None,
                notConfirmedShare=failed / settled if settled else None,
                inconclusiveShare=inconclusive / settled if settled else None,
            )
        )
    return result


def validation(
    hypotheses: Sequence[Hypothesis], on: date, recent_sessions: Sequence[date]
) -> MarketValidation:
    recent = set(sorted({session for session in recent_sessions if session <= on})[-20:])
    visible = [
        row
        for row in hypotheses
        if row.createdOn <= on and (row.settledOn is None or row.settledOn <= on)
    ]
    return MarketValidation(
        settledToday=sorted(row.id for row in visible if row.settledOn == on),
        createdToday=sorted(row.id for row in visible if row.createdOn == on),
        stats=MarketValidationStats(
            cumulative=counts(visible),
            last20TradingDays=counts([row for row in visible if row.settledOn in recent]),
        ),
    )
