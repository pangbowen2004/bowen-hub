"""按保存的规则生成、结算假设；不读取网络或重新推导旧阈值。"""

from collections.abc import Mapping, Sequence
from datetime import date
from math import floor
from typing import Any, Literal

from hub_contracts import Hypothesis, MarketDay

Mode = Literal["realtime", "backfill"]
Result = Literal["CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE"]


def generate(day: MarketDay, due_on: date, mode: Mode = "realtime") -> list[Hypothesis]:
    if due_on <= day.date:
        raise ValueError("到期日必须晚于生成日")
    market, ecology = day.market, day.limitEcology
    result: list[Hypothesis] = []

    def add(
        slug: str,
        title: str,
        scope: str,
        rule: dict[str, Any],
        confirmation: str,
        invalidation: str,
        risk: str,
        counter: str,
    ) -> None:
        result.append(
            Hypothesis.model_validate(
                {
                    "id": f"HYP-{day.date:%Y%m%d}-{slug}",
                    "createdOn": day.date,
                    "dueOn": due_on,
                    "mode": mode,
                    "engineVersion": "daily-hypothesis-v1",
                    "title": title,
                    "scope": scope,
                    "rule": rule,
                    "confirmation": confirmation,
                    "invalidation": invalidation,
                    "risk": risk,
                    "counterEvidence": counter,
                    "result": "PENDING",
                    "settledOn": None,
                    "actual": None,
                    "resultNote": f"等待 {due_on} 收盘结算。",
                }
            )
        )

    ma_min = max(0.60, market.aboveMa20Share - 0.10)
    add(
        "MARKET-PERSISTENCE",
        "广度、趋势存量与量能能否共同延续",
        "market",
        {
            "type": "MARKET_PERSISTENCE",
            "thresholds": {
                "advanceShareMin": 0.50,
                "aboveMa20ShareMin": ma_min,
                "turnoverCnyMin": market.turnoverCny * 0.90,
                "advanceShareInvalid": 0.40,
                "turnoverRatioInvalid": 0.85,
                "aboveMa20DropInvalid": 0.08,
            },
            "baseline": {
                "turnoverCny": market.turnoverCny,
                "aboveMa20Share": market.aboveMa20Share,
            },
        },
        f"上涨覆盖不低于50%，MA20上方比例不低于{ma_min:.1%}，且成交额不低于当日的90%。",
        "上涨覆盖低于40%，或成交额收缩超过15%且MA20上方比例同步下降。",
        "强扩散后的自然均值回归可能造成单日回落，确认规则只描述次日延续，不外推中期趋势。",
        f"生成日上涨覆盖{market.advanceShare:.1%}、MA20上方{market.aboveMa20Share:.1%}，高基数提高了延续难度。",
    )

    if ecology.sealRate is not None:
        seal_min = max(0.75, ecology.sealRate - 0.08)
        multi_min = max(5, floor(ecology.multiBoardCount * 0.70 + 0.5))
        down_max = max(3, ecology.limitDownCount + 2)
        add(
            "LIMIT-ECOLOGY",
            "封板质量、晋级梯队与负反馈能否保持协调",
            "market",
            {
                "type": "LIMIT_ECOLOGY",
                "thresholds": {
                    "sealRateMin": seal_min,
                    "multiBoardMin": multi_min,
                    "limitDownMax": down_max,
                    "sealRateInvalid": 0.65,
                    "multiBoardInvalid": max(2, floor(ecology.multiBoardCount * 0.50 + 0.5)),
                    "limitDownInvalid": ecology.limitDownCount + 3,
                },
                "baseline": {
                    "sealRate": ecology.sealRate,
                    "multiBoardCount": ecology.multiBoardCount,
                    "limitDownCount": ecology.limitDownCount,
                },
            },
            f"封板率不低于{seal_min:.1%}、多板梯队不少于{multi_min}家、跌停不超过{down_max}家。",
            "封板率低于65%，或多板梯队缩减过半且跌停家数明显增加。",
            "不同交易板与ST状态涨跌幅制度不同，必须沿用逐股涨跌停价口径。",
            f"生成日封板率{ecology.sealRate:.1%}、多板{ecology.multiBoardCount}家、跌停{ecology.limitDownCount}家；强基数可能快速回落。",
        )
    # 无封板率时不能保存虚构基线；由调用者明确报告缺项。
    if day.directions is None or not day.directions.items:
        return result
    directions = sorted(day.directions.items, key=lambda row: (-row.return1d, row.name))
    top, bottom = directions[0], directions[-1]
    membership_date = day.directions.membershipAsOf
    top_min = max(0.55, top.advanceShare * 0.70)
    top_baseline: dict[str, Any] = {
        "membershipAsOf": membership_date,
        "return1d": top.return1d,
        "advanceShare": top.advanceShare,
        "amountShare": top.amountShare,
    }
    if top.memberCodes is not None:
        top_baseline["memberCodes"] = sorted(set(top.memberCodes))
    add(
        "TOP-DIRECTION",
        f"{top.name}居前能否转化为内部扩散延续",
        "direction",
        {
            "type": "DIRECTION_PERSISTENCE",
            "entity": top.name,
            "thresholds": {
                "relativeMin": 0.0,
                "advanceShareMin": top_min,
                "amountShareMin": top.amountShare * 0.75,
                "advanceShareInvalid": 0.45,
            },
            "baseline": top_baseline,
        },
        f"{top.name}继续取得正相对全A收益、上涨覆盖不低于{top_min:.1%}，成交占比不低于生成日的75%。",
        f"{top.name}相对收益转负且上涨覆盖低于45%，或方向中位收益转负。",
        "同花顺方向成员是当前快照，不是点时历史；次日若成员发生变化，结算质量必须降级为证据不足。",
        f"生成日单日收益{top.return1d:+.2%}、相对全A{top.relativeVsAllA:+.2%}，短期拥挤与分化风险上升。",
    )
    add(
        "WEAK-DIRECTION",
        f"{bottom.name}相对弱势能否收敛",
        "direction",
        {
            "type": "DIRECTION_REPAIR",
            "entity": bottom.name,
            "thresholds": {
                "relativeMin": -0.005,
                "advanceShareMin": 0.45,
                "medianReturnMin": 0.0,
                "relativeInvalidMax": min(-0.01, bottom.relativeVsAllA),
                "advanceShareInvalid": 0.35,
            },
            "baseline": {
                "membershipAsOf": membership_date,
                "relativeVsAllA": bottom.relativeVsAllA,
                "advanceShare": bottom.advanceShare,
            },
        },
        f"{bottom.name}相对全A落后幅度收窄至0.5个百分点以内，上涨覆盖回到45%以上，且方向中位收益不再为负。",
        f"{bottom.name}继续取得负相对收益且上涨覆盖低于35%，弱势扩散到方向中位数。",
        "低位方向可能仅受风格轮换扰动；单日收敛不等于中期修复。",
        f"生成日收益{bottom.return1d:+.2%}、相对全A{bottom.relativeVsAllA:+.2%}、上涨覆盖{bottom.advanceShare:.1%}。",
    )
    spread = top.relativeVsAllA - bottom.relativeVsAllA
    if spread >= 0.03:
        add(
            "DIRECTION-SPREAD",
            "方向高低剪刀差是收敛还是继续扩大",
            "direction",
            {
                "type": "DIRECTION_SPREAD",
                "entities": [top.name, bottom.name],
                "thresholds": {
                    "spreadMax": spread * 0.75,
                    "spreadInvalidMin": spread,
                    "weakAdvanceBaseline": bottom.advanceShare,
                },
                "baseline": {
                    "spread": spread,
                    "strongMembershipAsOf": membership_date,
                    "weakMembershipAsOf": membership_date,
                },
            },
            f"最强与最弱方向的相对收益差由{spread:.1%}收敛至少25%，同时弱方向上涨覆盖改善。",
            "剪刀差不降反升，且弱方向上涨覆盖继续下降。",
            "剪刀差收敛可能来自强方向回落，也可能来自弱方向修复，必须分解两端贡献。",
            f"生成日最强{top.name}与最弱{bottom.name}相对收益差为{spread:.1%}。",
        )
    return result


