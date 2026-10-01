# 由 contracts 生成，勿手改（mise run gen）

from pydantic import AwareDatetime, BaseModel, Field, RootModel
from datetime import date as date_aliased
from typing import Annotated, Any, Literal


class AiCall(BaseModel):
    """
    一次 AI 能力调用的记录（ai_calls 表，docs/09 第 3 节；运行时在 docs/10 第 5 节第 7 步回调写入）
    """

    capability: str
    """
    能力 ID，如 news.ticker_digest
    """
    version: int
    """
    能力清单的 version
    """
    model: str
    """
    实际调用的模型（供应商/模型），如 openai/gpt-6-luna
    """
    inputTokens: int
    """
    输入 token 数
    """
    outputTokens: int
    """
    输出 token 数
    """
    costUsd: float
    """
    费用（美元），按 config/llm.yaml 的单价计算
    """
    durationMs: int
    """
    耗时（毫秒）
    """
    ok: bool
    """
    是否成功
    """
    runId: str | None
    """
    所属运行（Run.id）；API 里的按需调用（如控制台问论文）没有运行记录，为 null
    """
    at: AwareDatetime
    """
    调用时间（按天统计用量要用）
    """


class AiUsageCapability(BaseModel):
    """
    某个能力的用量
    """

    capability: str
    """
    能力 ID
    """
    calls: int
    """
    调用次数
    """
    failedCalls: int
    """
    其中失败的次数
    """
    inputTokens: int
    """
    输入 token 合计
    """
    outputTokens: int
    """
    输出 token 合计
    """
    costUsd: float
    """
    费用合计（美元）
    """


class AiUsageDay(BaseModel):
    """
    某一天的用量
    """

    date: date_aliased
    calls: int
    """
    调用次数
    """
    failedCalls: int
    """
    其中失败的次数
    """
    inputTokens: int
    """
    输入 token 合计
    """
    outputTokens: int
    """
    输出 token 合计
    """
    costUsd: float
    """
    费用合计（美元）
    """


class AiUsageStats(BaseModel):
    """
    一组 AI 调用的合计
    """

    calls: int
    """
    调用次数
    """
    failedCalls: int
    """
    其中失败的次数
    """
    inputTokens: int
    """
    输入 token 合计
    """
    outputTokens: int
    """
    输出 token 合计
    """
    costUsd: float
    """
    费用合计（美元）
    """


class AiUsageSummary(BaseModel):
    """
    GET /v1/ai/usage?days 的用量汇总（ai_calls 表的 SQL 聚合）。
    控制台“运维”页显示用量与费用并对比月度预算，“今日”页显示本月 AI 费用（docs/05 第 6 节）。
    """

    days: int
    """
    统计窗口：最近多少天（含今天）
    """
    total: AiUsageStats
    """
    窗口内的合计
    """
    byDay: list[AiUsageDay]
    """
    按 Asia/Singapore（UTC+8）日期统计（日期升序；没有调用的日子不出现）
    """
    byCapability: list[AiUsageCapability]
    """
    按能力
    """
    monthCostUsd: float
    """
    按 Asia/Singapore（UTC+8）月份统计的本月累计费用（美元），与窗口无关
    """
    monthlyBudgetUsd: float
    """
    月度预算（美元，config/llm.yaml 的 monthlyBudgetUsd）
    """


class CalendarEvent(BaseModel):
    kind: Literal["macro", "earnings", "fomc"]
    date: date_aliased
    fredReleaseId: int | None
    at: AwareDatetime | None
    title: str
    tickers: list[str]
    timing: str | None
    importance: str


class CapabilityIo(BaseModel):
    """
    能力的输入输出模型名（contracts/capabilities.tsp 里的模型）
    """

    input: str
    output: str


class CapabilityLimits(BaseModel):
    """
    能力的调用上限
    """

    maxInputTokens: int
    maxOutputTokens: int
    timeoutSec: int


class DirectionPersistenceActual(BaseModel):
    """
    DirectionPersistenceActual：市场观测台数据。
    """

    relativeVsAllA: float
    advanceShare: float
    medianReturn1d: float
    amountShare: float
    membershipAsOf: date_aliased


class DirectionPersistenceBaseline(BaseModel):
    """
    DirectionPersistenceBaseline：市场观测台数据。
    """

    membershipAsOf: date_aliased
    return1d: float
    advanceShare: float
    amountShare: float


class DirectionPersistenceThresholds(BaseModel):
    """
    DirectionPersistenceThresholds：市场观测台数据。
    """

    relativeMin: float
    advanceShareMin: float
    amountShareMin: float
    advanceShareInvalid: float


class DirectionRepairActual(BaseModel):
    """
    DirectionRepairActual：市场观测台数据。
    """

    relativeVsAllA: float
    advanceShare: float
    medianReturn1d: float
    amountShare: float
    membershipAsOf: date_aliased


class DirectionRepairBaseline(BaseModel):
    """
    DirectionRepairBaseline：市场观测台数据。
    """

    membershipAsOf: date_aliased
    relativeVsAllA: float
    advanceShare: float


class DirectionRepairThresholds(BaseModel):
    """
    DirectionRepairThresholds：市场观测台数据。
    """

    relativeMin: float
    advanceShareMin: float
    medianReturnMin: float
    relativeInvalidMax: float
    advanceShareInvalid: float


class DirectionSpreadActual(BaseModel):
    """
    DirectionSpreadActual：市场观测台数据。
    """

    spread: float
    strongRelative: float
    weakRelative: float
    weakAdvanceShare: float


class DirectionSpreadBaseline(BaseModel):
    """
    DirectionSpreadBaseline：市场观测台数据。
    """

    spread: float
    strongMembershipAsOf: date_aliased
    weakMembershipAsOf: date_aliased


class DirectionSpreadThresholds(BaseModel):
    """
    DirectionSpreadThresholds：市场观测台数据。
    """

    spreadMax: float
    spreadInvalidMin: float
    weakAdvanceBaseline: float


class EarningsCardInput(BaseModel):
    symbol: str
    name: str
    sourceKind: Literal["press_release", "news"]
    sourceUrl: str
    sourceText: str


class EarningsFigure(BaseModel):
    name: str
    value: str
    yoy: str | None
    basis: Literal["gaap", "adjusted", "other"]
    quote: str


class EarningsGuidance(BaseModel):
    text: str
    quote: str


class EditionAiUsage(BaseModel):
    inputTokens: int
    outputTokens: int
    costUsd: float


class EditionEmail(BaseModel):
    sentAt: AwareDatetime | None


class EditionFeedback(BaseModel):
    kind: Literal["edition"]
    id: str
    createdAt: AwareDatetime
    editionId: str
    score: Annotated[int, Field(ge=1, le=5)]


class EditionFeedbackRequest(BaseModel):
    score: Annotated[int, Field(ge=1, le=5)]


class EditionLedeFact(BaseModel):
    """
    已整理的事实文本，数字用显示口径字符串，避免向提示词传浮点收益率。
    """

    id: str
    text: str


class EditionLedeInput(BaseModel):
    mode: Literal["morning", "premarket", "weekly"]
    date: date_aliased
    facts: list[EditionLedeFact]


class EditionSummary(BaseModel):
    id: str
    kind: Literal["morning", "premarket", "weekly", "legacy"]
    date: date_aliased
    generatedAt: AwareDatetime | None


class EditionWindow(BaseModel):
    fromAt: AwareDatetime | None
    toAt: AwareDatetime | None


class EvalResult(BaseModel):
    """
    一个能力的一次评测结果（eval_results 表，docs/09 第 3 节、docs/10 第 7 节）
    """

    capability: str
    """
    能力 ID
    """
    model: str
    """
    被评测的模型（供应商/模型）
    """
    datasetVersion: str
    """
    评测集版本
    """
    scores: dict[str, Any]
    """
    各评分器的得分（评分器名 → 0–1），如 schema_valid、judge_faithful
    """
    passed: bool
    """
    是否达到清单里的全部阈值
    """
    at: AwareDatetime
    """
    评测时间
    """
    costUsd: float | None = None
    """
    这次评测的费用（美元）（运维页显示费用，docs/10 第 7.3 节）
    """
    durationMs: int | None = None
    """
    这次评测的耗时（毫秒）（运维页显示耗时，docs/10 第 7.3 节）
    """


class FilingDigestInput(BaseModel):
    symbol: str
    name: str
    form: str
    items: list[str]
    text: str


class FilingExhibit(BaseModel):
    name: str
    url: str


