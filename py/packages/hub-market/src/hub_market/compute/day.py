"""全指标纯计算与完整日文档组装，T22历史证据必须显式注入。"""

from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Literal

from hub_contracts import (
    Hypothesis,
    MarketDataStatus,
    MarketDay,
    MarketDaySummary,
    MarketDayWrite,
    MarketDirectionRelative,
    MarketDirections,
    MarketEtfGroups,
    MarketEvolution,
    MarketIndex,
    MarketIndustry,
    MarketLimitEcology,
    MarketMoneyflow,
    MarketOverview,
    MarketRankedReturn,
    MarketSegments,
    MarketSentiment,
    MarketStateSummary,
    MarketStocks,
    MarketStyle,
    MarketTechnical,
    MarketTemperature,
    MarketTheme,
    MarketValidation,
)
from hub_market.evolution.build import build as build_evolution
from hub_market.hypotheses.stats import validation as build_validation
from hub_market.summary.state import build as state_summary

from .aggregate import industries, overview, segments, style, themes
from .directions import directions, moneyflow
from .ecology import ecology, stocks
from .etf import etf_groups
from .indices import index, technical
from .input import ComputeInput
from .panel import panel
from .scores import sentiment, temperature


@dataclass(frozen=True)
class Computed:
    inputs: ComputeInput
    data_status: MarketDataStatus
    indices: list[MarketIndex]
    market: MarketOverview
    temperature: MarketTemperature
    sentiment: MarketSentiment
    style: MarketStyle
    limit_ecology: MarketLimitEcology
    moneyflow: MarketMoneyflow | None
    industries: list[MarketIndustry]
    themes: list[MarketTheme]
    directions: MarketDirections | None
    etf_groups: MarketEtfGroups | None
    segments: MarketSegments
    stocks: MarketStocks
    technical: MarketTechnical
    summary: MarketStateSummary


def compute(inputs: ComputeInput, templates: dict[str, Any]) -> Computed:
    stamp = inputs.on.strftime("%Y%m%d")
    current, history = panel(
        inputs.required("daily"),
        inputs.required("stk_limit"),
        inputs.required("daily_basic", stamp),
        inputs.required("stock_basic"),
        inputs.required("index_member_all"),
        inputs.on,
        inputs.previous,
    )
    market = overview(current, history, inputs.previous)
    detail = inputs.table("limit_list_d")
    limits = ecology(current, history, inputs.previous.strftime("%Y%m%d"), detail)
    indices = [
        index(inputs.required("index_daily", row["code"]), row["code"], row["name"], inputs.on)
        for row in inputs.indices
    ]
    heat = temperature(market, limits, indices)
    mood = sentiment(market, limits)
    industry = industries(current, market.turnoverCny, inputs.minimum_industry_samples)
    flows = inputs.table("moneyflow_dc", stamp)
    money = moneyflow(inputs.table("moneyflow_mkt_dc", stamp), flows)
    direction = directions(
        current,
        history,
        {
            key: frame
            for key, frame in inputs.tables.items()
            if key.split("/", 1)[0] not in inputs.missing_endpoints
        },
        inputs.directions,
        inputs.on,
        inputs.membership_as_of,
        flows,
    )
    shares = inputs.table("fund_share")
    etfs = etf_groups(
        inputs.table("fund_basic"),
        inputs.table("fund_daily"),
        shares,
        inputs.etf,
        inputs.on,
        inputs.previous,
    )
    missing: list[Literal["moneyflow", "limitDetail", "etfGroups", "etfShares", "directions"]] = []
    if money is None or flows is None:
        missing.append("moneyflow")
    if detail is None:
        missing.append("limitDetail")
    # 方向整块缺失，或个别板块当日没有官方日线（方向列表比配置的少）：都记入 missing。
    if direction is None or len(direction.items) < len(inputs.directions):
        missing.append("directions")
    if etfs is None:
        missing.append("etfGroups")
    elif shares is None:
        missing.append("etfShares")
    status = MarketDataStatus(complete=not missing, missing=missing)
    return Computed(
        inputs=inputs,
        data_status=status,
        indices=indices,
        market=market,
        temperature=heat,
        sentiment=mood,
        style=style(current),
        limit_ecology=limits,
        moneyflow=money,
        industries=industry,
        themes=themes(industry, inputs.themes),
        directions=direction,
        etf_groups=etfs,
        segments=segments(current),
        stocks=stocks(current, detail),
        technical=technical(inputs.required("index_daily", "000001.SH"), inputs.on, market),
        summary=state_summary(market, limits, heat, industry, direction, money, templates),
    )


