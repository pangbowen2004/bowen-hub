// 市场契约：字段口径见 docs/03；样例来源见 fixtures/samples/markets/README.md。
import "./common.tsp";
namespace BowenHub;

union HypothesisResult { "PENDING", "CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE" }

union HypothesisRuleType { "MARKET_PERSISTENCE", "DIRECTION_PERSISTENCE", "DIRECTION_REPAIR", "LIMIT_ECOLOGY", "DIRECTION_SPREAD" }

/** MarketDataStatus：市场观测台数据。 */
model MarketDataStatus {
  complete: boolean;
  missing: ("moneyflow" | "limitDetail" | "etfGroups" | "etfShares" | "directions")[];
}

/** MarketOverview：市场观测台数据。 */
model MarketOverview {
  sampleCount: int32;
  advanceCount: int32;
  declineCount: int32;
  flatCount: int32;
  newHigh20Count: int32;
  newLow20Count: int32;
  advanceShare: float64;
  medianReturn1d: float64;
  aboveMa20Share: float64;
  turnoverCny: float64;
  turnoverPrevCny: float64;
  turnoverChange: float64;
  turnoverMedian20Cny: float64;
  totalMarketCapCny: float64;
  /** 换手率为0–1小数，旧数据百分数除以100。 */
  medianTurnoverRate: float64 | null;
  medianPeTtm: float64 | null;
  medianPb: float64 | null;
}

/** MarketTemperatureParts：市场观测台数据。 */
model MarketTemperatureParts {
  breadth: float64;
  trend: float64;
  limitEcology: float64;
  liquidity: float64;
  positiveIndices: float64;
}

/** MarketTemperature：市场观测台数据。 */
model MarketTemperature {
  value: float64;
  version: "transparent-close-v1";
  parts: MarketTemperatureParts;
  boundary: string;
}

/** MarketSentimentDimension：市场观测台数据。 */
model MarketLossEffectInput {
  limitDown: int32;
  largeLoss: int32;
}

model MarketUpDownBalanceInput {
  limitUp: int32;
  limitDown: int32;
}

model MarketSentimentDimension {
  key: "limitHeight" | "limitUpCount" | "sealRate" | "advancementRate" | "previousLimitPremium" | "lossEffect" | "breadth" | "upDownBalance" | "turnover";
  label: string;
  weight: float64;
  input: float64 | MarketLossEffectInput | MarketUpDownBalanceInput | null;
  unit: string;
  score: float64;
  formula: string;
}

/** MarketSentiment：市场观测台数据。 */
model MarketSentiment {
  value: float64;
  version: "transparent-ecology-v2";
  dimensions: MarketSentimentDimension[];
  boundary: string;
}

/** MarketStyleGroup：市场观测台数据。 */
model MarketStyleGroup {
  name: "高位加速" | "趋势延续" | "低位修复" | "中间状态";
  count: int32;
  share: float64;
  meanReturn1d: float64;
  medianReturn1d: float64;
}

/** MarketStyle：市场观测台数据。 */
model MarketStyle {
  version: "transparent-style-v1";
  groups: MarketStyleGroup[];
  trendStrongShare: float64;
}

/** MarketLimitDetail：市场观测台数据。 */
model MarketLimitDetail {
  type: "U" | "D" | "Z";
  firstTime: string | null;
  lastTime: string | null;
  upStat: string | null;
  openTimes: int32 | null;
  limitTimes: int32 | null;
  sealedAmountCny: float64 | null;
}

/** MarketStock：市场观测台数据。 */
model MarketStock {
  code: string;
  name: string;
  industry: string;
  board: string;
  return1d: float64;
  boardHeight: int32;
  amountCny: float64;
  limitDetail: MarketLimitDetail | null;
}

/** MarketProgression：市场观测台数据。 */
model MarketProgression extends MarketStock {
  previousBoardHeight: int32;
  progressionState: "连续晋级" | "首板建立" | "重新封板" | "晋级未完成";
}