class GeneratedBy(BaseModel):
    """
    AI 生成内容的出处（docs/08 第 4 节；运行时在 docs/10 第 5 节第 6 步盖上）
    """

    capability: str
    """
    能力 ID，如 news.ticker_digest
    """
    version: int
    """
    能力清单的 version
    """
    model: str
    """
    实际调用的模型（供应商/模型），如 openai/gpt-6-luna
    """
    at: AwareDatetime
    """
    生成时间
    """


class Health(BaseModel):
    """
    GET /v1/health 的返回
    """

    status: Literal["ok"]
    """
    API 在线时为 ok
    """


class IndexBar(BaseModel):
    """
    IndexBar：市场观测台数据。
    """

    date: date_aliased
    open: float
    high: float
    low: float
    close: float
    preClose: float
    return1d: float
    amountCny: float


class InsiderTrade(BaseModel):
    accession: str
    transactionIndex: int
    ticker: str
    insider: str
    role: str
    code: str
    shares: float
    priceUsd: float | None
    valueUsd: float | None
    filedAt: AwareDatetime
    url: str


class ItemFeedback(BaseModel):
    kind: Literal["item"]
    id: str
    createdAt: AwareDatetime
    editionId: str
    itemId: str
    reason: Literal["useless", "incorrect"]


class ItemFeedbackRequest(BaseModel):
    editionId: str
    itemId: str
    reason: Literal["useless", "incorrect"]


class LimitEcologyActual(BaseModel):
    """
    LimitEcologyActual：市场观测台数据。
    """

    sealRate: float
    multiBoardCount: int
    limitDownCount: int


class LimitEcologyBaseline(BaseModel):
    """
    LimitEcologyBaseline：市场观测台数据。
    """

    sealRate: float
    multiBoardCount: int
    limitDownCount: int


class LimitEcologyThresholds(BaseModel):
    """
    LimitEcologyThresholds：市场观测台数据。
    """

    sealRateMin: float
    multiBoardMin: int
    limitDownMax: int
    sealRateInvalid: float
    multiBoardInvalid: int
    limitDownInvalid: int


class MarketAppearance(BaseModel):
    """
    MarketAppearance：市场观测台数据。
    """

    name: str
    top3Appearances: int


class MarketBoardSegment(BaseModel):
    """
    MarketBoardSegment：市场观测台数据。
    """

    name: str
    sampleCount: int
    return1d: float
    advanceShare: float
    aboveMa20Share: float
    turnoverRateMedian: float | None
    """
    换手率为0–1小数。
    """


class MarketCapSegment(BaseModel):
    """
    MarketCapSegment：市场观测台数据。
    """

    name: str
    sampleCount: int
    return1d: float
    advanceShare: float
    medianMarketCapCny: float


class MarketComponentCrossCheck(BaseModel):
    """
    MarketComponentCrossCheck：市场观测台数据。
    """

    return1d: float | None
    return5d: float | None
    return20d: float | None
    delta1dVsOfficial: float | None


class MarketDataStatus(BaseModel):
    """
    MarketDataStatus：市场观测台数据。
    """

    complete: bool
    missing: list[Literal["moneyflow", "limitDetail", "etfGroups", "etfShares", "directions"]]


class MoneyflowCoverage(RootModel[float]):
    root: Annotated[float, Field(ge=0.0, le=1.0)]
    """
    有资金流数据的成员数 / memberCount；无法核实股数时为空。
    """


class MoneyflowCoverage1(RootModel[None]):
    root: None
    """
    有资金流数据的成员数 / memberCount；无法核实股数时为空。
    """


class MarketDirectionLaggard(BaseModel):
    """
    MarketDirectionLaggard：市场观测台数据。
    """

    code: str
    name: str
    return1d: float


class MarketDirectionLeader(BaseModel):
    """
    MarketDirectionLeader：市场观测台数据。
    """

    code: str
    name: str
    return1d: float
    amountCny: float


class MarketDirectionRelative(BaseModel):
    """
    MarketDirectionRelative：市场观测台数据。
    """

    name: str
    relativeVsAllA: float


class MarketEdgeChange(BaseModel):
    """
    MarketEdgeChange：市场观测台数据。
    """

    change: float
    state: str


class MarketEtfRepresentative(BaseModel):
    """
    MarketEtfRepresentative：市场观测台数据。
    """

    code: str
    name: str
    return1d: float
    amountCny: float
    shareDelta: float | None


class MarketEvent(BaseModel):
    """
    MarketEvent：市场观测台数据。
    """

    id: str
    title: str
    sourceLabel: str
    sourceUrl: str | None
    confirmation: str
    invalidation: str
    startDate: date_aliased
    endDate: date_aliased
    status: Literal["confirmed", "pending"]
    watchItems: list[str]
    aShareMappings: list[str]


class MarketEvolutionEdgeChanges(BaseModel):
    """
    MarketEvolutionEdgeChanges：市场观测台数据。
    """

    turnover: MarketEdgeChange | None
    advanceShare: MarketEdgeChange | None
    limitUpCount: MarketEdgeChange | None
    maxBoard: MarketEdgeChange | None


class MarketEvolutionSignal(BaseModel):
    """
    MarketEvolutionSignal：市场观测台数据。
    """

    name: str
    currentState: str
    confirmation: str
    invalidation: str


class MarketEvolutionSignals(BaseModel):
    """
    MarketEvolutionSignals：市场观测台数据。
    """

    liquidity: MarketEvolutionSignal
    direction: MarketEvolutionSignal | None
    progression: MarketEvolutionSignal
    breadth: MarketEvolutionSignal


class MarketEvolutionSummary(BaseModel):
    """
    MarketEvolutionSummary：市场观测台数据。
    """

    turnoverMedianCny: float
    temperatureRange: list[float]
    advanceShareRange: list[float]
    directions: list[MarketAppearance]
    industries: list[MarketAppearance]
    directionCoverageDays: Annotated[int, Field(ge=0, le=5)]
    """
    有方向数据的交易日数量，页面显示覆盖 n/5。
    """
    windowDays: Literal[5]


class MarketHeightDistribution(BaseModel):
    """
    MarketHeightDistribution：市场观测台数据。
    """

    height: int
    count: int
    names: list[str]


class MarketIndex(BaseModel):
    """
    MarketIndex：市场观测台数据。
    """

    code: str
    name: str
    close: float
    return1d: float
    amountCny: float


class MarketIndustry(BaseModel):
    """
    MarketIndustry：市场观测台数据。
    """

    name: str
    sampleCount: int
    return1d: float
    medianReturn1d: float
    advanceShare: float
    aboveMa20Share: float
    amountCny: float
    amountShare: float
    return5d: float | None
    return20d: float | None
    medianPeTtm: float | None
    medianPb: float | None
    limitUpCount: int
    limitDownCount: int
    lifecycle: Literal["趋势扩散", "高位分歧", "修复延续", "退潮观察", "低位修复", "方向待明"]


class MarketIndustryCluster(BaseModel):
    """
    MarketIndustryCluster：市场观测台数据。
    """

    industry: str
    count: int
    maxBoardHeight: int
    names: list[str]


class MarketLimitDetail(BaseModel):
    """
    MarketLimitDetail：市场观测台数据。
    """

    type: Literal["U", "D", "Z"]
    firstTime: str | None
    lastTime: str | None
    upStat: str | None
    openTimes: int | None
    limitTimes: int | None
    sealedAmountCny: float | None


class MarketLossEffectInput(BaseModel):
    """
    MarketSentimentDimension：市场观测台数据。
    """

    limitDown: int
    largeLoss: int


class MarketMoneyflow(BaseModel):
    """
    MarketMoneyflow：市场观测台数据。
    """

    marketNetCny: float
    marketNetRate: float
    extraLargeNetCny: float
    largeNetCny: float
    mediumNetCny: float
    smallNetCny: float
    stockCoverageCount: int | None
    classificationBoundary: str


class MarketOverview(BaseModel):
    """
    MarketOverview：市场观测台数据。
    """

    sampleCount: int
    advanceCount: int
    declineCount: int
    flatCount: int
    newHigh20Count: int
    newLow20Count: int
    advanceShare: float
    medianReturn1d: float
    aboveMa20Share: float
    turnoverCny: float
    turnoverPrevCny: float
    turnoverChange: float
    turnoverMedian20Cny: float
    totalMarketCapCny: float
    medianTurnoverRate: float | None
    """
    换手率为0–1小数，旧数据百分数除以100。
    """
    medianPeTtm: float | None
    medianPb: float | None


class MarketPersistenceActual(BaseModel):
    """
    MarketPersistenceActual：市场观测台数据。
    """

    advanceShare: float
    aboveMa20Share: float
    turnoverCny: float


class MarketPersistenceBaseline(BaseModel):
    """
    MarketPersistenceBaseline：市场观测台数据。
    """

    turnoverCny: float
    aboveMa20Share: float


