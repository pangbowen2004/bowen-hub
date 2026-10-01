"""透明温度与情绪九维；无证据的输入不伪装成零分。"""

from collections.abc import Sequence

from hub_contracts import (
    MarketIndex,
    MarketLimitEcology,
    MarketLossEffectInput,
    MarketOverview,
    MarketSentiment,
    MarketSentimentDimension,
    MarketTemperature,
    MarketTemperatureParts,
    MarketUpDownBalanceInput,
)


def clip(value: float) -> float:
    return max(0.0, min(1.0, value))


def temperature(
    market: MarketOverview, limits: MarketLimitEcology, indices: Sequence[MarketIndex]
) -> MarketTemperature:
    if len(indices) != 6:
        raise ValueError("温度必须提供六个真实指数")
    raw = {
        "breadth": market.advanceShare * 35,
        "trend": market.aboveMa20Share * 20,
        "limitEcology": limits.limitUpCount
        / max(1, limits.limitUpCount + limits.limitDownCount)
        * 15,
        "liquidity": clip((market.turnoverChange + 0.10) / 0.20) * 15,
        "positiveIndices": sum(row.return1d > 0 for row in indices) / 6 * 15,
    }
    return MarketTemperature(
        value=round(sum(raw.values()), 1),
        version="transparent-close-v1",
        parts=MarketTemperatureParts(**{key: round(value, 2) for key, value in raw.items()}),
        boundary="透明的收盘状态合成，不是概率、仓位或交易信号。",
    )


def sentiment(market: MarketOverview, limits: MarketLimitEcology) -> MarketSentiment:
    if (
        limits.sealRate is None
        or limits.advancementRate is None
        or limits.previousLimitPremium is None
        or market.turnoverMedian20Cny <= 0
    ):
        raise ValueError("情绪九维输入证据不足，不能将缺失输入替换为零")
    ratio = market.turnoverCny / market.turnoverMedian20Cny
    rows = [
        MarketSentimentDimension(
            key="limitHeight",
            label="连板高度",
            weight=15,
            input=limits.maxBoardHeight,
            unit="板",
            score=min(limits.maxBoardHeight / 7, 1) * 15,
            formula="min(最高连板 / 7, 1) × 15",
        ),
        MarketSentimentDimension(
            key="limitUpCount",
            label="涨停家数",
            weight=12,
            input=limits.limitUpCount,
            unit="家",
            score=min(limits.limitUpCount / 100, 1) * 12,
            formula="min(涨停家数 / 100, 1) × 12",
        ),
        MarketSentimentDimension(
            key="sealRate",
            label="封板成功率",
            weight=12,
            input=limits.sealRate,
            unit="比例",
            score=min(limits.sealRate / 0.85, 1) * 12,
            formula="min(封板率 / 0.85, 1) × 12",
        ),
        MarketSentimentDimension(
            key="advancementRate",
            label="前日晋级率",
            weight=12,
            input=limits.advancementRate,
            unit="比例",
            score=min(limits.advancementRate / 0.30, 1) * 12,
            formula="min(晋级率 / 0.30, 1) × 12",
        ),
        MarketSentimentDimension(
            key="previousLimitPremium",
            label="前日涨停溢价",
            weight=12,
            input=limits.previousLimitPremium,
            unit="收益率",
            score=clip((limits.previousLimitPremium + 0.02) / 0.05) * 12,
            formula="clip((溢价 + 0.02) / 0.05, 0, 1) × 12",
        ),
        MarketSentimentDimension(
            key="lossEffect",
            label="亏钱效应",
            weight=9,
            input=MarketLossEffectInput(
                limitDown=limits.limitDownCount, largeLoss=limits.largeLoss7Count
            ),
            unit="家",
            score=(1 - min(limits.limitDownCount / 10, 1)) * 4.5
            + (1 - min(limits.largeLoss7Count / 30, 1)) * 4.5,
            formula="(1 − min(跌停 / 10, 1)) × 4.5 + (1 − min(跌逾7% / 30, 1)) × 4.5",
        ),
        MarketSentimentDimension(
            key="breadth",
            label="上涨广度",
            weight=9,
            input=market.advanceShare,
            unit="比例",
            score=min(market.advanceShare / 0.6, 1) * 9,
            formula="min(advanceShare / 0.60, 1) × 9",
        ),
        MarketSentimentDimension(
            key="upDownBalance",
            label="涨跌停对比",
            weight=9,
            input=MarketUpDownBalanceInput(
                limitUp=limits.limitUpCount, limitDown=limits.limitDownCount
            ),
            unit="家",
            score=min(limits.limitUpCount / 80, 1) * 4.5
            + (1 - min(limits.limitDownCount / 8, 1)) * 4.5,
            formula="min(涨停 / 80, 1) × 4.5 + (1 − min(跌停 / 8, 1)) × 4.5",
        ),
        MarketSentimentDimension(
            key="turnover",
            label="市场量能",
            weight=10,
            input=ratio,
            unit="倍",
            score=clip((ratio - 0.7) / 0.5) * 10,
            formula="clip((倍数 − 0.70) / 0.50, 0, 1) × 10",
        ),
    ]
    total = round(sum(row.score for row in rows), 1)
    for row in rows:
        row.score = round(row.score, 2)
    return MarketSentiment(
        value=total,
        version="transparent-ecology-v2",
        dimensions=rows,
        boundary="状态合成，不是概率、仓位或交易信号。",
    )