/** MarketHeightDistribution：市场观测台数据。 */
model MarketHeightDistribution {
  height: int32;
  count: int32;
  names: string[];
}

/** MarketIndustryCluster：市场观测台数据。 */
model MarketIndustryCluster {
  industry: string;
  count: int32;
  maxBoardHeight: int32;
  names: string[];
}

/** MarketProviderDetail：市场观测台数据。 */
model MarketProviderDetail {
  rowCount: int32;
  limitUpCount: int32;
  limitDownCount: int32;
  openedOrTouchedNotClosedCount: int32;
  classification: string;
}

/** MarketLimitEcology：市场观测台数据。 */
model MarketLimitEcology {
  limitUpCount: int32;
  limitDownCount: int32;
  touchedCount: int32;
  failedCount: int32;
  maxBoardHeight: int32;
  firstBoardCount: int32;
  multiBoardCount: int32;
  previousLimitUpCount: int32;
  advancementCount: int32;
  largeLoss7Count: int32;
  sealRate: float64 | null;
  advancementRate: float64 | null;
  previousLimitPremium: float64 | null;
  providerDetail: MarketProviderDetail | null;
  heightDistribution: MarketHeightDistribution[];
  industryClusters: MarketIndustryCluster[];
  progression: MarketProgression[];
  failedPromotions: MarketProgression[];
  leaders: MarketStock[];
  limitDownSamples: MarketStock[];
  largeLossSamples: MarketStock[];
}

/** MarketMoneyflow：市场观测台数据。 */
model MarketMoneyflow {
  marketNetCny: float64;
  marketNetRate: float64;
  extraLargeNetCny: float64;
  largeNetCny: float64;
  mediumNetCny: float64;
  smallNetCny: float64;
  stockCoverageCount: int32 | null;
  classificationBoundary: string;
}

/** MarketIndustry：市场观测台数据。 */
model MarketIndustry {
  name: string;
  sampleCount: int32;
  return1d: float64;
  medianReturn1d: float64;
  advanceShare: float64;
  aboveMa20Share: float64;
  amountCny: float64;
  amountShare: float64;
  return5d: float64 | null;
  return20d: float64 | null;
  medianPeTtm: float64 | null;
  medianPb: float64 | null;
  limitUpCount: int32;
  limitDownCount: int32;
  lifecycle: "趋势扩散" | "高位分歧" | "修复延续" | "退潮观察" | "低位修复" | "方向待明";
}

/** MarketTheme：市场观测台数据。 */
model MarketTheme {
  name: string;
  members: string[];
  sampleCount: int32;
  return1d: float64;
  advanceShare: float64;
  aboveMa20Share: float64;
  amountShare: float64;
  return5d: float64 | null;
  return20d: float64 | null;
  limitUpCount: int32;
  limitDownCount: int32;
}

/** MarketComponentCrossCheck：市场观测台数据。 */
model MarketComponentCrossCheck {
  return1d: float64 | null;
  return5d: float64 | null;
  return20d: float64 | null;
  delta1dVsOfficial: float64 | null;
}

/** MarketDirectionLeader：市场观测台数据。 */
model MarketDirectionLeader {
  code: string;
  name: string;
  return1d: float64;
  amountCny: float64;
}

/** MarketDirectionLaggard：市场观测台数据。 */
model MarketDirectionLaggard {
  code: string;
  name: string;
  return1d: float64;
}