class MarketPersistenceThresholds(BaseModel):
    """
    MarketPersistenceThresholds：市场观测台数据。
    """

    advanceShareMin: float
    aboveMa20ShareMin: float
    turnoverCnyMin: float
    advanceShareInvalid: float
    turnoverRatioInvalid: float
    aboveMa20DropInvalid: float


class MarketProviderDetail(BaseModel):
    """
    MarketProviderDetail：市场观测台数据。
    """

    rowCount: int
    limitUpCount: int
    limitDownCount: int
    openedOrTouchedNotClosedCount: int
    classification: str


class MarketQuestion(BaseModel):
    """
    MarketQuestion：市场观测台数据。
    """

    title: str
    text: str


class MarketRankedReturn(BaseModel):
    """
    MarketRankedReturn：市场观测台数据。
    """

    name: str
    return1d: float


class MarketReferenceDirection(BaseModel):
    """
    MarketReferenceDirection：市场观测台数据。
    """

    name: str
    code: str
    sourceName: str
    mappingNote: str


class MarketReferenceEtfGroup(BaseModel):
    """
    MarketReferenceEtfGroup：市场观测台数据。
    """

    name: str
    pattern: str


class MarketReferenceIndex(BaseModel):
    """
    MarketReferenceIndex：市场观测台数据。
    """

    name: str
    code: str
    technical: bool | None = None


class MarketReferenceMetric(BaseModel):
    """
    MarketReferenceMetric：市场观测台数据。
    """

    id: str
    label: str
    group: str
    boundary: str | None = None
    definition: str
    formula: str
    unit: str
    source: str


class MarketReferenceSource(BaseModel):
    """
    MarketReferenceSource：市场观测台数据。
    """

    source: str
    api: str
    usage: str
    optional: bool


class MarketReferenceTheme(BaseModel):
    """
    MarketReferenceTheme：市场观测台数据。
    """

    name: str
    industries: list[str]


class MarketSegments(BaseModel):
    """
    MarketSegments：市场观测台数据。
    """

    boards: list[MarketBoardSegment]
    marketCap: list[MarketCapSegment]


class MarketStateSummary(BaseModel):
    """
    MarketStateSummary：市场观测台数据。
    """

    headline: str
    text: str
    support: str
    counterEvidence: str
    tags: list[str]
    risks: list[MarketQuestion]
    nextValidations: list[MarketQuestion]


class MarketStock(BaseModel):
    """
    MarketStock：市场观测台数据。
    """

    code: str
    name: str
    industry: str
    board: str
    return1d: float
    boardHeight: int
    amountCny: float
    limitDetail: MarketLimitDetail | None


class MarketStocks(BaseModel):
    """
    MarketStocks：市场观测台数据。
    """

    top: list[MarketStock]
    bottom: list[MarketStock]


class MarketStyleGroup(BaseModel):
    """
    MarketStyleGroup：市场观测台数据。
    """

    name: Literal["高位加速", "趋势延续", "低位修复", "中间状态"]
    count: int
    share: float
    meanReturn1d: float
    medianReturn1d: float


class MarketTechnicalLevel(BaseModel):
    """
    MarketTechnicalLevel：市场观测台数据。
    """

    label: str
    value: float
    kind: Literal["dynamic_average", "observed_low", "observed_high"]


class MarketTemperatureParts(BaseModel):
    """
    MarketTemperatureParts：市场观测台数据。
    """

    breadth: float
    trend: float
    limitEcology: float
    liquidity: float
    positiveIndices: float


class MarketTheme(BaseModel):
    """
    MarketTheme：市场观测台数据。
    """

    name: str
    members: list[str]
    sampleCount: int
    return1d: float
    advanceShare: float
    aboveMa20Share: float
    amountShare: float
    return5d: float | None
    return20d: float | None
    limitUpCount: int
    limitDownCount: int


class MarketTransmissionPart(BaseModel):
    """
    MarketTransmissionPart：市场观测台数据。
    """

    name: str
    text: str


class MarketUpDownBalanceInput(BaseModel):
    limitUp: int
    limitDown: int


class MarketValidationCount(BaseModel):
    """
    MarketValidationCount：市场观测台数据。
    """

    ruleType: (
        Literal[
            "MARKET_PERSISTENCE",
            "DIRECTION_PERSISTENCE",
            "DIRECTION_REPAIR",
            "LIMIT_ECOLOGY",
            "DIRECTION_SPREAD",
        ]
        | None
    )
    settledCount: int
    confirmedCount: int
    notConfirmedCount: int
    inconclusiveCount: int
    confirmedShare: float | None
    notConfirmedShare: float | None
    inconclusiveShare: float | None


class MarketValidationStats(BaseModel):
    """
    MarketValidationStats：市场观测台数据。
    """

    cumulative: list[MarketValidationCount]
    last20TradingDays: list[MarketValidationCount]


class NewsBrief(BaseModel):
    id: str
    brief: str


class NewsCalendarEventItem(BaseModel):
    id: str
    data: CalendarEvent
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsCalendarSection(BaseModel):
    kind: Literal["calendar", "next_week_calendar"]
    title: str
    items: list[NewsCalendarEventItem]


class NewsCuratedItem(BaseModel):
    id: str
    summary: str
    whyItMatters: str


class NewsInsiderTradeItem(BaseModel):
    id: str
    data: InsiderTrade
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsInsidersSection(BaseModel):
    kind: Literal["insider_trades"]
    title: str
    items: list[NewsInsiderTradeItem]


class NewsPriceChange(BaseModel):
    symbol: str
    change: float


class NewsPromptItem(BaseModel):
    id: str
    title: str
    summary: str | None


class NewsSourceHealth(BaseModel):
    id: str
    checkedAt: AwareDatetime
    status: Literal["ok", "failed"]
    error: str | None


class NewsTickerArticle(NewsPromptItem):
    source: str
    publishedAt: AwareDatetime


class NewsTickerFiling(BaseModel):
    id: str
    form: str
    items: list[str]
    digest: str | None


class NewsUnchangedTickers(BaseModel):
    symbols: list[str]


class PaperAppraisalDimension(BaseModel):
    name: str
    judgment: str | None = None
    status: str | None = None
    note: str | None = None


class PaperArxivUploadRequest(BaseModel):
    arxivUrl: str


class PaperAskRequest(BaseModel):
    question: str


class PaperBottomLine(BaseModel):
    supports: str
    doesNotSupport: str
    memorable: str


class PaperCitation(BaseModel):
    title: str
    why: str


class PaperCitations(BaseModel):
    backward: list[PaperCitation] | None = None
    forward: list[PaperCitation] | None = None


class PdfPage(RootModel[int]):
    root: Annotated[int, Field(ge=1)]


class PdfPage1(RootModel[None]):
    root: None


class PaperConcept(BaseModel):
    id: str
    name: str
    explanation: str | None = None
    whyItMatters: str | None = None
    dependsOn: list[str] | None = None
    anchor: str | None = None
    claimOrigin: Literal["paper_supported", "llm_inferred", "source_navigation"] | None = None


class PaperConceptCooccurrence(BaseModel):
    source: str
    target: str
    count: int


class PaperDesignIdea(BaseModel):
    title: str
    explanation: str
    anchor: str | None = None


class PdfPage2(RootModel[int]):
    root: Annotated[int, Field(ge=1)]


class PdfPage3(RootModel[None]):
    root: None


class PaperDraftConcept(PaperConcept):
    explanation: str
    anchor: str
    claimOrigin: Literal["paper_supported", "llm_inferred", "source_navigation"]


class PaperExistingMethod(BaseModel):
    name: str
    whatItDoes: str | None = None
    whyNotEnough: str | None = None


class PaperExperimentTable(BaseModel):
    columns: list[str]
    rows: list[list[str]]


class PaperExplanationCreate(BaseModel):
    """
    新AI解释卡沿用原QA出处；旧数据缺省，不由API编造模型信息。
    """

    question: str
    answer: str
    pages: list[int]
    generatedBy: GeneratedBy | None = None


class PaperFigure(BaseModel):
    page: Annotated[int, Field(ge=1)]
    title: str
    explanation: str | None = None
    takeaway: str | None = None


class PaperFinding(BaseModel):
    title: str
    evidence: str | None = None
    interpretation: str | None = None
    caveat: str | None = None
    anchor: str | None = None


class PaperGraphEdge(BaseModel):
    source: str
    target: str
    type: Literal["discusses", "belongs_to", "relation"]
    relationType: str | None = None
    note: str | None = None


class PaperGraphNode(BaseModel):
    id: str
    kind: Literal["paper", "concept", "space"]
    label: str