def day_summary(computed: Computed) -> MarketDaySummary:
    c = computed
    return MarketDaySummary(
        date=c.inputs.on,
        headline=c.summary.headline,
        complete=c.data_status.complete,
        temperature=c.temperature.value,
        sentiment=c.sentiment.value,
        advanceShare=c.market.advanceShare,
        aboveMa20Share=c.market.aboveMa20Share,
        medianReturn1d=c.market.medianReturn1d,
        turnoverCny=c.market.turnoverCny,
        trendStrongShare=c.style.trendStrongShare,
        advanceCount=c.market.advanceCount,
        declineCount=c.market.declineCount,
        limitUpCount=c.limit_ecology.limitUpCount,
        limitDownCount=c.limit_ecology.limitDownCount,
        maxBoard=c.limit_ecology.maxBoardHeight,
        sealRate=c.limit_ecology.sealRate,
        topIndustries=[
            MarketRankedReturn(name=row.name, return1d=row.return1d) for row in c.industries[:3]
        ],
        topDirections=[
            MarketRankedReturn(name=row.name, return1d=row.return1d)
            for row in c.directions.items[:3]
        ]
        if c.directions
        else None,
        directionsRelative=[
            MarketDirectionRelative(name=row.name, relativeVsAllA=row.relativeVsAllA)
            for row in c.directions.items
        ]
        if c.directions
        else None,
    )


def assemble(
    computed: Computed,
    *,
    generated_at: datetime,
    evolution: MarketEvolution,
    validation: MarketValidation,
) -> MarketDayWrite:
    c = computed
    if evolution.rows[-1].date != c.inputs.on or evolution.rows[-1] != day_summary(c):
        raise ValueError("演化最后一日必须等于本次真实计算摘要")
    return MarketDayWrite(
        day=MarketDay(
            schemaVersion=1,
            date=c.inputs.on,
            previousDate=c.inputs.previous,
            generatedAt=generated_at,
            dataStatus=c.data_status,
            indices=c.indices,
            market=c.market,
            temperature=c.temperature,
            sentiment=c.sentiment,
            style=c.style,
            limitEcology=c.limit_ecology,
            moneyflow=c.moneyflow,
            industries=c.industries,
            themes=c.themes,
            directions=c.directions,
            etfGroups=c.etf_groups,
            segments=c.segments,
            stocks=c.stocks,
            technical=c.technical,
            summary=c.summary,
            evolution=evolution,
            validation=validation,
        ),
        summary=day_summary(c),
    )


def complete_day(
    computed: Computed,
    *,
    generated_at: datetime,
    previous_summaries: list[MarketDaySummary],
    settled_hypotheses: list[Hypothesis],
    recent_sessions: list[date],
) -> MarketDayWrite:
    """T22结算后的真实账本与前四日摘要融合；不生成或伪造历史证据。"""
    expected = sorted({session for session in recent_sessions if session <= computed.inputs.on})[
        -5:
    ]
    rows = sorted([*previous_summaries, day_summary(computed)], key=lambda row: row.date)
    if len(expected) != 5 or [row.date for row in rows] != expected:
        raise ValueError("演化必须是交易日历规定的真实最近五日摘要")
    return assemble(
        computed,
        generated_at=generated_at,
        evolution=build_evolution(
            rows, directions=computed.directions, ecology=computed.limit_ecology
        ),
        validation=build_validation(settled_hypotheses, computed.inputs.on, recent_sessions),
    )