/** MarketDirection：市场观测台数据。 */
model MarketDirection {
  name: string;
  sourceIndexCode: string;
  memberCount: int32;
  /** 来源快照的完整成员代码，用于核对假设生成日至结算日的成员变化；不可用行情覆盖子集替代。旧数据无法核实时省略。 */
  memberCodes?: string[];
  coveredCount: int32;
  return1d: float64;
  medianReturn1d: float64;
  advanceShare: float64;
  aboveMa20Share: float64;
  amountCny: float64;
  amountShare: float64;
  amount20dPercentile: float64;
  relativeVsAllA: float64;
  return5d: float64 | null;
  return20d: float64 | null;
  moneyflowProxyCny: float64 | null;
  /** 有资金流数据的成员数 / memberCount；无法核实股数时为空。 */
  @minValue(0) @maxValue(1)
  moneyflowCoverage: float64 | null;
  limitUpCount: int32;
  limitDownCount: int32;
  loss5Count: int32;
  componentCrossCheck: MarketComponentCrossCheck;
  leaders: MarketDirectionLeader[];
  laggards: MarketDirectionLaggard[];
  state: "趋势扩散" | "高位分歧" | "低位修复" | "趋势转弱" | "方向待明";
}

/** MarketDirections：市场观测台数据。 */
model MarketDirections {
  membershipAsOf: Date;
  items: MarketDirection[];
}

/** MarketEtfRepresentative：市场观测台数据。 */
model MarketEtfRepresentative {
  code: string;
  name: string;
  return1d: float64;
  amountCny: float64;
  shareDelta: float64 | null;
}

/** MarketEtfGroup：市场观测台数据。 */
model MarketEtfGroup {
  name: string;
  rule: string;
  sampleCount: int32;
  amountWeightedReturn1d: float64;
  medianReturn1d: float64;
  amountCny: float64;
  medianReturn5d: float64 | null;
  medianReturn20d: float64 | null;
  shareCoverage: float64 | null;
  shareIncreaseCount: int32 | null;
  shareDecreaseCount: int32 | null;
  representative: MarketEtfRepresentative;
}

/** MarketEtfGroups：市场观测台数据。 */
model MarketEtfGroups {
  groups: MarketEtfGroup[];
}

/** MarketBoardSegment：市场观测台数据。 */
model MarketBoardSegment {
  name: string;
  sampleCount: int32;
  return1d: float64;
  advanceShare: float64;
  aboveMa20Share: float64;
  /** 换手率为0–1小数。 */
  turnoverRateMedian: float64 | null;
}

/** MarketCapSegment：市场观测台数据。 */
model MarketCapSegment {
  name: string;
  sampleCount: int32;
  return1d: float64;
  advanceShare: float64;
  medianMarketCapCny: float64;
}

/** MarketSegments：市场观测台数据。 */
model MarketSegments {
  boards: MarketBoardSegment[];
  marketCap: MarketCapSegment[];
}

/** MarketStocks：市场观测台数据。 */
model MarketStocks {
  top: MarketStock[];
  bottom: MarketStock[];
}

/** MarketTechnicalLevel：市场观测台数据。 */
model MarketTechnicalLevel {
  label: string;
  value: float64;
  kind: "dynamic_average" | "observed_low" | "observed_high";
}

/** MarketTechnical：市场观测台数据。 */
model MarketTechnical {
  indexCode: string;
  asOf: Date;
  close: float64;
  ma5: float64;
  ma10: float64;
  ma20: float64;
  atr20: float64;
  support: MarketTechnicalLevel[];
  resistance: MarketTechnicalLevel[];
  confirmationRule: string;
  confirmationNow: boolean;
}

/** MarketQuestion：市场观测台数据。 */
model MarketQuestion {
  title: string;
  text: string;
}

/** MarketStateSummary：市场观测台数据。 */
model MarketStateSummary {
  headline: string;
  text: string;
  support: string;
  counterEvidence: string;
  tags: string[];
  risks: MarketQuestion[];
  nextValidations: MarketQuestion[];
}

/** MarketRankedReturn：市场观测台数据。 */
model MarketRankedReturn {
  name: string;
  return1d: float64;
}

/** MarketDirectionRelative：市场观测台数据。 */
model MarketDirectionRelative {
  name: string;
  relativeVsAllA: float64;
}