class PaperIndependentSourceCheck(BaseModel):
    pdfPage: Annotated[int, Field(ge=1)]
    sourceExcerpt: str
    minimumClaim: str
    counterexampleOrLimit: str
    comparisonToArticle: str


class PaperLegacyCard(BaseModel):
    title: str
    markdown: str


class PaperMechanismStep(BaseModel):
    step: str
    detail: str
    input: str | None = None
    output: str | None = None
    anchor: str | None = None


class PaperMeta(BaseModel):
    """
    书目信息：老档案只有英文标题是必填，未提供的字段可以缺省。
    """

    title: str
    titleZh: str | None = None
    authors: list[str] | None = None
    year: int | None = None
    venue: str | None = None
    version: str | None = None
    paperType: str | None = None
    paperKind: Literal["empirical", "theory", "survey", "system"] | None = None
    studyDesign: str | None = None
    doi: str | None = None
    arxivId: str | None = None
    anthologyId: str | None = None
    sourceUrl: str | None = None
    pdfUrl: str | None = None


class PaperMethodComponent(BaseModel):
    name: str
    question: str | None = None
    how: str | None = None
    purpose: str | None = None
    caveat: str | None = None
    anchor: str | None = None


class PaperOrientation(BaseModel):
    whatItIs: str | None = None
    analogy: str | None = None
    whyItMatters: str | None = None
    notTheSameAs: list[str] | None = None
    thirtySecondStory: list[str] | None = None


class PaperPrerequisite(BaseModel):
    term: str
    explanation: str
    example: str | None = None


class PaperPrivateWrite(BaseModel):
    mastery: Literal["pending", "confirmed"]
    notes: str


class PaperProblem(BaseModel):
    setup: str | None = None
    existingMethods: list[PaperExistingMethod] | None = None
    gap: str | None = None


class PaperProjectConnection(BaseModel):
    translation: str | None = None
    safeDesign: str | None = None


class PaperQaOutput(BaseModel):
    answer: str
    pages: list[int]
    generatedBy: GeneratedBy | None = None


class PaperQuantity(BaseModel):
    text: str
    sourceText: str
    meaning: str


class PaperQuestionAnswer(BaseModel):
    question: str
    answer: str


class PaperReaderCheck(BaseModel):
    problem: str
    gap: str
    input: str
    mechanism: str
    output: str
    boundary: str
    openQuestion: str


class PaperRelation(BaseModel):
    target: str
    type: str
    note: str | None = None


class PaperReviewCheck(BaseModel):
    status: Literal["pass", "fail", "not_applicable"]
    evidence: str


class PaperReviewChecks(BaseModel):
    identity: PaperReviewCheck
    explanation: PaperReviewCheck
    method: PaperReviewCheck
    results: PaperReviewCheck
    boundaries: PaperReviewCheck
    sources: PaperReviewCheck


class PaperReviewFinding(BaseModel):
    severity: Literal["P0", "P1", "P2"]
    location: str
    fix: str


class PaperReviewOutput(BaseModel):
    decision: Literal["pass", "revise", "escalate"]
    readerRestatement: str
    independentSourceCheck: PaperIndependentSourceCheck
    sampledClaimIds: list[str]
    checks: PaperReviewChecks
    findings: list[PaperReviewFinding]
    pagesChecked: list[int]
    visualPagesChecked: list[int]
    generatedBy: GeneratedBy | None = None


class PaperReviseRequest(BaseModel):
    instructions: str


class PaperSearchItem(BaseModel):
    id: str
    title: str
    titleZh: str | None
    authors: list[str]
    oneSentence: str | None
    concepts: list[str]
    spaces: list[str]
    """
    研究空间的展示名称，供本地全文搜索。
    """


class PaperSecondary(BaseModel):
    title: str
    note: str | None = None


class PaperSpace(BaseModel):
    id: str
    label: str
    shortLabel: str
    color: str
    description: str
    aliases: list[str]
    paperCount: int


class PapersCatalogStats(BaseModel):
    paperCount: int
    spaceCount: int
    conceptCount: int
    edgeCount: int


class Problem(BaseModel):
    """
    错误响应的正文（application/problem+json，RFC 9457）。
    各接口统一用 HubHttp.ErrorResponse 声明错误（OpenAPI 里是 default 响应）。
    """

    type: str
    """
    错误类型的 URI；没有专门类型时为 about:blank
    """
    title: str
    """
    简短的错误标题，如“未实现”
    """
    status: int
    """
    HTTP 状态码
    """
    detail: str
    """
    具体说明，如“未实现（任务 T14）”
    """


class Review(BaseModel):
    decision: Literal["pass", "revise", "escalate"]
    readerRestatement: str
    independentSourceCheck: PaperIndependentSourceCheck
    sampledClaimIds: list[str]
    checks: PaperReviewChecks
    findings: list[PaperReviewFinding]
    pagesChecked: list[int]
    visualPagesChecked: list[int]
    id: str
    createdAt: AwareDatetime
    durationMs: int
    generatedBy: GeneratedBy


class SearchIndex(BaseModel):
    papers: list[PaperSearchItem]


class TickerDigestPoint(BaseModel):
    text: str
    sourceIds: list[str]
    """
    0–3 个来源，由能力运行时按提示词检查。
    """


class Upload(BaseModel):
    id: str
    filename: str | None
    arxivUrl: str | None
    status: Literal["queued", "extracting", "authoring", "checking", "reviewing", "ready", "failed"]
    error: str | None
    createdAt: AwareDatetime
    updatedAt: AwareDatetime
    paperId: str | None = None
    """
    定下后立即写入；重试沿用，避免误加版本后缀。
    """


class WeeklyDataHealth(BaseModel):
    """
    WeeklyDataHealth：市场观测台数据。
    """

    sessions: Annotated[list[date_aliased], Field(max_length=5, min_length=5)]
    missing: list[str]
    directionCoverageDays: Annotated[int, Field(ge=0, le=5)]
    """
    有方向数据的交易日数量，页面显示覆盖 n/5。
    """
    boundary: str


class WeeklyJudgment(BaseModel):
    """
    WeeklyJudgment：市场观测台数据。
    """

    id: str
    title: str
    result: Literal["PENDING", "CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE"]
    resultNote: str


class WeeklyOscillatingDirection(BaseModel):
    """
    WeeklyOscillatingDirection：市场观测台数据。
    """

    name: str
    signChanges: int
    latestRelative: float | None
    """
    最后交易日缺该方向数据时为空，不回填更早日期。
    """


class WeeklyQuestion(BaseModel):
    """
    WeeklyQuestion：市场观测台数据。
    """

    question: str
    confirm: str
    invalidate: str


class WeeklyResearchError(BaseModel):
    """
    WeeklyResearchError：市场观测台数据。
    """

    id: str
    title: str
    result: Literal["NOT_CONFIRMED"]
    reason: str


class WeeklyResearchErrors(BaseModel):
    """
    WeeklyResearchErrors：市场观测台数据。
    """

    items: list[WeeklyResearchError]
    unsettledDue: list[WeeklyJudgment]


class WeeklyStructuralChange(BaseModel):
    """
    WeeklyStructuralChange：市场观测台数据。
    """

    name: str
    change: float
    judgment: str
    counter: str


class WeeklySummary(BaseModel):
    """
    WeeklySummary：市场观测台数据。
    """

    date: date_aliased
    title: str
    sentence: str
    settledCount: int
    researchErrorCount: int
    inconclusiveCount: int


class WeeklyVerification(BaseModel):
    """
    WeeklyVerification：市场观测台数据。
    """

    settledCount: int
    confirmedCount: int
    notConfirmedCount: int
    inconclusiveCount: int
    unsettledDueCount: int
    items: list[WeeklyJudgment]


class Article(BaseModel):
    id: str
    sourceId: str
    kind: Literal["news", "filing", "press_release", "macro"]
    title: str
    url: str
    publishedAt: AwareDatetime
    summary: str | None
    lang: str
    tickers: list[str]
    topics: list[str]
    paywall: Literal["none", "metered", "hard"]
    clusterId: str | None


class ArticleTimelineItem(BaseModel):
    kind: Literal["article"]
    at: AwareDatetime
    article: Article


class BriefInput(BaseModel):
    items: list[NewsPromptItem]


class BriefOutput(BaseModel):
    briefs: list[NewsBrief]
    generatedBy: GeneratedBy | None = None


class CapabilityEvals(BaseModel):
    """
    能力的评测设置
    """

    dataset: str
    """
    评测集目录，如 evals/news.ticker_digest/
    """
    schedule: Literal["weekly", "on-change"]
    """
    清单没写时为 weekly
    """
    thresholds: dict[str, Any]
    """
    评测阈值（评分器名 → 最低分 0–1）
    """


