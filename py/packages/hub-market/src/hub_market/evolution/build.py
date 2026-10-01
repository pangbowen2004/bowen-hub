"""近五日演化纯函数，输入由调用者提供的最近五个交易日。"""

from collections.abc import Sequence
from statistics import median

from hub_contracts import (
    MarketDaySummary,
    MarketDirections,
    MarketEdgeChange,
    MarketEvolution,
    MarketEvolutionEdgeChanges,
    MarketEvolutionSignal,
    MarketEvolutionSignals,
    MarketEvolutionSummary,
    MarketLimitEcology,
    MarketTransmission,
    MarketTransmissionPart,
)
from hub_market.common.windows import appearances, five_sessions


def build(
    rows: Sequence[MarketDaySummary],
    *,
    directions: MarketDirections | None,
    ecology: MarketLimitEcology,
) -> MarketEvolution:
    ordered = five_sessions(rows)
    previous, current = ordered[-2:]
    turnover_median = median(row.turnoverCny for row in ordered)

    def change(value: float, up: str, down: str) -> MarketEdgeChange:
        return MarketEdgeChange(
            change=value, state=up if value > 0 else down if value < 0 else "持平"
        )

    turnover_delta = (
        current.turnoverCny / previous.turnoverCny - 1 if previous.turnoverCny > 0 else None
    )
    top = (
        sorted(directions.items, key=lambda row: (-row.return1d, row.name))[0]
        if directions and directions.items
        else None
    )
    clusters = sorted(
        ecology.industryClusters, key=lambda row: (-row.count, -row.maxBoardHeight, row.industry)
    )
    cluster_text = (
        f"{clusters[0].industry}涨停{clusters[0].count}家，最高{clusters[0].maxBoardHeight}板。"
        if clusters
        else "暂无行业涨停聚类。"
    )
    coverage = sum(row.directionsRelative is not None for row in ordered)
    return MarketEvolution(
        rows=ordered,
        edgeChanges=MarketEvolutionEdgeChanges(
            turnover=change(turnover_delta, "扩张", "收缩") if turnover_delta is not None else None,
            advanceShare=change(current.advanceShare - previous.advanceShare, "扩大", "收窄"),
            limitUpCount=change(current.limitUpCount - previous.limitUpCount, "扩张", "压缩"),
            maxBoard=change(current.maxBoard - previous.maxBoard, "抬升", "压缩"),
        ),
        summary=MarketEvolutionSummary(
            turnoverMedianCny=turnover_median,
            temperatureRange=[
                min(row.temperature for row in ordered),
                max(row.temperature for row in ordered),
            ],
            advanceShareRange=[
                min(row.advanceShare for row in ordered),
                max(row.advanceShare for row in ordered),
            ],
            directions=appearances(ordered, directions=True)[:6],
            industries=appearances(ordered, directions=False)[:6],
            directionCoverageDays=coverage,
            windowDays=5,
        ),
        transmission=MarketTransmission(
            liquidityBreadth=MarketTransmissionPart(
                name="量能与广度",
                text=f"成交额较前日{turnover_delta:+.1%}，上涨覆盖{current.advanceShare:.1%}，五日成交中位{turnover_median / 1e8:.1f}亿元。"
                if turnover_delta is not None
                else f"前日成交额为零，变化率无法计算；上涨覆盖{current.advanceShare:.1%}，五日成交中位{turnover_median / 1e8:.1f}亿元。",
            ),
            direction=MarketTransmissionPart(
                name="方向承接",
                text=f"{top.name}当日收益{top.return1d:+.2%}；方向数据覆盖{coverage}/5。",
            )
            if top
            else None,
            limitCluster=MarketTransmissionPart(name="涨停聚类", text=cluster_text),
            negativeFeedback=MarketTransmissionPart(
                name="负反馈",
                text=f"跌停{ecology.limitDownCount}家，晋级未完成展示{len(ecology.failedPromotions)}家（展示名单，非全市场总数）。",
            ),
        ),
        signals=MarketEvolutionSignals(
            liquidity=MarketEvolutionSignal(
                name="量能承接",
                currentState="乐观条件已满足"
                if current.turnoverCny >= turnover_median
                else "仍待确认",
                confirmation=f"成交维持或高于近五日中位 {turnover_median / 1e8:.1f}亿元",
                invalidation="放量冲高后快速回落，且低于五日中位",
            ),
            direction=MarketEvolutionSignal(
                name="方向延续",
                currentState=top.name,
                confirmation=f"{top.name}继续居前且内部上涨覆盖不收窄",
                invalidation="龙头断板、居前方向跌出前三且负反馈扩散",
            )
            if top
            else None,
            progression=MarketEvolutionSignal(
                name="前排晋级",
                currentState=f"{ecology.advancementRate:.1%}"
                if ecology.advancementRate is not None
                else "数据未就绪",
                confirmation="晋级率回升、最高板不压缩，炸板率下降",
                invalidation="晋级率继续下滑，最高板压缩且掉队增多",
            ),
            breadth=MarketEvolutionSignal(
                name="市场广度",
                currentState=f"上涨覆盖{current.advanceShare:.1%}",
                confirmation="上涨覆盖维持且中位数同步改善",
                invalidation="指数上涨但中位数、上涨覆盖明显回落",
            ),
        ),
    )