/** MarketDaySummary：市场观测台数据。 */
model MarketDaySummary {
  date: Date;
  headline: string;
  complete: boolean;
  temperature: float64;
  sentiment: float64;
  advanceShare: float64;
  aboveMa20Share: float64;
  medianReturn1d: float64;
  turnoverCny: float64;
  trendStrongShare: float64;
  advanceCount: int32;
  declineCount: int32;
  limitUpCount: int32;
  limitDownCount: int32;
  maxBoard: int32;
  sealRate: float64 | null;
  topDirections: MarketRankedReturn[] | null;
  topIndustries: MarketRankedReturn[];
  directionsRelative: MarketDirectionRelative[] | null;
}

/** MarketEdgeChange：市场观测台数据。 */
model MarketEdgeChange {
  change: float64;
  state: string;
}

/** MarketEvolutionEdgeChanges：市场观测台数据。 */
model MarketEvolutionEdgeChanges {
  turnover: MarketEdgeChange | null;
  advanceShare: MarketEdgeChange | null;
  limitUpCount: MarketEdgeChange | null;
  maxBoard: MarketEdgeChange | null;
}

/** MarketAppearance：市场观测台数据。 */
model MarketAppearance {
  name: string;
  top3Appearances: int32;
}

/** MarketEvolutionSummary：市场观测台数据。 */
model MarketEvolutionSummary {
  turnoverMedianCny: float64;
  temperatureRange: float64[];
  advanceShareRange: float64[];
  directions: MarketAppearance[];
  industries: MarketAppearance[];
  /** 有方向数据的交易日数量，页面显示覆盖 n/5。 */
  @minValue(0) @maxValue(5)
  directionCoverageDays: int32;
  windowDays: 5;
}

/** MarketTransmissionPart：市场观测台数据。 */
model MarketTransmissionPart {
  name: string;
  text: string;
}

/** MarketTransmission：市场观测台数据。 */
model MarketTransmission {
  liquidityBreadth: MarketTransmissionPart;
  direction: MarketTransmissionPart | null;
  limitCluster: MarketTransmissionPart;
  negativeFeedback: MarketTransmissionPart;
}

/** MarketEvolutionSignal：市场观测台数据。 */
model MarketEvolutionSignal {
  name: string;
  currentState: string;
  confirmation: string;
  invalidation: string;
}

/** MarketEvolutionSignals：市场观测台数据。 */
model MarketEvolutionSignals {
  liquidity: MarketEvolutionSignal;
  direction: MarketEvolutionSignal | null;
  progression: MarketEvolutionSignal;
  breadth: MarketEvolutionSignal;
}

/** MarketEvolution：市场观测台数据。 */
model MarketEvolution {
  /** 固定最近五个交易日；缺方向时保留该日，不跨缺口比较。 */
  @minItems(5) @maxItems(5)
  rows: MarketDaySummary[];
  edgeChanges: MarketEvolutionEdgeChanges;
  summary: MarketEvolutionSummary;
  transmission: MarketTransmission;
  signals: MarketEvolutionSignals;
}

/** MarketValidationCount：市场观测台数据。 */
model MarketValidationCount {
  ruleType: HypothesisRuleType | null;
  settledCount: int32;
  confirmedCount: int32;
  notConfirmedCount: int32;
  inconclusiveCount: int32;
  confirmedShare: float64 | null;
  notConfirmedShare: float64 | null;
  inconclusiveShare: float64 | null;
}

/** MarketValidationStats：市场观测台数据。 */
model MarketValidationStats {
  cumulative: MarketValidationCount[];
  last20TradingDays: MarketValidationCount[];
}

/** MarketValidation：市场观测台数据。 */
model MarketValidation {
  settledToday: string[];
  createdToday: string[];
  stats: MarketValidationStats;
}

/** IndexBar：市场观测台数据。 */
model IndexBar {
  date: Date;
  open: float64;
  high: float64;
  low: float64;
  close: float64;
  preClose: float64;
  return1d: float64;
  amountCny: float64;
}