class CapabilityInfo(BaseModel):
    """
    GET /v1/capabilities 的一项：能力清单 capabilities/<id>.yaml 的字段（docs/10 第 3 节），
    加上档位当前对应的模型与推理强度（config/llm.yaml），以及最近一次评测结果。
    """

    id: str
    """
    能力 ID，如 news.ticker_digest
    """
    version: int
    """
    清单版本：提示词、输入输出或校验变了就 +1
    """
    summary: str
    """
    一句话说明
    """
    owner: str
    """
    所属领域，如 newsroom、papers
    """
    runtime: Literal["python", "typescript"]
    """
    能力在哪一端运行
    """
    tier: Literal["fast", "balanced", "frontier"]
    """
    模型档位（docs/10 第 4 节；档位 → 模型只在 config/llm.yaml 定义）
    """
    model: str
    """
    档位当前映射到的模型（config/llm.yaml 的 tiers.<tier>.model）
    """
    reasoning: Literal["none", "low", "medium", "high", "xhigh", "max"]
    """
    档位的推理强度（config/llm.yaml 的 tiers.<tier>.reasoning）
    """
    autonomy: Literal["L0", "L1", "L2", "L3"]
    """
    自治等级（docs/10 第 6 节）
    """
    prompt: str
    """
    提示词文件，如 prompts/news_ticker_digest.md
    """
    io: CapabilityIo
    limits: CapabilityLimits
    checks: list[str]
    """
    确定性后置校验，按顺序执行（docs/10 第 5.2 节）
    """
    fallback: str
    """
    失败时调用方怎么降级
    """
    params: dict[str, Any]
    """
    能力自己的参数（如 papers.author 的 repairRounds）
    """
    evals: CapabilityEvals
    latestEval: EvalResult | None
    """
    最近一次评测结果；还没有评测过时为 null
    """


class ClassifyInput(BaseModel):
    items: list[NewsPromptItem]


class CurateOutput(BaseModel):
    overview: str
    top5: list[NewsCuratedItem]
    generatedBy: GeneratedBy | None = None


class DirectionPersistenceRule(BaseModel):
    """
    DirectionPersistenceRule：市场观测台数据。
    """

    type: Literal["DIRECTION_PERSISTENCE"]
    thresholds: DirectionPersistenceThresholds
    baseline: DirectionPersistenceBaseline
    entity: str


class DirectionRepairRule(BaseModel):
    """
    DirectionRepairRule：市场观测台数据。
    """

    type: Literal["DIRECTION_REPAIR"]
    thresholds: DirectionRepairThresholds
    baseline: DirectionRepairBaseline
    entity: str


class DirectionSpreadRule(BaseModel):
    """
    DirectionSpreadRule：市场观测台数据。
    """

    type: Literal["DIRECTION_SPREAD"]
    thresholds: DirectionSpreadThresholds
    baseline: DirectionSpreadBaseline
    entities: list[str]


class Document(BaseModel):
    """
    通用的“单份文档”（documents 表，docs/09 第 3 节）。
    写入用 PUT /v1/internal/documents/{key}，请求体就是 payload 本身；读取由各领域的接口完成
    （如 GET /v1/public/markets/reference 返回 markets.reference 的 payload）。
    """

    key: Literal[
        "markets.reference",
        "papers.catalog.public",
        "papers.catalog.all",
        "papers.graph.public",
        "papers.graph.all",
        "papers.search.public",
    ]
    """
    documents 表里的文档键（派生数据与参考资料；docs/03 第 2、7 节，docs/04 第 6 节）
    """
    payload: dict[str, Any]
    """
    文档内容，结构由 key 决定：markets.reference → MarketReference，papers.catalog.* → PapersCatalog，papers.graph.* → GraphData，papers.search.public → SearchIndex
    """
    updatedAt: AwareDatetime
    """
    最后写入时间
    """


class EarningsCard(BaseModel):
    symbol: str
    period: str
    figures: list[EarningsFigure]
    guidance: EarningsGuidance | None
    takeaway: str
    sourceUrl: str
    sourceAccession: str | None
    publishedAt: AwareDatetime
    generatedBy: GeneratedBy | None


class EarningsCardOutput(BaseModel):
    period: str
    figures: list[EarningsFigure]
    guidance: EarningsGuidance | None
    takeaway: str
    generatedBy: GeneratedBy | None = None


class EarningsTimelineItem(BaseModel):
    kind: Literal["earnings"]
    at: AwareDatetime
    earnings: EarningsCard


class EditionLede(BaseModel):
    lines: list[str]
    generatedBy: GeneratedBy | None


class EditionLedeOutput(BaseModel):
    lines: list[str]
    generatedBy: GeneratedBy | None = None


class EditionPage(BaseModel):
    """
    游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
    用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
    """

    items: list[EditionSummary]
    """
    本页条目
    """
    nextCursor: str | None
    """
    下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null
    """


class ExportPage(BaseModel):
    """
    GET /v1/internal/export/{table} 的一页（hub export 每晚分页读出，写进数据仓库 bowen-hub-data，docs/09 第 5 节）
    """

    table: Literal[
        "news_sources",
        "articles",
        "filings",
        "insider_trades",
        "calendar_events",
        "earnings_cards",
        "editions",
        "edition_feedback",
        "watch_items",
        "market_days",
        "market_hypotheses",
        "market_weeklies",
        "market_events",
        "index_history",
        "papers",
        "paper_private",
        "paper_reviews",
        "paper_uploads",
        "documents",
        "runs",
        "ai_calls",
        "eval_results",
    ]
    """
    导出的表
    """
    items: list[dict[str, Any]]
    """
    本页的行：列名 → 值，保持数据库里的原样
    """
    nextCursor: str | None
    """
    下一页的游标；没有下一页时为 null
    """


class Feedback(RootModel[EditionFeedback | ItemFeedback]):
    root: EditionFeedback | ItemFeedback


class Filing(BaseModel):
    accession: str
    cik: str
    ticker: str
    form: str
    filedAt: AwareDatetime
    items: list[str]
    url: str
    exhibits: list[FilingExhibit]


class FilingDigestOutput(BaseModel):
    digest: str
    generatedBy: GeneratedBy | None = None


class FilingTimelineItem(BaseModel):
    kind: Literal["filing"]
    at: AwareDatetime
    filing: Filing


class GraphData(BaseModel):
    nodes: list[PaperGraphNode]
    edges: list[PaperGraphEdge]
    cooccurrence: list[PaperConceptCooccurrence]


class LimitEcologyRule(BaseModel):
    """
    LimitEcologyRule：市场观测台数据。
    """

    type: Literal["LIMIT_ECOLOGY"]
    thresholds: LimitEcologyThresholds
    baseline: LimitEcologyBaseline


class MarketDaySummary(BaseModel):
    """
    MarketDaySummary：市场观测台数据。
    """

    date: date_aliased
    headline: str
    complete: bool
    temperature: float
    sentiment: float
    advanceShare: float
    aboveMa20Share: float
    medianReturn1d: float
    turnoverCny: float
    trendStrongShare: float
    advanceCount: int
    declineCount: int
    limitUpCount: int
    limitDownCount: int
    maxBoard: int
    sealRate: float | None
    topDirections: list[MarketRankedReturn] | None
    topIndustries: list[MarketRankedReturn]
    directionsRelative: list[MarketDirectionRelative] | None


class MarketDaySummaryPage(BaseModel):
    """
    游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
    用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
    """

    items: list[MarketDaySummary]
    """
    本页条目
    """
    nextCursor: str | None
    """
    下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null
    """


class MarketDirection(BaseModel):
    """
    MarketDirection：市场观测台数据。
    """

    name: str
    sourceIndexCode: str
    memberCount: int
    coveredCount: int
    return1d: float
    medianReturn1d: float
    advanceShare: float
    aboveMa20Share: float
    amountCny: float
    amountShare: float
    amount20dPercentile: float
    relativeVsAllA: float
    return5d: float | None
    return20d: float | None
    moneyflowProxyCny: float | None
    moneyflowCoverage: MoneyflowCoverage | MoneyflowCoverage1 | None
    """
    有资金流数据的成员数 / memberCount；无法核实股数时为空。
    """
    limitUpCount: int
    limitDownCount: int
    loss5Count: int
    componentCrossCheck: MarketComponentCrossCheck
    leaders: list[MarketDirectionLeader]
    laggards: list[MarketDirectionLaggard]
    state: Literal["趋势扩散", "高位分歧", "低位修复", "趋势转弱", "方向待明"]