def _resolved(
    hypothesis: Hypothesis, on: date, result: Result, actual: dict[str, Any] | None, note: str
) -> Hypothesis:
    return Hypothesis.model_validate(
        {
            # 只带回原来设置过的字段：可选字段（如 memberCodes、engineVersion）没有就保持缺失，
            # 不能变成显式 null，否则 API 的可选（非可空）校验会拒绝整批写入。
            **hypothesis.model_dump(exclude_unset=True),
            "result": result,
            "settledOn": on,
            "actual": actual,
            "resultNote": note,
        }
    )


def _actual_text(actual: dict[str, Any]) -> str:
    values: list[str] = []
    for key, value in actual.items():
        if key == "memberCodes":
            continue
        if isinstance(value, date):
            text = str(value)
        elif key == "turnoverCny":
            text = f"{float(value) / 1e8:.1f}亿元"
        elif key == "spread":
            text = f"{float(value) * 100:.1f}个百分点"
        elif key.endswith("Count"):
            text = str(int(value))
        else:
            text = f"{float(value):.1%}"
        values.append(f"{key}={text}")
    return "、".join(values)


def settle(
    hypothesis: Hypothesis,
    day: MarketDay | None,
    on: date,
    *,
    sessions_after_due: int = 0,
    pending_max_sessions: int = 3,
    baseline_members: Mapping[str, Sequence[str]] | None = None,
) -> Hypothesis:
    """on为本次结算日期，day必须是dueOn快照；迟到补跑不能拿后来行情代替。

    baseline_members只允许调用者传入生成日已存MarketDay的完整来源成员；不能用行情覆盖子集。
    """
    if hypothesis.result != "PENDING" or on < hypothesis.dueOn:
        return hypothesis
    if sessions_after_due < 0 or pending_max_sessions < 0:
        raise ValueError("交易日计数不能为负")
    rule = hypothesis.rule
    if rule is None:
        return _resolved(hypothesis, on, "INCONCLUSIVE", None, "手写假设无可复算规则")
    if (
        day is None
        or day.date != hypothesis.dueOn
        or (rule.type.startswith("DIRECTION_") and day.directions is None)
        or (rule.type == "LIMIT_ECOLOGY" and day.limitEcology.sealRate is None)
    ):
        if sessions_after_due > pending_max_sessions:
            return _resolved(hypothesis, on, "INCONCLUSIVE", None, "数据缺失")
        return hypothesis
    actual: dict[str, Any]
    confirmed: bool
    invalidated: bool
    if rule.type == "MARKET_PERSISTENCE":
        m, t, b = day.market, rule.thresholds, rule.baseline
        actual = {
            "advanceShare": m.advanceShare,
            "aboveMa20Share": m.aboveMa20Share,
            "turnoverCny": m.turnoverCny,
        }
        confirmed = (
            m.advanceShare >= t.advanceShareMin
            and m.aboveMa20Share >= t.aboveMa20ShareMin
            and m.turnoverCny >= t.turnoverCnyMin
        )
        invalidated = m.advanceShare < t.advanceShareInvalid or (
            m.turnoverCny < b.turnoverCny * t.turnoverRatioInvalid
            and m.aboveMa20Share < b.aboveMa20Share - t.aboveMa20DropInvalid
        )
    elif rule.type == "LIMIT_ECOLOGY":
        e, t = day.limitEcology, rule.thresholds
        assert e.sealRate is not None
        actual = {
            "sealRate": e.sealRate,
            "multiBoardCount": e.multiBoardCount,
            "limitDownCount": e.limitDownCount,
        }
        confirmed = (
            e.sealRate >= t.sealRateMin
            and e.multiBoardCount >= t.multiBoardMin
            and e.limitDownCount <= t.limitDownMax
        )
        invalidated = e.sealRate < t.sealRateInvalid or (
            e.multiBoardCount < t.multiBoardInvalid and e.limitDownCount > t.limitDownInvalid
        )
    else:
        assert day.directions is not None
        indexed = {row.name: row for row in day.directions.items}
        names = rule.entities if rule.type == "DIRECTION_SPREAD" else [rule.entity]
        if any(name not in indexed for name in names):
            return _resolved(hypothesis, on, "INCONCLUSIVE", None, "到期快照缺少该方向")
        for name in names:
            current_codes = indexed[name].memberCodes
            saved_codes = (
                rule.baseline.memberCodes if rule.type == "DIRECTION_PERSISTENCE" else None
            )
            if saved_codes is None and baseline_members is not None:
                saved_codes = list(baseline_members[name]) if name in baseline_members else None
            if saved_codes is None or current_codes is None:
                return _resolved(
                    hypothesis, on, "INCONCLUSIVE", None, "无法核实生成日与到期日的完整方向成员"
                )
            if set(saved_codes) != set(current_codes):
                return _resolved(hypothesis, on, "INCONCLUSIVE", None, "方向成员发生变化")
        if rule.type == "DIRECTION_SPREAD":
            strong, weak = indexed[names[0]], indexed[names[1]]
            t = rule.thresholds
            spread = strong.relativeVsAllA - weak.relativeVsAllA
            actual = {
                "spread": spread,
                "strongRelative": strong.relativeVsAllA,
                "weakRelative": weak.relativeVsAllA,
                "weakAdvanceShare": weak.advanceShare,
            }
            confirmed = spread <= t.spreadMax and weak.advanceShare > t.weakAdvanceBaseline
            invalidated = (
                spread >= t.spreadInvalidMin and weak.advanceShare <= t.weakAdvanceBaseline
            )
        else:
            d, t = indexed[rule.entity], rule.thresholds
            actual = {
                "relativeVsAllA": d.relativeVsAllA,
                "advanceShare": d.advanceShare,
                "medianReturn1d": d.medianReturn1d,
                "amountShare": d.amountShare,
                "membershipAsOf": day.directions.membershipAsOf,
            }
            if rule.type == "DIRECTION_PERSISTENCE":
                t = rule.thresholds
                actual["memberCodes"] = d.memberCodes
                confirmed = (
                    d.relativeVsAllA > t.relativeMin
                    and d.advanceShare >= t.advanceShareMin
                    and d.amountShare >= t.amountShareMin
                    and d.medianReturn1d >= 0
                )
                invalidated = (
                    d.relativeVsAllA < t.relativeMin and d.advanceShare < t.advanceShareInvalid
                )
            else:
                t = rule.thresholds
                confirmed = (
                    d.relativeVsAllA >= t.relativeMin
                    and d.advanceShare >= t.advanceShareMin
                    and d.medianReturn1d >= t.medianReturnMin
                )
                invalidated = (
                    d.relativeVsAllA <= t.relativeInvalidMax
                    and d.advanceShare < t.advanceShareInvalid
                )
    result: Result = (
        "CONFIRMED" if confirmed else "NOT_CONFIRMED" if invalidated else "INCONCLUSIVE"
    )
    return _resolved(
        hypothesis,
        on,
        result,
        actual,
        f"规则{rule.type}按{hypothesis.dueOn}收盘结算为{result}；实际：{_actual_text(actual)}",
    )


def merge_pending(
    existing: Sequence[Hypothesis], generated: Sequence[Hypothesis]
) -> list[Hypothesis]:
    """重跑只能覆盖PENDING，不改写既有研究结果。"""
    merged = {row.id: row for row in existing}
    for row in generated:
        if row.id not in merged or merged[row.id].result == "PENDING":
            merged[row.id] = row
    return sorted(merged.values(), key=lambda row: (row.createdOn, row.id))