/** MarketIndex：市场观测台数据。 */
model MarketIndex {
  code: string;
  name: string;
  close: float64;
  return1d: float64;
  amountCny: float64;
}

/** MarketDay：市场观测台数据。 */
model MarketDay {
  schemaVersion: 1;
  date: Date;
  previousDate: Date;
  generatedAt: DateTime;
  dataStatus: MarketDataStatus;
  indices: MarketIndex[];
  market: MarketOverview;
  temperature: MarketTemperature;
  sentiment: MarketSentiment;
  style: MarketStyle;
  limitEcology: MarketLimitEcology;
  moneyflow: MarketMoneyflow | null;
  industries: MarketIndustry[];
  themes: MarketTheme[];
  directions: MarketDirections | null;
  etfGroups: MarketEtfGroups | null;
  segments: MarketSegments;
  stocks: MarketStocks;
  technical: MarketTechnical;
  summary: MarketStateSummary;
  evolution: MarketEvolution;
  validation: MarketValidation;
}

/** MarketDayWrite：市场观测台数据。 */
model MarketDayWrite {
  day: MarketDay;
  summary: MarketDaySummary;
}

model MarketDaySummaryPage is CursorPage<MarketDaySummary>;
model HypothesisPage is CursorPage<Hypothesis>;

/** MarketPersistenceThresholds：市场观测台数据。 */
model MarketPersistenceThresholds {
  advanceShareMin: float64;
  aboveMa20ShareMin: float64;
  turnoverCnyMin: float64;
  advanceShareInvalid: float64;
  turnoverRatioInvalid: float64;
  aboveMa20DropInvalid: float64;
}

/** MarketPersistenceBaseline：市场观测台数据。 */
model MarketPersistenceBaseline {
  turnoverCny: float64;
  aboveMa20Share: float64;
}

/** MarketPersistenceRule：市场观测台数据。 */
model MarketPersistenceRule {
  type: "MARKET_PERSISTENCE";
  thresholds: MarketPersistenceThresholds;
  baseline: MarketPersistenceBaseline;
}

/** MarketPersistenceActual：市场观测台数据。 */
model MarketPersistenceActual {
  advanceShare: float64;
  aboveMa20Share: float64;
  turnoverCny: float64;
}

/** DirectionPersistenceThresholds：市场观测台数据。 */
model DirectionPersistenceThresholds {
  relativeMin: float64;
  advanceShareMin: float64;
  amountShareMin: float64;
  advanceShareInvalid: float64;
}

/** DirectionPersistenceBaseline：市场观测台数据。 */
model DirectionPersistenceBaseline {
  membershipAsOf: Date;
  /** 生成日来源快照的完整成员代码；只在可核实时保存，不从日期或成员数量推断。 */
  memberCodes?: string[];
  return1d: float64;
  advanceShare: float64;
  amountShare: float64;
}

/** DirectionPersistenceRule：市场观测台数据。 */
model DirectionPersistenceRule {
  type: "DIRECTION_PERSISTENCE";
  thresholds: DirectionPersistenceThresholds;
  baseline: DirectionPersistenceBaseline;
  entity: string;
}

/** DirectionPersistenceActual：市场观测台数据。 */
model DirectionPersistenceActual {
  /** 结算日来源快照的完整成员代码；用于与已保存的基线成员集合核对。 */
  memberCodes?: string[];
  relativeVsAllA: float64;
  advanceShare: float64;
  medianReturn1d: float64;
  amountShare: float64;
  membershipAsOf: Date;
}

/** DirectionRepairThresholds：市场观测台数据。 */
model DirectionRepairThresholds {
  relativeMin: float64;
  advanceShareMin: float64;
  medianReturnMin: float64;
  relativeInvalidMax: float64;
  advanceShareInvalid: float64;
}

/** DirectionRepairBaseline：市场观测台数据。 */
model DirectionRepairBaseline {
  membershipAsOf: Date;
  relativeVsAllA: float64;
  advanceShare: float64;
}