class MarketDirections(BaseModel):
    """
    MarketDirections：市场观测台数据。
    """

    membershipAsOf: date_aliased
    items: list[MarketDirection]


class MarketEtfGroup(BaseModel):
    """
    MarketEtfGroup：市场观测台数据。
    """

    name: str
    rule: str
    sampleCount: int
    amountWeightedReturn1d: float
    medianReturn1d: float
    amountCny: float
    medianReturn5d: float | None
    medianReturn20d: float | None
    shareCoverage: float | None
    shareIncreaseCount: int | None
    shareDecreaseCount: int | None
    representative: MarketEtfRepresentative


class MarketEtfGroups(BaseModel):
    """
    MarketEtfGroups：市场观测台数据。
    """

    groups: list[MarketEtfGroup]


class MarketPersistenceRule(BaseModel):
    """
    MarketPersistenceRule：市场观测台数据。
    """

    type: Literal["MARKET_PERSISTENCE"]
    thresholds: MarketPersistenceThresholds
    baseline: MarketPersistenceBaseline


class MarketProgression(MarketStock):
    """
    MarketProgression：市场观测台数据。
    """

    previousBoardHeight: int
    progressionState: Literal["连续晋级", "首板建立", "重新封板", "晋级未完成"]


class MarketReference(BaseModel):
    """
    MarketReference：市场观测台数据。
    """

    metrics: list[MarketReferenceMetric]
    directions: list[MarketReferenceDirection]
    etfGroups: list[MarketReferenceEtfGroup]
    themes: list[MarketReferenceTheme]
    indices: list[MarketReferenceIndex]
    sources: list[MarketReferenceSource]
    limitations: list[str]
    disclaimer: str


class MarketSentimentDimension(BaseModel):
    key: Literal[
        "limitHeight",
        "limitUpCount",
        "sealRate",
        "advancementRate",
        "previousLimitPremium",
        "lossEffect",
        "breadth",
        "upDownBalance",
        "turnover",
    ]
    label: str
    weight: float
    input: float | MarketLossEffectInput | MarketUpDownBalanceInput | None
    unit: str
    score: float
    formula: str


class MarketStyle(BaseModel):
    """
    MarketStyle：市场观测台数据。
    """

    version: Literal["transparent-style-v1"]
    groups: list[MarketStyleGroup]
    trendStrongShare: float


class MarketTechnical(BaseModel):
    """
    MarketTechnical：市场观测台数据。
    """

    indexCode: str
    asOf: date_aliased
    close: float
    ma5: float
    ma10: float
    ma20: float
    atr20: float
    support: list[MarketTechnicalLevel]
    resistance: list[MarketTechnicalLevel]
    confirmationRule: str
    confirmationNow: bool


class MarketTemperature(BaseModel):
    """
    MarketTemperature：市场观测台数据。
    """

    value: float
    version: Literal["transparent-close-v1"]
    parts: MarketTemperatureParts
    boundary: str


class MarketTransmission(BaseModel):
    """
    MarketTransmission：市场观测台数据。
    """

    liquidityBreadth: MarketTransmissionPart
    direction: MarketTransmissionPart | None
    limitCluster: MarketTransmissionPart
    negativeFeedback: MarketTransmissionPart


class MarketValidation(BaseModel):
    """
    MarketValidation：市场观测台数据。
    """

    settledToday: list[str]
    createdToday: list[str]
    stats: MarketValidationStats


class NewsArticleDigest(BaseModel):
    article: Article
    summary: str | None
    whyItMatters: str | None
    topic: str | None
    generatedBy: GeneratedBy | None


class NewsCandidate(NewsPromptItem):
    topic: str | None
    source: str
    publishedAt: AwareDatetime
    tickers: list[str]
    ruleScore: float
    paywall: Literal["none", "metered", "hard"]


class NewsClassification(BaseModel):
    id: str
    topic: Literal[
        "us_china",
        "war_geopolitics",
        "markets_macro",
        "ai_tech",
        "big_tech",
        "us_politics",
        "china_business",
        "other",
    ]


class NewsCloseSnapshot(BaseModel):
    indices: list[NewsPriceChange]
    watchlist: list[NewsPriceChange]
    treasury10Year: float | None
    vix: float | None


class NewsEarningsCardItem(BaseModel):
    id: str
    data: EarningsCard
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsEarningsSection(BaseModel):
    kind: Literal["earnings", "premarket_earnings", "earnings_review"]
    title: str
    items: list[NewsEarningsCardItem]


class NewsFilingDigest(BaseModel):
    filing: Filing
    digest: str | None
    generatedBy: GeneratedBy | None


class NewsNewsArticleDigestItem(BaseModel):
    id: str
    data: NewsArticleDigest
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsNewsCloseSnapshotItem(BaseModel):
    id: str
    data: NewsCloseSnapshot
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsNewsFilingDigestItem(BaseModel):
    id: str
    data: NewsFilingDigest
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsNewsUnchangedTickersItem(BaseModel):
    id: str
    data: NewsUnchangedTickers
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsQuietSection(BaseModel):
    kind: Literal["unchanged_tickers"]
    title: str
    items: list[NewsNewsUnchangedTickersItem]


class NewsRankedItem(NewsCuratedItem):
    topic: Literal["macro_fed", "earnings", "ai_semis", "big_tech", "crypto", "policy_geo", "other"]


class NewsSnapshotSection(BaseModel):
    kind: Literal["close_snapshot", "weekly_performance"]
    title: str
    items: list[NewsNewsCloseSnapshotItem]


class NewsTickerEarnings(EarningsCard):
    """
    财报来源具有稳定条目 id，供 source_ids_exist 校验。
    """

    id: str


class NewsTimelineItem(RootModel[ArticleTimelineItem | FilingTimelineItem | EarningsTimelineItem]):
    root: ArticleTimelineItem | FilingTimelineItem | EarningsTimelineItem


class PaperAppraisal(BaseModel):
    minimumClaim: str | None = None
    overclaimToAvoid: str | None = None
    dimensions: list[PaperAppraisalDimension] | None = None


class PaperArticleBlock(BaseModel):
    claimOrigin: Literal["paper_supported", "llm_inferred", "source_navigation"]
    claimIds: list[str]


class PaperClaim(BaseModel):
    """
    一条原文主张；R1 表格转换时没有页内行号和摘录，不制造这些值。
    """

    id: str
    kind: Literal["method", "result", "limitation", "definition"]
    claim: str
    metric: str | None = None
    condition: str | None = None
    anchor: str | None = None
    pdfPage: PdfPage | PdfPage1 | None = None
    sourceLines: list[int] | None = None
    """
    起止行号；新草稿由 paper_draft 校验两项及范围。
    """
    sourceExcerpt: str | None = None
    claimOrigin: Literal["paper_supported", "llm_inferred", "source_navigation"] | None = None
    interpretationBoundary: str | None = None
    quantities: list[PaperQuantity] | None = None


class PaperCode(BaseModel):
    status: Literal["verified", "unverified", "not_found"]
    url: str | None = None
    note: str | None = None
    checkedAt: date_aliased | None = None


class PaperCoverage(BaseModel):
    dimension: str
    status: Literal["complete", "partial", "missing", "not_applicable"]
    evidence: str | None = None


class PaperDraftClaim(PaperClaim):
    metric: str
    anchor: str
    condition: str
    pdfPage: PdfPage2 | PdfPage3 | None
    sourceLines: list[int]
    """
    起止行号；新草稿由 paper_draft 校验两项及范围。
    """
    claimOrigin: Literal["paper_supported", "llm_inferred", "source_navigation"]
    interpretationBoundary: str
    quantities: list[PaperQuantity]


class PaperDraftCode(PaperCode):
    url: str | None
    note: str
    checkedAt: date_aliased | None


class PaperDraftFigure(PaperFigure):
    explanation: str


class PaperDraftMeta(PaperMeta):
    titleZh: str
    authors: list[str]
    year: int
    venue: str
    version: str
    paperType: str
    paperKind: Literal["empirical", "theory", "survey", "system"]
    studyDesign: str
    sourceUrl: str
    doi: str | None
    arxivId: str | None
    anthologyId: str | None


class PaperDraftPrerequisite(PaperPrerequisite):
    example: str


class PaperEvidence(BaseModel):
    readerCheck: PaperReaderCheck | None = None
    claims: list[PaperClaim] | None = None
    articleBlocks: list[PaperArticleBlock] | None = None
    legacyAnchors: bool | None = None
    """
    旧文本抽取的行号不再逐行核验；重写后整个 evidence 换为 false。
    """


class PaperExperiment(BaseModel):
    setup: str | None = None
    table: PaperExperimentTable | None = None
    howToRead: str | None = None
    anchor: str | None = None


class PaperExplanation(BaseModel):
    id: str
    question: str
    answer: str
    pages: list[int]
    status: Literal["pending", "confirmed"]
    createdAt: AwareDatetime
    generatedBy: GeneratedBy | None = None
    """
    保存 AI 回答时保留该次问答的运行时出处。
    """


class PaperExplanationPatch(BaseModel):
    status: Literal["pending", "confirmed"]


class PaperLearning(BaseModel):
    orientation: PaperOrientation | None = None
    mechanismSteps: list[PaperMechanismStep] | None = None
    designPhilosophy: list[str | PaperDesignIdea] | None = None
    activeRecall: list[PaperQuestionAnswer] | None = None
    expertQa: list[PaperQuestionAnswer] | None = None


class PaperMethod(BaseModel):
    thesis: str | None = None
    pipeline: list[str] | None = None
    components: list[PaperMethodComponent] | None = None


class PaperPatch(BaseModel):
    visibility: Literal["public", "private"] | None = None
    spaces: list[str] | None = None
    readingDepth: Literal["R0", "R1", "R2", "R3"] | None = None
    nextAction: str | None = None


class PaperPrivate(BaseModel):
    schemaVersion: Literal[1]
    mastery: Literal["pending", "confirmed"]
    notes: str
    explanations: list[PaperExplanation]
    legacyCards: list[PaperLegacyCard]


class PaperResources(BaseModel):
    landingPage: str | None = None
    code: PaperCode | None = None
    secondary: list[PaperSecondary] | None = None


class PaperReviewContent(BaseModel):
    decision: Literal["pass", "revise", "escalate"]
    readerRestatement: str
    independentSourceCheck: PaperIndependentSourceCheck
    sampledClaimIds: list[str]
    checks: PaperReviewChecks
    findings: list[PaperReviewFinding]
    pagesChecked: list[int]
    visualPagesChecked: list[int]


class PaperSection(BaseModel):
    pages: str
    role: str | None = None
    keyQuestion: str | None = None
    status: Literal["read", "skimmed", "unread"] | None = None


class PaperStatus(BaseModel):
    visibility: Literal["public", "private"]
    review: Literal["draft", "passed", "revise"]
    readingDepth: Literal["R0", "R1", "R2", "R3"]
    nextAction: str
    updatedAt: date_aliased
    """
    内容更新日期；迁移按 docs/06 的依次回退规则取日期部分。
    """


class PaperStructure(BaseModel):
    pageCount: Annotated[int | None, Field(ge=1)] = None
    sections: list[PaperSection] | None = None
    figures: list[PaperFigure] | None = None
    concepts: list[PaperConcept] | None = None
    coverage: list[PaperCoverage] | None = None
    appraisal: PaperAppraisal | None = None
    negativeResults: list[str] | None = None


class PaperSummary(BaseModel):
    """
    列表摘要由计算任务与 Paper 一起写入；原文缺省的展示字段用 null。
    """

    id: str
    title: str
    titleZh: str | None
    year: int | None
    venue: str | None
    oneSentence: str | None
    spaces: list[str]
    readingDepth: Literal["R0", "R1", "R2", "R3"]
    paperKind: Literal["empirical", "theory", "survey", "system"] | None
    paperType: str | None
    visibility: Literal["public", "private"]
    review: Literal["draft", "passed", "revise"]
    updatedAt: date_aliased
    hasCode: bool
    conceptCount: int


class PaperUploadPatch(BaseModel):
    status: (
        Literal["queued", "extracting", "authoring", "checking", "reviewing", "ready", "failed"]
        | None
    ) = None
    error: str | None = None
    paperId: str | None = None


class PapersCatalog(BaseModel):
    stats: PapersCatalogStats
    spaces: list[PaperSpace]
    papers: list[PaperSummary]


class Run(BaseModel):
    """
    计算任务的一次运行（runs 表，docs/09 第 3、7、9 节）。
    任务开始和结束各写一次 PUT /v1/internal/runs/{runId}（同一 id 覆盖）。
    """

    id: str
    """
    运行 ID，由任务生成，如 news-morning-2026-09-30-<GitHub 运行号>
    """
    job: str
    """
    任务名，如 news-morning、market-eod、papers-ingest、data-export；月度预算超支提醒记为 budget-alert
    """
    date: date_aliased
    """
    这次运行处理的业务日期（如早报日期、A 股交易日）
    """
    status: Literal["running", "succeeded", "failed"]
    """
    运行状态：开始时写 running，结束时写 succeeded 或 failed
    """
    startedAt: AwareDatetime
    """
    开始时间
    """
    finishedAt: AwareDatetime | None
    """
    结束时间；还在运行时为 null
    """
    stats: dict[str, Any]
    """
    统计：由各任务自己决定写什么（条目数、AI 调用数、校验删掉了什么等）
    """
    error: str | None
    """
    错误摘要；没有出错时为 null
    """


class RunPage(BaseModel):
    """
    GET /v1/runs 的一页
    """

    items: list[Run]
    """
    本页条目
    """
    nextCursor: str | None
    """
    下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null
    """


class TickerDigest(BaseModel):
    symbol: str
    change: float | None
    withSector: bool | None
    whatHappened: str
    whyItMatters: str | None
    sourceIds: list[str]
    """
    0–3 个来源，由能力运行时按提示词检查。
    """
    points: list[TickerDigestPoint]
    generatedBy: GeneratedBy | None


class TickerDigestInput(BaseModel):
    mode: Literal["daily", "weekly"]
    symbol: str
    name: str
    changeText: str | None
    withSector: bool | None
    sectorEtf: str | None
    articles: list[NewsTickerArticle]
    filings: list[NewsTickerFiling]
    earnings: list[NewsTickerEarnings] | None


class TickerDigestOutput(BaseModel):
    whatHappened: str
    whyItMatters: str | None
    sourceIds: list[str]
    """
    0–3 个来源，由能力运行时按提示词检查。
    """
    points: list[TickerDigestPoint]
    generatedBy: GeneratedBy | None = None


class UsRankInput(BaseModel):
    candidates: list[NewsCandidate]
    minItems: int
    maxItems: int


class UsRankOutput(BaseModel):
    items: list[NewsRankedItem]
    generatedBy: GeneratedBy | None = None


class WatchItem(BaseModel):
    """
    一只自选股（watch_items 表，docs/09 第 3 节）
    """

    symbol: str
    """
    代码（主键）；加密资产用 BTC、XRP
    """
    name: str
    """
    中文名或常用名
    """
    kind: Literal["stock", "etf", "leveraged_etf", "crypto"]
    """
    自选股类型（docs/02 第 3 节）：stock 有自己的新闻和 SEC 公告；etf 按代码取新闻再加别名匹配；
    leveraged_etf 并入标的；crypto 用加密新闻和日线（日涨跌幅按 UTC 日计算）
    """
    group: str
    """
    分组（控制台和邮件里按组显示），如 半导体
    """
    underlying: str | None
    """
    杠杆 ETF / 现货 ETF 并入的标的（新闻、公告都算在标的名下），如 TSMX → TSM；没有时为 null
    """
    sectorEtf: str | None
    """
    判断“与板块同向”时对照的 ETF；为 null 时用 config/newsroom.yaml 的 defaultSectorEtf
    """
    aliases: list[str]
    """
    在 RSS 标题里匹配这只股票用的名字（英文按词边界匹配，不区分大小写）
    """
    active: bool
    """
    是否启用
    """


class WeeklyLifecycle(BaseModel):
    """
    WeeklyLifecycle：市场观测台数据。
    """

    persistentDirections: list[MarketAppearance]
    oscillatingDirections: list[WeeklyOscillatingDirection]
    latestWeakDirections: list[str] | None
    directionCoverageDays: Annotated[int, Field(ge=0, le=5)]
    """
    有方向数据的交易日数量，页面显示覆盖 n/5。
    """
    windowDays: Literal[5]


class WeeklyReport(WeeklySummary):
    """
    WeeklyReport：市场观测台数据。
    """

    sessions: Annotated[list[date_aliased], Field(max_length=5, min_length=5)]
    previousJudgmentVerification: WeeklyVerification
    threeStructuralChanges: list[WeeklyStructuralChange]
    lifecycle: WeeklyLifecycle
    researchErrors: WeeklyResearchErrors
    nextWeekQuestions: list[WeeklyQuestion | None]
    dataAndMethodHealth: WeeklyDataHealth
    markdown: str


class ClassifyOutput(BaseModel):
    classifications: list[NewsClassification]
    generatedBy: GeneratedBy | None = None