/** DirectionRepairRule：市场观测台数据。 */
model DirectionRepairRule {
  type: "DIRECTION_REPAIR";
  thresholds: DirectionRepairThresholds;
  baseline: DirectionRepairBaseline;
  entity: string;
}

/** DirectionRepairActual：市场观测台数据。 */
model DirectionRepairActual {
  relativeVsAllA: float64;
  advanceShare: float64;
  medianReturn1d: float64;
  amountShare: float64;
  membershipAsOf: Date;
}

/** LimitEcologyThresholds：市场观测台数据。 */
model LimitEcologyThresholds {
  sealRateMin: float64;
  multiBoardMin: int32;
  limitDownMax: int32;
  sealRateInvalid: float64;
  multiBoardInvalid: int32;
  limitDownInvalid: int32;
}

/** LimitEcologyBaseline：市场观测台数据。 */
model LimitEcologyBaseline {
  sealRate: float64;
  multiBoardCount: int32;
  limitDownCount: int32;
}

/** LimitEcologyRule：市场观测台数据。 */
model LimitEcologyRule {
  type: "LIMIT_ECOLOGY";
  thresholds: LimitEcologyThresholds;
  baseline: LimitEcologyBaseline;
}

/** LimitEcologyActual：市场观测台数据。 */
model LimitEcologyActual {
  sealRate: float64;
  multiBoardCount: int32;
  limitDownCount: int32;
}

/** DirectionSpreadThresholds：市场观测台数据。 */
model DirectionSpreadThresholds {
  spreadMax: float64;
  spreadInvalidMin: float64;
  weakAdvanceBaseline: float64;
}

/** DirectionSpreadBaseline：市场观测台数据。 */
model DirectionSpreadBaseline {
  spread: float64;
  strongMembershipAsOf: Date;
  weakMembershipAsOf: Date;
}

/** DirectionSpreadRule：市场观测台数据。 */
model DirectionSpreadRule {
  type: "DIRECTION_SPREAD";
  thresholds: DirectionSpreadThresholds;
  baseline: DirectionSpreadBaseline;
  entities: string[];
}

/** DirectionSpreadActual：市场观测台数据。 */
model DirectionSpreadActual {
  spread: float64;
  strongRelative: float64;
  weakRelative: float64;
  weakAdvanceShare: float64;
}

union HypothesisRule { MarketPersistenceRule, DirectionPersistenceRule, DirectionRepairRule, LimitEcologyRule, DirectionSpreadRule }
union HypothesisActual { MarketPersistenceActual, DirectionPersistenceActual, DirectionRepairActual, LimitEcologyActual, DirectionSpreadActual }

/** Hypothesis：市场观测台数据。 */
model Hypothesis {
  id: string;
  createdOn: Date;
  dueOn: Date;
  mode: "realtime" | "backfill";
  engineVersion?: string;
  title: string;
  confirmation: string;
  invalidation: string;
  risk: string;
  counterEvidence: string;
  resultNote: string;
  scope: "market" | "direction" | "theme" | "sector" | "index";
  rule: HypothesisRule | null;
  result: HypothesisResult;
  settledOn: Date | null;
  actual: HypothesisActual | null;
}

/** MarketEvent：市场观测台数据。 */
model MarketEvent {
  id: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string | null;
  confirmation: string;
  invalidation: string;
  startDate: Date;
  endDate: Date;
  status: "confirmed" | "pending";
  watchItems: string[];
  aShareMappings: string[];
}

/** WeeklySummary：市场观测台数据。 */
model WeeklySummary {
  date: Date;
  title: string;
  sentence: string;
  settledCount: int32;
  researchErrorCount: int32;
  inconclusiveCount: int32;
}

/** WeeklyJudgment：市场观测台数据。 */
model WeeklyJudgment {
  id: string;
  title: string;
  result: HypothesisResult;
  resultNote: string;
}