class CurateInput(BaseModel):
    candidates: list[NewsCandidate]


class MarketEvolution(BaseModel):
    """
    MarketEvolution：市场观测台数据。
    """

    rows: Annotated[list[MarketDaySummary], Field(max_length=5, min_length=5)]
    """
    固定最近五个交易日；缺方向时保留该日，不跨缺口比较。
    """
    edgeChanges: MarketEvolutionEdgeChanges
    summary: MarketEvolutionSummary
    transmission: MarketTransmission
    signals: MarketEvolutionSignals


class MarketLimitEcology(BaseModel):
    """
    MarketLimitEcology：市场观测台数据。
    """

    limitUpCount: int
    limitDownCount: int
    touchedCount: int
    failedCount: int
    maxBoardHeight: int
    firstBoardCount: int
    multiBoardCount: int
    previousLimitUpCount: int
    advancementCount: int
    largeLoss7Count: int
    sealRate: float | None
    advancementRate: float | None
    previousLimitPremium: float | None
    providerDetail: MarketProviderDetail | None
    heightDistribution: list[MarketHeightDistribution]
    industryClusters: list[MarketIndustryCluster]
    progression: list[MarketProgression]
    failedPromotions: list[MarketProgression]
    leaders: list[MarketStock]
    limitDownSamples: list[MarketStock]
    largeLossSamples: list[MarketStock]


class MarketSentiment(BaseModel):
    """
    MarketSentiment：市场观测台数据。
    """

    value: float
    version: Literal["transparent-ecology-v2"]
    dimensions: list[MarketSentimentDimension]
    boundary: str


class NewsArticlesSection(BaseModel):
    kind: Literal["us_news", "new_messages", "international_weekly"]
    title: str
    items: list[NewsNewsArticleDigestItem]


class NewsFilingsSection(BaseModel):
    kind: Literal["filings", "important_filings"]
    title: str
    items: list[NewsNewsFilingDigestItem]


class NewsInternational(BaseModel):
    overview: str
    top5: list[NewsNewsArticleDigestItem]
    briefs: list[NewsNewsArticleDigestItem]
    generatedBy: GeneratedBy | None


class NewsNewsInternationalItem(BaseModel):
    id: str
    data: NewsInternational
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsTickerDigestItem(BaseModel):
    id: str
    data: TickerDigest
    ruleScore: float | None = None
    clusterId: str | None = None


class NewsTickerSection(BaseModel):
    kind: Literal["ticker_digests", "ticker_weekly"]
    title: str
    items: list[NewsTickerDigestItem]


class PaperDraftEvidence(PaperEvidence):
    readerCheck: PaperReaderCheck
    claims: list[PaperDraftClaim]
    articleBlocks: list[PaperArticleBlock]


class PaperDraftResources(PaperResources):
    landingPage: str
    code: PaperDraftCode


class PaperDraftSection(PaperSection):
    role: str
    keyQuestion: str
    status: Literal["read", "skimmed", "unread"]


class PaperDraftStructure(PaperStructure):
    pageCount: Annotated[int, Field(ge=1)]
    sections: list[PaperDraftSection]
    figures: list[PaperDraftFigure]
    concepts: list[PaperDraftConcept]


class PaperGuide(BaseModel):
    """
    迁移导读允许只保留已有部分；新草稿的要求在 PaperDraftGuide 中收紧。
    """

    oneSentence: str | None = None
    readingGoal: str | None = None
    article: str | None = None
    prerequisites: list[PaperPrerequisite] | None = None
    problem: PaperProblem | None = None
    method: PaperMethod | None = None
    experiment: PaperExperiment | None = None
    findings: list[PaperFinding] | None = None
    bottomLine: PaperBottomLine | None = None
    limitations: list[str] | None = None
    openQuestions: list[str] | None = None
    projectConnection: PaperProjectConnection | None = None


class PaperPage(BaseModel):
    """
    游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
    用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
    """

    items: list[PaperSummary]
    """
    本页条目
    """
    nextCursor: str | None
    """
    下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null
    """


class PaperQaInput(BaseModel):
    question: str
    guide: PaperGuide
    claims: list[PaperClaim]
    pages: str


class Hypothesis(BaseModel):
    """
    Hypothesis：市场观测台数据。
    """

    id: str
    createdOn: date_aliased
    dueOn: date_aliased
    mode: Literal["realtime", "backfill"]
    engineVersion: str | None = None
    title: str
    confirmation: str
    invalidation: str
    risk: str
    counterEvidence: str
    resultNote: str
    scope: Literal["market", "direction", "theme", "sector", "index"]
    rule: (
        MarketPersistenceRule
        | DirectionPersistenceRule
        | DirectionRepairRule
        | LimitEcologyRule
        | DirectionSpreadRule
        | None
    )
    result: Literal["PENDING", "CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE"]
    settledOn: date_aliased | None
    actual: (
        MarketPersistenceActual
        | DirectionPersistenceActual
        | DirectionRepairActual
        | LimitEcologyActual
        | DirectionSpreadActual
        | None
    )


class HypothesisPage(BaseModel):
    """
    游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
    用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
    """

    items: list[Hypothesis]
    """
    本页条目
    """
    nextCursor: str | None
    """
    下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null
    """


class MarketDay(BaseModel):
    """
    MarketDay：市场观测台数据。
    """

    schemaVersion: Literal[1]
    date: date_aliased
    previousDate: date_aliased
    generatedAt: AwareDatetime
    dataStatus: MarketDataStatus
    indices: list[MarketIndex]
    market: MarketOverview
    temperature: MarketTemperature
    sentiment: MarketSentiment
    style: MarketStyle
    limitEcology: MarketLimitEcology
    moneyflow: MarketMoneyflow | None
    industries: list[MarketIndustry]
    themes: list[MarketTheme]
    directions: MarketDirections | None
    etfGroups: MarketEtfGroups | None
    segments: MarketSegments
    stocks: MarketStocks
    technical: MarketTechnical
    summary: MarketStateSummary
    evolution: MarketEvolution
    validation: MarketValidation


class MarketDayWrite(BaseModel):
    """
    MarketDayWrite：市场观测台数据。
    """

    day: MarketDay
    summary: MarketDaySummary


class NewsInternationalSection(BaseModel):
    kind: Literal["international", "legacy_headlines"]
    title: str
    items: list[NewsNewsInternationalItem]


class Paper(BaseModel):
    """
    单篇公开内容。私人笔记、解释卡、老阅读卡只存在 PaperPrivate。
    """

    schemaVersion: Literal[1] | None = None
    id: str
    meta: PaperMeta
    status: PaperStatus
    spaces: list[str] | None = None
    guide: PaperGuide | None = None
    evidence: PaperEvidence | None = None
    structure: PaperStructure | None = None
    learning: PaperLearning | None = None
    resources: PaperResources | None = None
    citations: PaperCitations | None = None
    relations: list[PaperRelation] | None = None
    generatedBy: GeneratedBy | None = None
    """
    新 AI 草稿落库时带运行时出处；旧论文没有可靠出处时不补造。
    """


class PaperDraftGuide(PaperGuide):
    oneSentence: str
    readingGoal: str
    article: str
    """
    1800–3000 汉字是目标，不是硬上限；非典型论文允许更短。
    """
    prerequisites: list[PaperDraftPrerequisite]
    bottomLine: PaperBottomLine
    limitations: list[str]


class PaperWrite(BaseModel):
    paper: Paper
    summary: PaperSummary


class Edition(BaseModel):
    id: str
    kind: Literal["morning", "premarket", "weekly", "legacy"]
    date: date_aliased
    window: EditionWindow
    generatedAt: AwareDatetime | None
    lede: EditionLede | None
    sections: list[
        NewsSnapshotSection
        | NewsTickerSection
        | NewsQuietSection
        | NewsArticlesSection
        | NewsEarningsSection
        | NewsFilingsSection
        | NewsInsidersSection
        | NewsCalendarSection
        | NewsInternationalSection
    ]
    sources: list[NewsSourceHealth]
    aiUsage: EditionAiUsage | None
    email: EditionEmail | None


class PaperDraft(BaseModel):
    meta: PaperDraftMeta
    guide: PaperDraftGuide
    evidence: PaperDraftEvidence
    structure: PaperDraftStructure
    resources: PaperDraftResources
    generatedBy: GeneratedBy | None = None


class PaperReviewInput(BaseModel):
    paperId: str
    paper: Paper | PaperDraft
    pages: str
    pageImages: list[int]


class PaperAuthorInput(BaseModel):
    paperId: str
    knownMeta: PaperMeta | None
    pages: str
    previousDraft: PaperDraft | None
    problems: list[str]
    instructions: str | None