/** WeeklyVerification：市场观测台数据。 */
model WeeklyVerification {
  settledCount: int32;
  confirmedCount: int32;
  notConfirmedCount: int32;
  inconclusiveCount: int32;
  unsettledDueCount: int32;
  items: WeeklyJudgment[];
}

/** WeeklyStructuralChange：市场观测台数据。 */
model WeeklyStructuralChange {
  name: string;
  change: float64;
  judgment: string;
  counter: string;
}

/** WeeklyOscillatingDirection：市场观测台数据。 */
model WeeklyOscillatingDirection {
  name: string;
  signChanges: int32;
  /** 最后交易日缺该方向数据时为空，不回填更早日期。 */
  latestRelative: float64 | null;
}

/** WeeklyLifecycle：市场观测台数据。 */
model WeeklyLifecycle {
  persistentDirections: MarketAppearance[];
  oscillatingDirections: WeeklyOscillatingDirection[];
  latestWeakDirections: string[] | null;
  /** 有方向数据的交易日数量，页面显示覆盖 n/5。 */
  @minValue(0) @maxValue(5)
  directionCoverageDays: int32;
  windowDays: 5;
}

/** WeeklyResearchError：市场观测台数据。 */
model WeeklyResearchError {
  id: string;
  title: string;
  result: "NOT_CONFIRMED";
  reason: string;
}

/** WeeklyResearchErrors：市场观测台数据。 */
model WeeklyResearchErrors {
  items: WeeklyResearchError[];
  unsettledDue: WeeklyJudgment[];
}

/** WeeklyQuestion：市场观测台数据。 */
model WeeklyQuestion {
  question: string;
  confirm: string;
  invalidate: string;
}

/** WeeklyDataHealth：市场观测台数据。 */
model WeeklyDataHealth {
  @minItems(5) @maxItems(5)
  sessions: Date[];
  missing: string[];
  /** 有方向数据的交易日数量，页面显示覆盖 n/5。 */
  @minValue(0) @maxValue(5)
  directionCoverageDays: int32;
  boundary: string;
}

/** WeeklyReport：市场观测台数据。 */
model WeeklyReport extends WeeklySummary {
  @minItems(5) @maxItems(5)
  sessions: Date[];
  previousJudgmentVerification: WeeklyVerification;
  threeStructuralChanges: WeeklyStructuralChange[];
  lifecycle: WeeklyLifecycle;
  researchErrors: WeeklyResearchErrors;
  nextWeekQuestions: (WeeklyQuestion | null)[];
  dataAndMethodHealth: WeeklyDataHealth;
  markdown: string;
}

/** MarketReferenceMetric：市场观测台数据。 */
model MarketReferenceMetric {
  id: string;
  label: string;
  group: string;
  boundary?: string;
  definition: string;
  formula: string;
  unit: string;
  source: string;
}

/** MarketReferenceDirection：市场观测台数据。 */
model MarketReferenceDirection {
  name: string;
  code: string;
  sourceName: string;
  mappingNote: string;
}

/** MarketReferenceEtfGroup：市场观测台数据。 */
model MarketReferenceEtfGroup {
  name: string;
  pattern: string;
}

/** MarketReferenceTheme：市场观测台数据。 */
model MarketReferenceTheme {
  name: string;
  industries: string[];
}

/** MarketReferenceIndex：市场观测台数据。 */
model MarketReferenceIndex {
  name: string;
  code: string;
  technical?: boolean;
}

/** MarketReferenceSource：市场观测台数据。 */
model MarketReferenceSource {
  source: string;
  api: string;
  usage: string;
  optional: boolean;
}

/** MarketReference：市场观测台数据。 */
model MarketReference {
  metrics: MarketReferenceMetric[];
  directions: MarketReferenceDirection[];
  etfGroups: MarketReferenceEtfGroup[];
  themes: MarketReferenceTheme[];
  indices: MarketReferenceIndex[];
  sources: MarketReferenceSource[];
  limitations: string[];
  disclaimer: string;
}
