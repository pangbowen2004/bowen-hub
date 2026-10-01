// 由 contracts 生成，勿手改（mise run gen）
/**
 * 一次 AI 能力调用的记录（ai_calls 表，docs/09 第 3 节；运行时在 docs/10 第 5 节第 7 步回调写入）
 */
export interface AiCall {
  /** 能力 ID，如 news.ticker_digest */
  capability: string;
  /** 能力清单的 version */
  version: number;
  /** 实际调用的模型（供应商/模型），如 openai/gpt-6-luna */
  model: string;
  /** 输入 token 数 */
  inputTokens: number;
  /** 输出 token 数 */
  outputTokens: number;
  /** 费用（美元），按 config/llm.yaml 的单价计算 */
  costUsd: number;
  /** 耗时（毫秒） */
  durationMs: number;
  /** 是否成功 */
  ok: boolean;
  /** 所属运行（Run.id）；API 里的按需调用（如控制台问论文）没有运行记录，为 null */
  runId: string | null;
  /** 调用时间（按天统计用量要用） */
  at: string;
}

/**
 * 某个能力的用量
 */
export interface AiUsageCapability {
  /** 能力 ID */
  capability: string;
  /** 调用次数 */
  calls: number;
  /** 其中失败的次数 */
  failedCalls: number;
  /** 输入 token 合计 */
  inputTokens: number;
  /** 输出 token 合计 */
  outputTokens: number;
  /** 费用合计（美元） */
  costUsd: number;
}

/**
 * 某一天的用量
 */
export interface AiUsageDay {
  date: string;
  /** 调用次数 */
  calls: number;
  /** 其中失败的次数 */
  failedCalls: number;
  /** 输入 token 合计 */
  inputTokens: number;
  /** 输出 token 合计 */
  outputTokens: number;
  /** 费用合计（美元） */
  costUsd: number;
}

/**
 * 一组 AI 调用的合计
 */
export interface AiUsageStats {
  /** 调用次数 */
  calls: number;
  /** 其中失败的次数 */
  failedCalls: number;
  /** 输入 token 合计 */
  inputTokens: number;
  /** 输出 token 合计 */
  outputTokens: number;
  /** 费用合计（美元） */
  costUsd: number;
}

/**
 * GET /v1/ai/usage?days 的用量汇总（ai_calls 表的 SQL 聚合）。
 * 控制台“运维”页显示用量与费用并对比月度预算，“今日”页显示本月 AI 费用（docs/05 第 6 节）。
 */
export interface AiUsageSummary {
  /** 统计窗口：最近多少天（含今天） */
  days: number;
  /** 窗口内的合计 */
  total: AiUsageStats;
  /** 按 Asia/Singapore（UTC+8）日期统计（日期升序；没有调用的日子不出现） */
  byDay: AiUsageDay[];
  /** 按能力 */
  byCapability: AiUsageCapability[];
  /** 按 Asia/Singapore（UTC+8）月份统计的本月累计费用（美元），与窗口无关 */
  monthCostUsd: number;
  /** 月度预算（美元，config/llm.yaml 的 monthlyBudgetUsd） */
  monthlyBudgetUsd: number;
}

export type ArticleKind = typeof ArticleKind[keyof typeof ArticleKind];


export const ArticleKind = {
  news: 'news',
  filing: 'filing',
  press_release: 'press_release',
  macro: 'macro',
} as const;

export type NewsPaywall = typeof NewsPaywall[keyof typeof NewsPaywall];


export const NewsPaywall = {
  none: 'none',
  metered: 'metered',
  hard: 'hard',
} as const;

export interface Article {
  id: string;
  sourceId: string;
  kind: ArticleKind;
  title: string;
  url: string;
  publishedAt: string;
  summary: string | null;
  lang: string;
  tickers: string[];
  topics: string[];
  paywall: NewsPaywall;
  clusterId: string | null;
}

export type ArticleTimelineItemKind = typeof ArticleTimelineItemKind[keyof typeof ArticleTimelineItemKind];


export const ArticleTimelineItemKind = {
  article: 'article',
} as const;

export interface ArticleTimelineItem {
  kind: ArticleTimelineItemKind;
  at: string;
  article: Article;
}

/**
 * 自治等级（docs/10 第 6 节）
 */
export type AutonomyLevel = typeof AutonomyLevel[keyof typeof AutonomyLevel];


export const AutonomyLevel = {
  L0: 'L0',
  L1: 'L1',
  L2: 'L2',
  L3: 'L3',
} as const;

export interface NewsPromptItem {
  id: string;
  title: string;
  summary: string | null;
}

export interface BriefInput {
  items: NewsPromptItem[];
}

export interface NewsBrief {
  id: string;
  brief: string;
}

/**
 * AI 生成内容的出处（docs/08 第 4 节；运行时在 docs/10 第 5 节第 6 步盖上）
 */
export interface GeneratedBy {
  /** 能力 ID，如 news.ticker_digest */
  capability: string;
  /** 能力清单的 version */
  version: number;
  /** 实际调用的模型（供应商/模型），如 openai/gpt-6-luna */
  model: string;
  /** 生成时间 */
  at: string;
}

export interface BriefOutput {
  briefs: NewsBrief[];
  generatedBy?: GeneratedBy;
}

export type CalendarEventKind = typeof CalendarEventKind[keyof typeof CalendarEventKind];


export const CalendarEventKind = {
  macro: 'macro',
  earnings: 'earnings',
  fomc: 'fomc',
} as const;

export interface CalendarEvent {
  kind: CalendarEventKind;
  date: string;
  fredReleaseId: number | null;
  at: string | null;
  title: string;
  tickers: string[];
  timing: string | null;
  importance: string;
}

/**
 * 评测阈值（评分器名 → 最低分 0–1）
 */
export type CapabilityEvalsThresholds = {[key: string]: number};

/**
 * 评测时机：weekly 参加每周全量评测；on-change 只在改动时跑
 */
export type EvalSchedule = typeof EvalSchedule[keyof typeof EvalSchedule];


export const EvalSchedule = {
  weekly: 'weekly',
  'on-change': 'on-change',
} as const;

/**
 * 能力的评测设置
 */
export interface CapabilityEvals {
  /** 评测集目录，如 evals/news.ticker_digest/ */
  dataset: string;
  /** 清单没写时为 weekly */
  schedule: EvalSchedule;
  /** 评测阈值（评分器名 → 最低分 0–1） */
  thresholds: CapabilityEvalsThresholds;
}

/**
 * 能力自己的参数（如 papers.author 的 repairRounds）
 */
export type CapabilityInfoParams = {[key: string]: unknown};

/**
 * 能力在哪一端运行
 */
export type CapabilityRuntime = typeof CapabilityRuntime[keyof typeof CapabilityRuntime];


export const CapabilityRuntime = {
  python: 'python',
  typescript: 'typescript',
} as const;

/**
 * 模型档位（docs/10 第 4 节；档位 → 模型只在 config/llm.yaml 定义）
 */
export type ModelTier = typeof ModelTier[keyof typeof ModelTier];


export const ModelTier = {
  fast: 'fast',
  balanced: 'balanced',
  frontier: 'frontier',
} as const;

/**
 * 推理强度（config/llm.yaml 里各档位的 reasoning）
 */
export type ReasoningEffort = typeof ReasoningEffort[keyof typeof ReasoningEffort];


export const ReasoningEffort = {
  none: 'none',
  low: 'low',
  medium: 'medium',
  high: 'high',
  xhigh: 'xhigh',
  max: 'max',
} as const;

/**
 * 能力的输入输出模型名（contracts/capabilities.tsp 里的模型）
 */
export interface CapabilityIo {
  input: string;
  output: string;
}

/**
 * 能力的调用上限
 */
export interface CapabilityLimits {
  maxInputTokens: number;
  maxOutputTokens: number;
  timeoutSec: number;
}

/**
 * 各评分器的得分（评分器名 → 0–1），如 schema_valid、judge_faithful
 */
export type EvalResultScores = {[key: string]: number};

/**
 * 一个能力的一次评测结果（eval_results 表，docs/09 第 3 节、docs/10 第 7 节）
 */
export interface EvalResult {
  /** 能力 ID */
  capability: string;
  /** 被评测的模型（供应商/模型） */
  model: string;
  /** 评测集版本 */
  datasetVersion: string;
  /** 各评分器的得分（评分器名 → 0–1），如 schema_valid、judge_faithful */
  scores: EvalResultScores;
  /** 是否达到清单里的全部阈值 */
  passed: boolean;
  /** 评测时间 */
  at: string;
  /** 这次评测的费用（美元）（运维页显示费用，docs/10 第 7.3 节） */
  costUsd?: number;
  /** 这次评测的耗时（毫秒）（运维页显示耗时，docs/10 第 7.3 节） */
  durationMs?: number;
}

/**
 * GET /v1/capabilities 的一项：能力清单 capabilities/<id>.yaml 的字段（docs/10 第 3 节），
 * 加上档位当前对应的模型与推理强度（config/llm.yaml），以及最近一次评测结果。
 */
export interface CapabilityInfo {
  /** 能力 ID，如 news.ticker_digest */
  id: string;
  /** 清单版本：提示词、输入输出或校验变了就 +1 */
  version: number;
  /** 一句话说明 */
  summary: string;
  /** 所属领域，如 newsroom、papers */
  owner: string;
  runtime: CapabilityRuntime;
  tier: ModelTier;
  /** 档位当前映射到的模型（config/llm.yaml 的 tiers.<tier>.model） */
  model: string;
  /** 档位的推理强度（config/llm.yaml 的 tiers.<tier>.reasoning） */
  reasoning: ReasoningEffort;
  autonomy: AutonomyLevel;
  /** 提示词文件，如 prompts/news_ticker_digest.md */
  prompt: string;
  io: CapabilityIo;
  limits: CapabilityLimits;
  /** 确定性后置校验，按顺序执行（docs/10 第 5.2 节） */
  checks: string[];
  /** 失败时调用方怎么降级 */
  fallback: string;
  /** 能力自己的参数（如 papers.author 的 repairRounds） */
  params: CapabilityInfoParams;
  evals: CapabilityEvals;
  /** 最近一次评测结果；还没有评测过时为 null */
  latestEval: EvalResult | null;
}

export interface ClassifyInput {
  items: NewsPromptItem[];
}

export type NewsTopic = typeof NewsTopic[keyof typeof NewsTopic];


export const NewsTopic = {
  us_china: 'us_china',
  war_geopolitics: 'war_geopolitics',
  markets_macro: 'markets_macro',
  ai_tech: 'ai_tech',
  big_tech: 'big_tech',
  us_politics: 'us_politics',
  china_business: 'china_business',
  other: 'other',
} as const;

export interface NewsClassification {
  id: string;
  topic: NewsTopic;
}

export interface ClassifyOutput {
  classifications: NewsClassification[];
  generatedBy?: GeneratedBy;
}

export type NewsCandidate = NewsPromptItem & ({
  topic: string | null;
  source: string;
  publishedAt: string;
  tickers: string[];
  ruleScore: number;
  paywall: NewsPaywall;
});

export interface CurateInput {
  candidates: NewsCandidate[];
}

export interface NewsCuratedItem {
  id: string;
  summary: string;
  whyItMatters: string;
}

export interface CurateOutput {
  overview: string;
  top5: NewsCuratedItem[];
  generatedBy?: GeneratedBy;
}

/**
 * DirectionPersistenceActual：市场观测台数据。
 */
export interface DirectionPersistenceActual {
  /** 结算日来源快照的完整成员代码；用于与已保存的基线成员集合核对。 */
  memberCodes?: string[];
  relativeVsAllA: number;
  advanceShare: number;
  medianReturn1d: number;
  amountShare: number;
  membershipAsOf: string;
}

/**
 * DirectionPersistenceBaseline：市场观测台数据。
 */
export interface DirectionPersistenceBaseline {
  membershipAsOf: string;
  /** 生成日来源快照的完整成员代码；只在可核实时保存，不从日期或成员数量推断。 */
  memberCodes?: string[];
  return1d: number;
  advanceShare: number;
  amountShare: number;
}

export type DirectionPersistenceRuleType = typeof DirectionPersistenceRuleType[keyof typeof DirectionPersistenceRuleType];


export const DirectionPersistenceRuleType = {
  DIRECTION_PERSISTENCE: 'DIRECTION_PERSISTENCE',
} as const;

/**
 * DirectionPersistenceThresholds：市场观测台数据。
 */
export interface DirectionPersistenceThresholds {
  relativeMin: number;
  advanceShareMin: number;
  amountShareMin: number;
  advanceShareInvalid: number;
}

/**
 * DirectionPersistenceRule：市场观测台数据。
 */
export interface DirectionPersistenceRule {
  type: DirectionPersistenceRuleType;
  thresholds: DirectionPersistenceThresholds;
  baseline: DirectionPersistenceBaseline;
  entity: string;
}

/**
 * DirectionRepairActual：市场观测台数据。
 */
export interface DirectionRepairActual {
  relativeVsAllA: number;
  advanceShare: number;
  medianReturn1d: number;
  amountShare: number;
  membershipAsOf: string;
}

/**
 * DirectionRepairBaseline：市场观测台数据。
 */
export interface DirectionRepairBaseline {
  membershipAsOf: string;
  relativeVsAllA: number;
  advanceShare: number;
}

export type DirectionRepairRuleType = typeof DirectionRepairRuleType[keyof typeof DirectionRepairRuleType];


export const DirectionRepairRuleType = {
  DIRECTION_REPAIR: 'DIRECTION_REPAIR',
} as const;

/**
 * DirectionRepairThresholds：市场观测台数据。
 */
export interface DirectionRepairThresholds {
  relativeMin: number;
  advanceShareMin: number;
  medianReturnMin: number;
  relativeInvalidMax: number;
  advanceShareInvalid: number;
}

/**
 * DirectionRepairRule：市场观测台数据。
 */
export interface DirectionRepairRule {
  type: DirectionRepairRuleType;
  thresholds: DirectionRepairThresholds;
  baseline: DirectionRepairBaseline;
  entity: string;
}

/**
 * DirectionSpreadActual：市场观测台数据。
 */
export interface DirectionSpreadActual {
  spread: number;
  strongRelative: number;
  weakRelative: number;
  weakAdvanceShare: number;
}

/**
 * DirectionSpreadBaseline：市场观测台数据。
 */
export interface DirectionSpreadBaseline {
  spread: number;
  strongMembershipAsOf: string;
  weakMembershipAsOf: string;
}

export type DirectionSpreadRuleType = typeof DirectionSpreadRuleType[keyof typeof DirectionSpreadRuleType];


export const DirectionSpreadRuleType = {
  DIRECTION_SPREAD: 'DIRECTION_SPREAD',
} as const;

/**
 * DirectionSpreadThresholds：市场观测台数据。
 */
export interface DirectionSpreadThresholds {
  spreadMax: number;
  spreadInvalidMin: number;
  weakAdvanceBaseline: number;
}

/**
 * DirectionSpreadRule：市场观测台数据。
 */
export interface DirectionSpreadRule {
  type: DirectionSpreadRuleType;
  thresholds: DirectionSpreadThresholds;
  baseline: DirectionSpreadBaseline;
  entities: string[];
}

/**
 * 文档内容，结构由 key 决定：markets.reference → MarketReference，papers.catalog.* → PapersCatalog，papers.graph.* → GraphData，papers.search.public → SearchIndex
 */
export type DocumentPayload = {[key: string]: unknown};

/**
 * documents 表里的文档键（派生数据与参考资料；docs/03 第 2、7 节，docs/04 第 6 节）
 */
export type DocumentKey = typeof DocumentKey[keyof typeof DocumentKey];


export const DocumentKey = {
  marketsreference: 'markets.reference',
  paperscatalogpublic: 'papers.catalog.public',
  paperscatalogall: 'papers.catalog.all',
  papersgraphpublic: 'papers.graph.public',
  papersgraphall: 'papers.graph.all',
  paperssearchpublic: 'papers.search.public',
} as const;

/**
 * 通用的“单份文档”（documents 表，docs/09 第 3 节）。
 * 写入用 PUT /v1/internal/documents/{key}，请求体就是 payload 本身；读取由各领域的接口完成
 * （如 GET /v1/public/markets/reference 返回 markets.reference 的 payload）。
 */
export interface Document {
  key: DocumentKey;
  /** 文档内容，结构由 key 决定：markets.reference → MarketReference，papers.catalog.* → PapersCatalog，papers.graph.* → GraphData，papers.search.public → SearchIndex */
  payload: DocumentPayload;
  /** 最后写入时间 */
  updatedAt: string;
}

export type EarningsFigureBasis = typeof EarningsFigureBasis[keyof typeof EarningsFigureBasis];


export const EarningsFigureBasis = {
  gaap: 'gaap',
  adjusted: 'adjusted',
  other: 'other',
} as const;

export interface EarningsFigure {
  name: string;
  value: string;
  yoy: string | null;
  basis: EarningsFigureBasis;
  quote: string;
}

export interface EarningsGuidance {
  text: string;
  quote: string;
}

export interface EarningsCard {
  symbol: string;
  period: string;
  figures: EarningsFigure[];
  guidance: EarningsGuidance | null;
  takeaway: string;
  sourceUrl: string;
  sourceAccession: string | null;
  publishedAt: string;
  generatedBy: GeneratedBy | null;
}

export type EarningsCardInputSourceKind = typeof EarningsCardInputSourceKind[keyof typeof EarningsCardInputSourceKind];


export const EarningsCardInputSourceKind = {
  press_release: 'press_release',
  news: 'news',
} as const;

export interface EarningsCardInput {
  symbol: string;
  name: string;
  sourceKind: EarningsCardInputSourceKind;
  sourceUrl: string;
  sourceText: string;
}

export interface EarningsCardOutput {
  period: string;
  figures: EarningsFigure[];
  guidance: EarningsGuidance | null;
  takeaway: string;
  generatedBy?: GeneratedBy;
}

export type EarningsTimelineItemKind = typeof EarningsTimelineItemKind[keyof typeof EarningsTimelineItemKind];


export const EarningsTimelineItemKind = {
  earnings: 'earnings',
} as const;

export interface EarningsTimelineItem {
  kind: EarningsTimelineItemKind;
  at: string;
  earnings: EarningsCard;
}

export type EditionKind = typeof EditionKind[keyof typeof EditionKind];


export const EditionKind = {
  morning: 'morning',
  premarket: 'premarket',
  weekly: 'weekly',
  legacy: 'legacy',
} as const;

export interface EditionWindow {
  fromAt: string | null;
  toAt: string | null;
}

export interface EditionLede {
  lines: string[];
  generatedBy: GeneratedBy | null;
}

export type NewsSnapshotSectionKind = typeof NewsSnapshotSectionKind[keyof typeof NewsSnapshotSectionKind];


export const NewsSnapshotSectionKind = {
  close_snapshot: 'close_snapshot',
  weekly_performance: 'weekly_performance',
} as const;

export interface NewsPriceChange {
  symbol: string;
  change: number;
}

export interface NewsCloseSnapshot {
  indices: NewsPriceChange[];
  watchlist: NewsPriceChange[];
  treasury10Year: number | null;
  vix: number | null;
}

export interface NewsNewsCloseSnapshotItem {
  id: string;
  data: NewsCloseSnapshot;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsSnapshotSection {
  kind: NewsSnapshotSectionKind;
  title: string;
  items: NewsNewsCloseSnapshotItem[];
}

export type NewsTickerSectionKind = typeof NewsTickerSectionKind[keyof typeof NewsTickerSectionKind];


export const NewsTickerSectionKind = {
  ticker_digests: 'ticker_digests',
  ticker_weekly: 'ticker_weekly',
} as const;

export interface TickerDigestPoint {
  text: string;
  /** 0–3 个来源，由能力运行时按提示词检查。 */
  sourceIds: string[];
}

export interface TickerDigest {
  symbol: string;
  change: number | null;
  withSector: boolean | null;
  whatHappened: string;
  whyItMatters: string | null;
  /** 0–3 个来源，由能力运行时按提示词检查。 */
  sourceIds: string[];
  points: TickerDigestPoint[];
  generatedBy: GeneratedBy | null;
}

export interface NewsTickerDigestItem {
  id: string;
  data: TickerDigest;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsTickerSection {
  kind: NewsTickerSectionKind;
  title: string;
  items: NewsTickerDigestItem[];
}

export type NewsQuietSectionKind = typeof NewsQuietSectionKind[keyof typeof NewsQuietSectionKind];


export const NewsQuietSectionKind = {
  unchanged_tickers: 'unchanged_tickers',
} as const;

export interface NewsUnchangedTickers {
  symbols: string[];
}

export interface NewsNewsUnchangedTickersItem {
  id: string;
  data: NewsUnchangedTickers;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsQuietSection {
  kind: NewsQuietSectionKind;
  title: string;
  items: NewsNewsUnchangedTickersItem[];
}

export type NewsArticlesSectionKind = typeof NewsArticlesSectionKind[keyof typeof NewsArticlesSectionKind];


export const NewsArticlesSectionKind = {
  us_news: 'us_news',
  new_messages: 'new_messages',
  international_weekly: 'international_weekly',
} as const;

export interface NewsArticleDigest {
  article: Article;
  summary: string | null;
  whyItMatters: string | null;
  topic: string | null;
  generatedBy: GeneratedBy | null;
}

export interface NewsNewsArticleDigestItem {
  id: string;
  data: NewsArticleDigest;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsArticlesSection {
  kind: NewsArticlesSectionKind;
  title: string;
  items: NewsNewsArticleDigestItem[];
}

export type NewsEarningsSectionKind = typeof NewsEarningsSectionKind[keyof typeof NewsEarningsSectionKind];


export const NewsEarningsSectionKind = {
  earnings: 'earnings',
  premarket_earnings: 'premarket_earnings',
  earnings_review: 'earnings_review',
} as const;

export interface NewsEarningsCardItem {
  id: string;
  data: EarningsCard;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsEarningsSection {
  kind: NewsEarningsSectionKind;
  title: string;
  items: NewsEarningsCardItem[];
}

export type NewsFilingsSectionKind = typeof NewsFilingsSectionKind[keyof typeof NewsFilingsSectionKind];


export const NewsFilingsSectionKind = {
  filings: 'filings',
  important_filings: 'important_filings',
} as const;

export interface FilingExhibit {
  name: string;
  url: string;
}

export interface Filing {
  accession: string;
  cik: string;
  ticker: string;
  form: string;
  filedAt: string;
  items: string[];
  url: string;
  exhibits: FilingExhibit[];
}

export interface NewsFilingDigest {
  filing: Filing;
  digest: string | null;
  generatedBy: GeneratedBy | null;
}

export interface NewsNewsFilingDigestItem {
  id: string;
  data: NewsFilingDigest;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsFilingsSection {
  kind: NewsFilingsSectionKind;
  title: string;
  items: NewsNewsFilingDigestItem[];
}

export type NewsInsidersSectionKind = typeof NewsInsidersSectionKind[keyof typeof NewsInsidersSectionKind];


export const NewsInsidersSectionKind = {
  insider_trades: 'insider_trades',
} as const;

export interface InsiderTrade {
  accession: string;
  transactionIndex: number;
  ticker: string;
  insider: string;
  role: string;
  code: string;
  shares: number;
  priceUsd: number | null;
  valueUsd: number | null;
  filedAt: string;
  url: string;
}

export interface NewsInsiderTradeItem {
  id: string;
  data: InsiderTrade;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsInsidersSection {
  kind: NewsInsidersSectionKind;
  title: string;
  items: NewsInsiderTradeItem[];
}

export type NewsCalendarSectionKind = typeof NewsCalendarSectionKind[keyof typeof NewsCalendarSectionKind];


export const NewsCalendarSectionKind = {
  calendar: 'calendar',
  next_week_calendar: 'next_week_calendar',
} as const;

export interface NewsCalendarEventItem {
  id: string;
  data: CalendarEvent;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsCalendarSection {
  kind: NewsCalendarSectionKind;
  title: string;
  items: NewsCalendarEventItem[];
}

export type NewsInternationalSectionKind = typeof NewsInternationalSectionKind[keyof typeof NewsInternationalSectionKind];


export const NewsInternationalSectionKind = {
  international: 'international',
  legacy_headlines: 'legacy_headlines',
} as const;

export interface NewsInternational {
  overview: string;
  top5: NewsNewsArticleDigestItem[];
  briefs: NewsNewsArticleDigestItem[];
  generatedBy: GeneratedBy | null;
}

export interface NewsNewsInternationalItem {
  id: string;
  data: NewsInternational;
  ruleScore?: number;
  clusterId?: string | null;
}

export interface NewsInternationalSection {
  kind: NewsInternationalSectionKind;
  title: string;
  items: NewsNewsInternationalItem[];
}

export type NewsSection = NewsSnapshotSection | NewsTickerSection | NewsQuietSection | NewsArticlesSection | NewsEarningsSection | NewsFilingsSection | NewsInsidersSection | NewsCalendarSection | NewsInternationalSection;

export type NewsSourceHealthStatus = typeof NewsSourceHealthStatus[keyof typeof NewsSourceHealthStatus];


export const NewsSourceHealthStatus = {
  ok: 'ok',
  failed: 'failed',
} as const;

export interface NewsSourceHealth {
  id: string;
  checkedAt: string;
  status: NewsSourceHealthStatus;
  error: string | null;
}

export interface EditionAiUsage {
  inputTokens: number;
  outputTokens: number;
  costUsd: number;
}

export interface EditionEmail {
  sentAt: string | null;
}

export interface Edition {
  id: string;
  kind: EditionKind;
  date: string;
  window: EditionWindow;
  generatedAt: string | null;
  lede: EditionLede | null;
  sections: NewsSection[];
  sources: NewsSourceHealth[];
  aiUsage: EditionAiUsage | null;
  email: EditionEmail | null;
}

export type EditionFeedbackKind = typeof EditionFeedbackKind[keyof typeof EditionFeedbackKind];


export const EditionFeedbackKind = {
  edition: 'edition',
} as const;

export interface EditionFeedback {
  kind: EditionFeedbackKind;
  id: string;
  createdAt: string;
  editionId: string;
  /**
     * @minimum 1
     * @maximum 5
     */
  score: number;
}

export interface EditionFeedbackRequest {
  /**
     * @minimum 1
     * @maximum 5
     */
  score: number;
}

/**
 * 已整理的事实文本，数字用显示口径字符串，避免向提示词传浮点收益率。
 */
export interface EditionLedeFact {
  id: string;
  text: string;
}

export type EditionLedeInputMode = typeof EditionLedeInputMode[keyof typeof EditionLedeInputMode];


export const EditionLedeInputMode = {
  morning: 'morning',
  premarket: 'premarket',
  weekly: 'weekly',
} as const;

export interface EditionLedeInput {
  mode: EditionLedeInputMode;
  date: string;
  facts: EditionLedeFact[];
}

export interface EditionLedeOutput {
  lines: string[];
  generatedBy?: GeneratedBy;
}

export interface EditionSummary {
  id: string;
  kind: EditionKind;
  date: string;
  generatedAt: string | null;
}

/**
 * 游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
 * 用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
 */
export interface EditionPage {
  /** 本页条目 */
  items: EditionSummary[];
  /** 下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null */
  nextCursor: string | null;
}

export type ExportPageItemsItem = {[key: string]: unknown};

/**
 * 可以导出的表：docs/09 第 3 节除鉴权表和两张 FTS5 虚拟表以外的全部表
 */
export type ExportTable = typeof ExportTable[keyof typeof ExportTable];


export const ExportTable = {
  news_sources: 'news_sources',
  articles: 'articles',
  filings: 'filings',
  insider_trades: 'insider_trades',
  calendar_events: 'calendar_events',
  earnings_cards: 'earnings_cards',
  editions: 'editions',
  edition_feedback: 'edition_feedback',
  watch_items: 'watch_items',
  market_days: 'market_days',
  market_hypotheses: 'market_hypotheses',
  market_weeklies: 'market_weeklies',
  market_events: 'market_events',
  index_history: 'index_history',
  papers: 'papers',
  paper_private: 'paper_private',
  paper_reviews: 'paper_reviews',
  paper_uploads: 'paper_uploads',
  documents: 'documents',
  runs: 'runs',
  ai_calls: 'ai_calls',
  eval_results: 'eval_results',
} as const;

/**
 * GET /v1/internal/export/{table} 的一页（hub export 每晚分页读出，写进数据仓库 bowen-hub-data，docs/09 第 5 节）
 */
export interface ExportPage {
  /** 导出的表 */
  table: ExportTable;
  /** 本页的行：列名 → 值，保持数据库里的原样 */
  items: ExportPageItemsItem[];
  /** 下一页的游标；没有下一页时为 null */
  nextCursor: string | null;
}

export type ItemFeedbackKind = typeof ItemFeedbackKind[keyof typeof ItemFeedbackKind];


export const ItemFeedbackKind = {
  item: 'item',
} as const;

export type ItemFeedbackReason = typeof ItemFeedbackReason[keyof typeof ItemFeedbackReason];


export const ItemFeedbackReason = {
  useless: 'useless',
  incorrect: 'incorrect',
} as const;

export interface ItemFeedback {
  kind: ItemFeedbackKind;
  id: string;
  createdAt: string;
  editionId: string;
  itemId: string;
  reason: ItemFeedbackReason;
}

export type Feedback = EditionFeedback | ItemFeedback;

export interface FilingDigestInput {
  symbol: string;
  name: string;
  form: string;
  items: string[];
  text: string;
}

export interface FilingDigestOutput {
  digest: string;
  generatedBy?: GeneratedBy;
}

export type FilingTimelineItemKind = typeof FilingTimelineItemKind[keyof typeof FilingTimelineItemKind];


export const FilingTimelineItemKind = {
  filing: 'filing',
} as const;

export interface FilingTimelineItem {
  kind: FilingTimelineItemKind;
  at: string;
  filing: Filing;
}

export type PaperGraphNodeKind = typeof PaperGraphNodeKind[keyof typeof PaperGraphNodeKind];


export const PaperGraphNodeKind = {
  paper: 'paper',
  concept: 'concept',
  space: 'space',
} as const;

export interface PaperGraphNode {
  id: string;
  kind: PaperGraphNodeKind;
  label: string;
}

export type PaperGraphEdgeType = typeof PaperGraphEdgeType[keyof typeof PaperGraphEdgeType];


export const PaperGraphEdgeType = {
  discusses: 'discusses',
  belongs_to: 'belongs_to',
  relation: 'relation',
} as const;

export interface PaperGraphEdge {
  source: string;
  target: string;
  type: PaperGraphEdgeType;
  relationType?: string;
  note?: string;
}

export interface PaperConceptCooccurrence {
  source: string;
  target: string;
  count: number;
}

export interface GraphData {
  nodes: PaperGraphNode[];
  edges: PaperGraphEdge[];
  cooccurrence: PaperConceptCooccurrence[];
}

/**
 * API 在线时为 ok
 */
export type HealthStatus = typeof HealthStatus[keyof typeof HealthStatus];


export const HealthStatus = {
  ok: 'ok',
} as const;

/**
 * GET /v1/health 的返回
 */
export interface Health {
  /** API 在线时为 ok */
  status: HealthStatus;
}

export type HypothesisMode = typeof HypothesisMode[keyof typeof HypothesisMode];


export const HypothesisMode = {
  realtime: 'realtime',
  backfill: 'backfill',
} as const;

export type HypothesisScope = typeof HypothesisScope[keyof typeof HypothesisScope];


export const HypothesisScope = {
  market: 'market',
  direction: 'direction',
  theme: 'theme',
  sector: 'sector',
  index: 'index',
} as const;

export type MarketPersistenceRuleType = typeof MarketPersistenceRuleType[keyof typeof MarketPersistenceRuleType];


export const MarketPersistenceRuleType = {
  MARKET_PERSISTENCE: 'MARKET_PERSISTENCE',
} as const;

/**
 * MarketPersistenceThresholds：市场观测台数据。
 */
export interface MarketPersistenceThresholds {
  advanceShareMin: number;
  aboveMa20ShareMin: number;
  turnoverCnyMin: number;
  advanceShareInvalid: number;
  turnoverRatioInvalid: number;
  aboveMa20DropInvalid: number;
}

/**
 * MarketPersistenceBaseline：市场观测台数据。
 */
export interface MarketPersistenceBaseline {
  turnoverCny: number;
  aboveMa20Share: number;
}

/**
 * MarketPersistenceRule：市场观测台数据。
 */
export interface MarketPersistenceRule {
  type: MarketPersistenceRuleType;
  thresholds: MarketPersistenceThresholds;
  baseline: MarketPersistenceBaseline;
}

export type LimitEcologyRuleType = typeof LimitEcologyRuleType[keyof typeof LimitEcologyRuleType];


export const LimitEcologyRuleType = {
  LIMIT_ECOLOGY: 'LIMIT_ECOLOGY',
} as const;

/**
 * LimitEcologyThresholds：市场观测台数据。
 */
export interface LimitEcologyThresholds {
  sealRateMin: number;
  multiBoardMin: number;
  limitDownMax: number;
  sealRateInvalid: number;
  multiBoardInvalid: number;
  limitDownInvalid: number;
}

/**
 * LimitEcologyBaseline：市场观测台数据。
 */
export interface LimitEcologyBaseline {
  sealRate: number;
  multiBoardCount: number;
  limitDownCount: number;
}

/**
 * LimitEcologyRule：市场观测台数据。
 */
export interface LimitEcologyRule {
  type: LimitEcologyRuleType;
  thresholds: LimitEcologyThresholds;
  baseline: LimitEcologyBaseline;
}

export type HypothesisRule = MarketPersistenceRule | DirectionPersistenceRule | DirectionRepairRule | LimitEcologyRule | DirectionSpreadRule;

export type HypothesisResult = typeof HypothesisResult[keyof typeof HypothesisResult];


export const HypothesisResult = {
  PENDING: 'PENDING',
  CONFIRMED: 'CONFIRMED',
  NOT_CONFIRMED: 'NOT_CONFIRMED',
  INCONCLUSIVE: 'INCONCLUSIVE',
} as const;

/**
 * MarketPersistenceActual：市场观测台数据。
 */
export interface MarketPersistenceActual {
  advanceShare: number;
  aboveMa20Share: number;
  turnoverCny: number;
}

/**
 * LimitEcologyActual：市场观测台数据。
 */
export interface LimitEcologyActual {
  sealRate: number;
  multiBoardCount: number;
  limitDownCount: number;
}

export type HypothesisActual = MarketPersistenceActual | DirectionPersistenceActual | DirectionRepairActual | LimitEcologyActual | DirectionSpreadActual;

/**
 * Hypothesis：市场观测台数据。
 */
export interface Hypothesis {
  id: string;
  createdOn: string;
  dueOn: string;
  mode: HypothesisMode;
  engineVersion?: string;
  title: string;
  confirmation: string;
  invalidation: string;
  risk: string;
  counterEvidence: string;
  resultNote: string;
  scope: HypothesisScope;
  rule: HypothesisRule | null;
  result: HypothesisResult;
  settledOn: string | null;
  actual: HypothesisActual | null;
}

/**
 * 游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
 * 用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
 */
export interface HypothesisPage {
  /** 本页条目 */
  items: Hypothesis[];
  /** 下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null */
  nextCursor: string | null;
}

export type HypothesisRuleType = typeof HypothesisRuleType[keyof typeof HypothesisRuleType];


export const HypothesisRuleType = {
  MARKET_PERSISTENCE: 'MARKET_PERSISTENCE',
  DIRECTION_PERSISTENCE: 'DIRECTION_PERSISTENCE',
  DIRECTION_REPAIR: 'DIRECTION_REPAIR',
  LIMIT_ECOLOGY: 'LIMIT_ECOLOGY',
  DIRECTION_SPREAD: 'DIRECTION_SPREAD',
} as const;

/**
 * IndexBar：市场观测台数据。
 */
export interface IndexBar {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  preClose: number;
  return1d: number;
  amountCny: number;
}

export type InsiderTimelineItemKind = typeof InsiderTimelineItemKind[keyof typeof InsiderTimelineItemKind];


export const InsiderTimelineItemKind = {
  insider: 'insider',
} as const;

/**
 * docs/05 的个股时间线包含内部人交易，保留每笔交易的自然键与事实。
 */
export interface InsiderTimelineItem {
  kind: InsiderTimelineItemKind;
  at: string;
  insiderTrade: InsiderTrade;
}

export type ItemFeedbackRequestReason = typeof ItemFeedbackRequestReason[keyof typeof ItemFeedbackRequestReason];


export const ItemFeedbackRequestReason = {
  useless: 'useless',
  incorrect: 'incorrect',
} as const;

export interface ItemFeedbackRequest {
  editionId: string;
  itemId: string;
  reason: ItemFeedbackRequestReason;
}

/**
 * MarketAppearance：市场观测台数据。
 */
export interface MarketAppearance {
  name: string;
  top3Appearances: number;
}

/**
 * MarketBoardSegment：市场观测台数据。
 */
export interface MarketBoardSegment {
  name: string;
  sampleCount: number;
  return1d: number;
  advanceShare: number;
  aboveMa20Share: number;
  /** 换手率为0–1小数。 */
  turnoverRateMedian: number | null;
}

/**
 * MarketCapSegment：市场观测台数据。
 */
export interface MarketCapSegment {
  name: string;
  sampleCount: number;
  return1d: number;
  advanceShare: number;
  medianMarketCapCny: number;
}

/**
 * MarketComponentCrossCheck：市场观测台数据。
 */
export interface MarketComponentCrossCheck {
  return1d: number | null;
  return5d: number | null;
  return20d: number | null;
  delta1dVsOfficial: number | null;
}

export type MarketDataStatusMissingItem = typeof MarketDataStatusMissingItem[keyof typeof MarketDataStatusMissingItem];


export const MarketDataStatusMissingItem = {
  moneyflow: 'moneyflow',
  limitDetail: 'limitDetail',
  etfGroups: 'etfGroups',
  etfShares: 'etfShares',
  directions: 'directions',
} as const;

/**
 * MarketDataStatus：市场观测台数据。
 */
export interface MarketDataStatus {
  complete: boolean;
  missing: MarketDataStatusMissingItem[];
}

export type MarketDaySchemaVersion = typeof MarketDaySchemaVersion[keyof typeof MarketDaySchemaVersion];


export const MarketDaySchemaVersion = {
  NUMBER_1: 1,
} as const;

/**
 * MarketIndex：市场观测台数据。
 */
export interface MarketIndex {
  code: string;
  name: string;
  close: number;
  return1d: number;
  amountCny: number;
}

/**
 * MarketOverview：市场观测台数据。
 */
export interface MarketOverview {
  sampleCount: number;
  advanceCount: number;
  declineCount: number;
  flatCount: number;
  newHigh20Count: number;
  newLow20Count: number;
  advanceShare: number;
  medianReturn1d: number;
  aboveMa20Share: number;
  turnoverCny: number;
  turnoverPrevCny: number;
  turnoverChange: number;
  turnoverMedian20Cny: number;
  totalMarketCapCny: number;
  /** 换手率为0–1小数，旧数据百分数除以100。 */
  medianTurnoverRate: number | null;
  medianPeTtm: number | null;
  medianPb: number | null;
}

export type MarketTemperatureVersion = typeof MarketTemperatureVersion[keyof typeof MarketTemperatureVersion];


export const MarketTemperatureVersion = {
  'transparent-close-v1': 'transparent-close-v1',
} as const;

/**
 * MarketTemperatureParts：市场观测台数据。
 */
export interface MarketTemperatureParts {
  breadth: number;
  trend: number;
  limitEcology: number;
  liquidity: number;
  positiveIndices: number;
}

/**
 * MarketTemperature：市场观测台数据。
 */
export interface MarketTemperature {
  value: number;
  version: MarketTemperatureVersion;
  parts: MarketTemperatureParts;
  boundary: string;
}

export type MarketSentimentVersion = typeof MarketSentimentVersion[keyof typeof MarketSentimentVersion];


export const MarketSentimentVersion = {
  'transparent-ecology-v2': 'transparent-ecology-v2',
} as const;

export type MarketSentimentDimensionKey = typeof MarketSentimentDimensionKey[keyof typeof MarketSentimentDimensionKey];


export const MarketSentimentDimensionKey = {
  limitHeight: 'limitHeight',
  limitUpCount: 'limitUpCount',
  sealRate: 'sealRate',
  advancementRate: 'advancementRate',
  previousLimitPremium: 'previousLimitPremium',
  lossEffect: 'lossEffect',
  breadth: 'breadth',
  upDownBalance: 'upDownBalance',
  turnover: 'turnover',
} as const;

/**
 * MarketSentimentDimension：市场观测台数据。
 */
export interface MarketLossEffectInput {
  limitDown: number;
  largeLoss: number;
}

export interface MarketUpDownBalanceInput {
  limitUp: number;
  limitDown: number;
}

export interface MarketSentimentDimension {
  key: MarketSentimentDimensionKey;
  label: string;
  weight: number;
  input: number | MarketLossEffectInput | MarketUpDownBalanceInput | null;
  unit: string;
  score: number;
  formula: string;
}

/**
 * MarketSentiment：市场观测台数据。
 */
export interface MarketSentiment {
  value: number;
  version: MarketSentimentVersion;
  dimensions: MarketSentimentDimension[];
  boundary: string;
}

export type MarketStyleVersion = typeof MarketStyleVersion[keyof typeof MarketStyleVersion];


export const MarketStyleVersion = {
  'transparent-style-v1': 'transparent-style-v1',
} as const;

export type MarketStyleGroupName = typeof MarketStyleGroupName[keyof typeof MarketStyleGroupName];


export const MarketStyleGroupName = {
  高位加速: '高位加速',
  趋势延续: '趋势延续',
  低位修复: '低位修复',
  中间状态: '中间状态',
} as const;

/**
 * MarketStyleGroup：市场观测台数据。
 */
export interface MarketStyleGroup {
  name: MarketStyleGroupName;
  count: number;
  share: number;
  meanReturn1d: number;
  medianReturn1d: number;
}

/**
 * MarketStyle：市场观测台数据。
 */
export interface MarketStyle {
  version: MarketStyleVersion;
  groups: MarketStyleGroup[];
  trendStrongShare: number;
}

/**
 * MarketProviderDetail：市场观测台数据。
 */
export interface MarketProviderDetail {
  rowCount: number;
  limitUpCount: number;
  limitDownCount: number;
  openedOrTouchedNotClosedCount: number;
  classification: string;
}

/**
 * MarketHeightDistribution：市场观测台数据。
 */
export interface MarketHeightDistribution {
  height: number;
  count: number;
  names: string[];
}

/**
 * MarketIndustryCluster：市场观测台数据。
 */
export interface MarketIndustryCluster {
  industry: string;
  count: number;
  maxBoardHeight: number;
  names: string[];
}

export type MarketLimitDetailType = typeof MarketLimitDetailType[keyof typeof MarketLimitDetailType];


export const MarketLimitDetailType = {
  U: 'U',
  D: 'D',
  Z: 'Z',
} as const;

/**
 * MarketLimitDetail：市场观测台数据。
 */
export interface MarketLimitDetail {
  type: MarketLimitDetailType;
  firstTime: string | null;
  lastTime: string | null;
  upStat: string | null;
  openTimes: number | null;
  limitTimes: number | null;
  sealedAmountCny: number | null;
}

/**
 * MarketStock：市场观测台数据。
 */
export interface MarketStock {
  code: string;
  name: string;
  industry: string;
  board: string;
  return1d: number;
  boardHeight: number;
  amountCny: number;
  limitDetail: MarketLimitDetail | null;
}

export type MarketProgressionProgressionState = typeof MarketProgressionProgressionState[keyof typeof MarketProgressionProgressionState];


export const MarketProgressionProgressionState = {
  连续晋级: '连续晋级',
  首板建立: '首板建立',
  重新封板: '重新封板',
  晋级未完成: '晋级未完成',
} as const;

/**
 * MarketProgression：市场观测台数据。
 */
export type MarketProgression = MarketStock & {
  previousBoardHeight: number;
  progressionState: MarketProgressionProgressionState;
};

/**
 * MarketLimitEcology：市场观测台数据。
 */
export interface MarketLimitEcology {
  limitUpCount: number;
  limitDownCount: number;
  touchedCount: number;
  failedCount: number;
  maxBoardHeight: number;
  firstBoardCount: number;
  multiBoardCount: number;
  previousLimitUpCount: number;
  advancementCount: number;
  largeLoss7Count: number;
  sealRate: number | null;
  advancementRate: number | null;
  previousLimitPremium: number | null;
  providerDetail: MarketProviderDetail | null;
  heightDistribution: MarketHeightDistribution[];
  industryClusters: MarketIndustryCluster[];
  progression: MarketProgression[];
  failedPromotions: MarketProgression[];
  leaders: MarketStock[];
  limitDownSamples: MarketStock[];
  largeLossSamples: MarketStock[];
}

/**
 * MarketMoneyflow：市场观测台数据。
 */
export interface MarketMoneyflow {
  marketNetCny: number;
  marketNetRate: number;
  extraLargeNetCny: number;
  largeNetCny: number;
  mediumNetCny: number;
  smallNetCny: number;
  stockCoverageCount: number | null;
  classificationBoundary: string;
}

export type MarketIndustryLifecycle = typeof MarketIndustryLifecycle[keyof typeof MarketIndustryLifecycle];


export const MarketIndustryLifecycle = {
  趋势扩散: '趋势扩散',
  高位分歧: '高位分歧',
  修复延续: '修复延续',
  退潮观察: '退潮观察',
  低位修复: '低位修复',
  方向待明: '方向待明',
} as const;

/**
 * MarketIndustry：市场观测台数据。
 */
export interface MarketIndustry {
  name: string;
  sampleCount: number;
  return1d: number;
  medianReturn1d: number;
  advanceShare: number;
  aboveMa20Share: number;
  amountCny: number;
  amountShare: number;
  return5d: number | null;
  return20d: number | null;
  medianPeTtm: number | null;
  medianPb: number | null;
  limitUpCount: number;
  limitDownCount: number;
  lifecycle: MarketIndustryLifecycle;
}

/**
 * MarketTheme：市场观测台数据。
 */
export interface MarketTheme {
  name: string;
  members: string[];
  sampleCount: number;
  return1d: number;
  advanceShare: number;
  aboveMa20Share: number;
  amountShare: number;
  return5d: number | null;
  return20d: number | null;
  limitUpCount: number;
  limitDownCount: number;
}

/**
 * MarketDirectionLeader：市场观测台数据。
 */
export interface MarketDirectionLeader {
  code: string;
  name: string;
  return1d: number;
  amountCny: number;
}

/**
 * MarketDirectionLaggard：市场观测台数据。
 */
export interface MarketDirectionLaggard {
  code: string;
  name: string;
  return1d: number;
}

export type MarketDirectionState = typeof MarketDirectionState[keyof typeof MarketDirectionState];


export const MarketDirectionState = {
  趋势扩散: '趋势扩散',
  高位分歧: '高位分歧',
  低位修复: '低位修复',
  趋势转弱: '趋势转弱',
  方向待明: '方向待明',
} as const;

/**
 * MarketDirection：市场观测台数据。
 */
export interface MarketDirection {
  name: string;
  sourceIndexCode: string;
  memberCount: number;
  /** 来源快照的完整成员代码，用于核对假设生成日至结算日的成员变化；不可用行情覆盖子集替代。旧数据无法核实时省略。 */
  memberCodes?: string[];
  coveredCount: number;
  return1d: number;
  medianReturn1d: number;
  advanceShare: number;
  aboveMa20Share: number;
  amountCny: number;
  amountShare: number;
  amount20dPercentile: number;
  relativeVsAllA: number;
  return5d: number | null;
  return20d: number | null;
  moneyflowProxyCny: number | null;
  /**
     * 有资金流数据的成员数 / memberCount；无法核实股数时为空。
     * @minimum 0
     * @maximum 1
     */
  moneyflowCoverage: number | null;
  limitUpCount: number;
  limitDownCount: number;
  loss5Count: number;
  componentCrossCheck: MarketComponentCrossCheck;
  leaders: MarketDirectionLeader[];
  laggards: MarketDirectionLaggard[];
  state: MarketDirectionState;
}

/**
 * MarketDirections：市场观测台数据。
 */
export interface MarketDirections {
  membershipAsOf: string;
  items: MarketDirection[];
}

/**
 * MarketEtfRepresentative：市场观测台数据。
 */
export interface MarketEtfRepresentative {
  code: string;
  name: string;
  return1d: number;
  amountCny: number;
  shareDelta: number | null;
}

/**
 * MarketEtfGroup：市场观测台数据。
 */
export interface MarketEtfGroup {
  name: string;
  rule: string;
  sampleCount: number;
  amountWeightedReturn1d: number;
  medianReturn1d: number;
  amountCny: number;
  medianReturn5d: number | null;
  medianReturn20d: number | null;
  shareCoverage: number | null;
  shareIncreaseCount: number | null;
  shareDecreaseCount: number | null;
  representative: MarketEtfRepresentative;
}

/**
 * MarketEtfGroups：市场观测台数据。
 */
export interface MarketEtfGroups {
  groups: MarketEtfGroup[];
}

/**
 * MarketSegments：市场观测台数据。
 */
export interface MarketSegments {
  boards: MarketBoardSegment[];
  marketCap: MarketCapSegment[];
}

/**
 * MarketStocks：市场观测台数据。
 */
export interface MarketStocks {
  top: MarketStock[];
  bottom: MarketStock[];
}

export type MarketTechnicalLevelKind = typeof MarketTechnicalLevelKind[keyof typeof MarketTechnicalLevelKind];


export const MarketTechnicalLevelKind = {
  dynamic_average: 'dynamic_average',
  observed_low: 'observed_low',
  observed_high: 'observed_high',
} as const;

/**
 * MarketTechnicalLevel：市场观测台数据。
 */
export interface MarketTechnicalLevel {
  label: string;
  value: number;
  kind: MarketTechnicalLevelKind;
}

/**
 * MarketTechnical：市场观测台数据。
 */
export interface MarketTechnical {
  indexCode: string;
  asOf: string;
  close: number;
  ma5: number;
  ma10: number;
  ma20: number;
  atr20: number;
  support: MarketTechnicalLevel[];
  resistance: MarketTechnicalLevel[];
  confirmationRule: string;
  confirmationNow: boolean;
}

/**
 * MarketQuestion：市场观测台数据。
 */
export interface MarketQuestion {
  title: string;
  text: string;
}

/**
 * MarketStateSummary：市场观测台数据。
 */
export interface MarketStateSummary {
  headline: string;
  text: string;
  support: string;
  counterEvidence: string;
  tags: string[];
  risks: MarketQuestion[];
  nextValidations: MarketQuestion[];
}

/**
 * MarketRankedReturn：市场观测台数据。
 */
export interface MarketRankedReturn {
  name: string;
  return1d: number;
}

/**
 * MarketDirectionRelative：市场观测台数据。
 */
export interface MarketDirectionRelative {
  name: string;
  relativeVsAllA: number;
}

/**
 * MarketDaySummary：市场观测台数据。
 */
export interface MarketDaySummary {
  date: string;
  headline: string;
  complete: boolean;
  temperature: number;
  sentiment: number;
  advanceShare: number;
  aboveMa20Share: number;
  medianReturn1d: number;
  turnoverCny: number;
  trendStrongShare: number;
  advanceCount: number;
  declineCount: number;
  limitUpCount: number;
  limitDownCount: number;
  maxBoard: number;
  sealRate: number | null;
  topDirections: MarketRankedReturn[] | null;
  topIndustries: MarketRankedReturn[];
  directionsRelative: MarketDirectionRelative[] | null;
}

/**
 * MarketEdgeChange：市场观测台数据。
 */
export interface MarketEdgeChange {
  change: number;
  state: string;
}

/**
 * MarketEvolutionEdgeChanges：市场观测台数据。
 */
export interface MarketEvolutionEdgeChanges {
  turnover: MarketEdgeChange | null;
  advanceShare: MarketEdgeChange | null;
  limitUpCount: MarketEdgeChange | null;
  maxBoard: MarketEdgeChange | null;
}

export type MarketEvolutionSummaryWindowDays = typeof MarketEvolutionSummaryWindowDays[keyof typeof MarketEvolutionSummaryWindowDays];


export const MarketEvolutionSummaryWindowDays = {
  NUMBER_5: 5,
} as const;

/**
 * MarketEvolutionSummary：市场观测台数据。
 */
export interface MarketEvolutionSummary {
  turnoverMedianCny: number;
  temperatureRange: number[];
  advanceShareRange: number[];
  directions: MarketAppearance[];
  industries: MarketAppearance[];
  /**
     * 有方向数据的交易日数量，页面显示覆盖 n/5。
     * @minimum 0
     * @maximum 5
     */
  directionCoverageDays: number;
  windowDays: MarketEvolutionSummaryWindowDays;
}

/**
 * MarketTransmissionPart：市场观测台数据。
 */
export interface MarketTransmissionPart {
  name: string;
  text: string;
}

/**
 * MarketTransmission：市场观测台数据。
 */
export interface MarketTransmission {
  liquidityBreadth: MarketTransmissionPart;
  direction: MarketTransmissionPart | null;
  limitCluster: MarketTransmissionPart;
  negativeFeedback: MarketTransmissionPart;
}

/**
 * MarketEvolutionSignal：市场观测台数据。
 */
export interface MarketEvolutionSignal {
  name: string;
  currentState: string;
  confirmation: string;
  invalidation: string;
}

/**
 * MarketEvolutionSignals：市场观测台数据。
 */
export interface MarketEvolutionSignals {
  liquidity: MarketEvolutionSignal;
  direction: MarketEvolutionSignal | null;
  progression: MarketEvolutionSignal;
  breadth: MarketEvolutionSignal;
}

/**
 * MarketEvolution：市场观测台数据。
 */
export interface MarketEvolution {
  /**
     * 固定最近五个交易日；缺方向时保留该日，不跨缺口比较。
     * @minItems 5
     * @maxItems 5
     */
  rows: MarketDaySummary[];
  edgeChanges: MarketEvolutionEdgeChanges;
  summary: MarketEvolutionSummary;
  transmission: MarketTransmission;
  signals: MarketEvolutionSignals;
}

/**
 * MarketValidationCount：市场观测台数据。
 */
export interface MarketValidationCount {
  ruleType: HypothesisRuleType | null;
  settledCount: number;
  confirmedCount: number;
  notConfirmedCount: number;
  inconclusiveCount: number;
  confirmedShare: number | null;
  notConfirmedShare: number | null;
  inconclusiveShare: number | null;
}

/**
 * MarketValidationStats：市场观测台数据。
 */
export interface MarketValidationStats {
  cumulative: MarketValidationCount[];
  last20TradingDays: MarketValidationCount[];
}

/**
 * MarketValidation：市场观测台数据。
 */
export interface MarketValidation {
  settledToday: string[];
  createdToday: string[];
  stats: MarketValidationStats;
}

/**
 * MarketDay：市场观测台数据。
 */
export interface MarketDay {
  schemaVersion: MarketDaySchemaVersion;
  date: string;
  previousDate: string;
  generatedAt: string;
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

/**
 * 游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
 * 用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
 */
export interface MarketDaySummaryPage {
  /** 本页条目 */
  items: MarketDaySummary[];
  /** 下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null */
  nextCursor: string | null;
}

/**
 * MarketDayWrite：市场观测台数据。
 */
export interface MarketDayWrite {
  day: MarketDay;
  summary: MarketDaySummary;
}

export type MarketEventStatus = typeof MarketEventStatus[keyof typeof MarketEventStatus];


export const MarketEventStatus = {
  confirmed: 'confirmed',
  pending: 'pending',
} as const;

/**
 * MarketEvent：市场观测台数据。
 */
export interface MarketEvent {
  id: string;
  title: string;
  sourceLabel: string;
  sourceUrl: string | null;
  confirmation: string;
  invalidation: string;
  startDate: string;
  endDate: string;
  status: MarketEventStatus;
  watchItems: string[];
  aShareMappings: string[];
}

/**
 * MarketReferenceMetric：市场观测台数据。
 */
export interface MarketReferenceMetric {
  id: string;
  label: string;
  group: string;
  boundary?: string;
  definition: string;
  formula: string;
  unit: string;
  source: string;
}

/**
 * MarketReferenceDirection：市场观测台数据。
 */
export interface MarketReferenceDirection {
  name: string;
  code: string;
  sourceName: string;
  mappingNote: string;
}

/**
 * MarketReferenceEtfGroup：市场观测台数据。
 */
export interface MarketReferenceEtfGroup {
  name: string;
  pattern: string;
}

/**
 * MarketReferenceTheme：市场观测台数据。
 */
export interface MarketReferenceTheme {
  name: string;
  industries: string[];
}

/**
 * MarketReferenceIndex：市场观测台数据。
 */
export interface MarketReferenceIndex {
  name: string;
  code: string;
  technical?: boolean;
}

/**
 * MarketReferenceSource：市场观测台数据。
 */
export interface MarketReferenceSource {
  source: string;
  api: string;
  usage: string;
  optional: boolean;
}

/**
 * MarketReference：市场观测台数据。
 */
export interface MarketReference {
  metrics: MarketReferenceMetric[];
  directions: MarketReferenceDirection[];
  etfGroups: MarketReferenceEtfGroup[];
  themes: MarketReferenceTheme[];
  indices: MarketReferenceIndex[];
  sources: MarketReferenceSource[];
  limitations: string[];
  disclaimer: string;
}

/**
 * 新接口使用完整时间线，保留旧接口的返回类型，避免破坏已生成的客户端。
 */
export type NewsFullTimelineItem = ArticleTimelineItem | FilingTimelineItem | EarningsTimelineItem | InsiderTimelineItem;

export type UsNewsTopic = typeof UsNewsTopic[keyof typeof UsNewsTopic];


export const UsNewsTopic = {
  macro_fed: 'macro_fed',
  earnings: 'earnings',
  ai_semis: 'ai_semis',
  big_tech: 'big_tech',
  crypto: 'crypto',
  policy_geo: 'policy_geo',
  other: 'other',
} as const;

export type NewsRankedItem = NewsCuratedItem & {
  topic: UsNewsTopic;
};

export type NewsTickerArticle = NewsPromptItem & {
  source: string;
  publishedAt: string;
};

/**
 * 财报来源具有稳定条目 id，供 source_ids_exist 校验。
 */
export type NewsTickerEarnings = EarningsCard & {
  id: string;
};

export interface NewsTickerFiling {
  id: string;
  form: string;
  items: string[];
  digest: string | null;
}

export type NewsTimelineItem = ArticleTimelineItem | FilingTimelineItem | EarningsTimelineItem;

export type PaperSchemaVersion = typeof PaperSchemaVersion[keyof typeof PaperSchemaVersion];


export const PaperSchemaVersion = {
  NUMBER_1: 1,
} as const;

export type PaperKind = typeof PaperKind[keyof typeof PaperKind];


export const PaperKind = {
  empirical: 'empirical',
  theory: 'theory',
  survey: 'survey',
  system: 'system',
} as const;

/**
 * 书目信息：老档案只有英文标题是必填，未提供的字段可以缺省。
 */
export interface PaperMeta {
  title: string;
  titleZh?: string;
  authors?: string[];
  year?: number;
  venue?: string;
  version?: string;
  paperType?: string;
  paperKind?: PaperKind;
  studyDesign?: string;
  doi?: string | null;
  arxivId?: string | null;
  anthologyId?: string | null;
  sourceUrl?: string;
  pdfUrl?: string;
}

export type PaperVisibility = typeof PaperVisibility[keyof typeof PaperVisibility];


export const PaperVisibility = {
  public: 'public',
  private: 'private',
} as const;

export type PaperReviewStatus = typeof PaperReviewStatus[keyof typeof PaperReviewStatus];


export const PaperReviewStatus = {
  draft: 'draft',
  passed: 'passed',
  revise: 'revise',
} as const;

export type PaperReadingDepth = typeof PaperReadingDepth[keyof typeof PaperReadingDepth];


export const PaperReadingDepth = {
  R0: 'R0',
  R1: 'R1',
  R2: 'R2',
  R3: 'R3',
} as const;

export interface PaperStatus {
  visibility: PaperVisibility;
  review: PaperReviewStatus;
  readingDepth: PaperReadingDepth;
  nextAction: string;
  /** 内容更新日期；迁移按 docs/06 的依次回退规则取日期部分。 */
  updatedAt: string;
}

export interface PaperPrerequisite {
  term: string;
  explanation: string;
  example?: string;
}

export interface PaperExistingMethod {
  name: string;
  whatItDoes?: string;
  whyNotEnough?: string;
}

export interface PaperProblem {
  setup?: string;
  existingMethods?: PaperExistingMethod[];
  gap?: string;
}

export interface PaperMethodComponent {
  name: string;
  question?: string;
  how?: string;
  purpose?: string;
  caveat?: string;
  anchor?: string;
}

export interface PaperMethod {
  thesis?: string;
  pipeline?: string[];
  components?: PaperMethodComponent[];
}

export interface PaperExperimentTable {
  columns: string[];
  rows: string[][];
}

export interface PaperExperiment {
  setup?: string;
  table?: PaperExperimentTable;
  howToRead?: string;
  anchor?: string;
}

export interface PaperFinding {
  title: string;
  evidence?: string;
  interpretation?: string;
  caveat?: string;
  anchor?: string;
}

export interface PaperBottomLine {
  supports: string;
  doesNotSupport: string;
  memorable: string;
}

export interface PaperProjectConnection {
  translation?: string;
  safeDesign?: string;
}

/**
 * 迁移导读允许只保留已有部分；新草稿的要求在 PaperDraftGuide 中收紧。
 */
export interface PaperGuide {
  oneSentence?: string;
  readingGoal?: string;
  article?: string;
  prerequisites?: PaperPrerequisite[];
  problem?: PaperProblem;
  method?: PaperMethod;
  experiment?: PaperExperiment;
  findings?: PaperFinding[];
  bottomLine?: PaperBottomLine;
  limitations?: string[];
  openQuestions?: string[];
  projectConnection?: PaperProjectConnection | null;
}

export interface PaperReaderCheck {
  problem: string;
  gap: string;
  input: string;
  mechanism: string;
  output: string;
  boundary: string;
  openQuestion: string;
}

export type PaperClaimKind = typeof PaperClaimKind[keyof typeof PaperClaimKind];


export const PaperClaimKind = {
  method: 'method',
  result: 'result',
  limitation: 'limitation',
  definition: 'definition',
} as const;

export type PaperClaimOrigin = typeof PaperClaimOrigin[keyof typeof PaperClaimOrigin];


export const PaperClaimOrigin = {
  paper_supported: 'paper_supported',
  llm_inferred: 'llm_inferred',
  source_navigation: 'source_navigation',
} as const;

export interface PaperQuantity {
  text: string;
  sourceText: string;
  meaning: string;
}

/**
 * 一条原文主张；R1 表格转换时没有页内行号和摘录，不制造这些值。
 */
export interface PaperClaim {
  id: string;
  kind: PaperClaimKind;
  claim: string;
  metric?: string;
  condition?: string;
  anchor?: string;
  /** @minimum 1 */
  pdfPage?: number | null;
  /** 起止行号；新草稿由 paper_draft 校验两项及范围。 */
  sourceLines?: number[];
  sourceExcerpt?: string | null;
  claimOrigin?: PaperClaimOrigin;
  interpretationBoundary?: string;
  quantities?: PaperQuantity[];
}

export interface PaperArticleBlock {
  claimOrigin: PaperClaimOrigin;
  claimIds: string[];
}

export interface PaperEvidence {
  readerCheck?: PaperReaderCheck | null;
  claims?: PaperClaim[];
  articleBlocks?: PaperArticleBlock[];
  /** 旧文本抽取的行号不再逐行核验；重写后整个 evidence 换为 false。 */
  legacyAnchors?: boolean;
}

export type PaperSectionStatus = typeof PaperSectionStatus[keyof typeof PaperSectionStatus];


export const PaperSectionStatus = {
  read: 'read',
  skimmed: 'skimmed',
  unread: 'unread',
} as const;

export interface PaperSection {
  pages: string;
  role?: string;
  keyQuestion?: string;
  status?: PaperSectionStatus;
}

export interface PaperFigure {
  /** @minimum 1 */
  page: number;
  title: string;
  explanation?: string;
  takeaway?: string;
}

export interface PaperConcept {
  id: string;
  name: string;
  explanation?: string;
  whyItMatters?: string;
  dependsOn?: string[];
  anchor?: string;
  claimOrigin?: PaperClaimOrigin;
}

export type PaperCoverageStatus = typeof PaperCoverageStatus[keyof typeof PaperCoverageStatus];


export const PaperCoverageStatus = {
  complete: 'complete',
  partial: 'partial',
  missing: 'missing',
  not_applicable: 'not_applicable',
} as const;

export interface PaperCoverage {
  dimension: string;
  status: PaperCoverageStatus;
  evidence?: string;
}

export interface PaperAppraisalDimension {
  name: string;
  judgment?: string;
  status?: string;
  note?: string;
}

export interface PaperAppraisal {
  minimumClaim?: string;
  overclaimToAvoid?: string;
  dimensions?: PaperAppraisalDimension[];
}

export interface PaperStructure {
  /** @minimum 1 */
  pageCount?: number;
  sections?: PaperSection[];
  figures?: PaperFigure[];
  concepts?: PaperConcept[];
  coverage?: PaperCoverage[];
  appraisal?: PaperAppraisal;
  negativeResults?: string[];
}

export interface PaperOrientation {
  whatItIs?: string;
  analogy?: string;
  whyItMatters?: string;
  notTheSameAs?: string[];
  thirtySecondStory?: string[];
}

export interface PaperMechanismStep {
  step: string;
  detail: string;
  input?: string;
  output?: string;
  anchor?: string;
}

export interface PaperDesignIdea {
  title: string;
  explanation: string;
  anchor?: string;
}

export interface PaperQuestionAnswer {
  question: string;
  answer: string;
}

export interface PaperLearning {
  orientation?: PaperOrientation;
  mechanismSteps?: PaperMechanismStep[];
  designPhilosophy?: (string | PaperDesignIdea)[];
  activeRecall?: PaperQuestionAnswer[];
  expertQa?: PaperQuestionAnswer[];
}

export type PaperCodeStatus = typeof PaperCodeStatus[keyof typeof PaperCodeStatus];


export const PaperCodeStatus = {
  verified: 'verified',
  unverified: 'unverified',
  not_found: 'not_found',
} as const;

export interface PaperCode {
  status: PaperCodeStatus;
  url?: string | null;
  note?: string;
  checkedAt?: string | null;
}

export interface PaperSecondary {
  title: string;
  note?: string;
}

export interface PaperResources {
  landingPage?: string;
  code?: PaperCode;
  secondary?: PaperSecondary[];
}

export interface PaperCitation {
  title: string;
  why: string;
}

export interface PaperCitations {
  backward?: PaperCitation[];
  forward?: PaperCitation[];
}

export interface PaperRelation {
  target: string;
  type: string;
  note?: string;
}

/**
 * 单篇公开内容。私人笔记、解释卡、老阅读卡只存在 PaperPrivate。
 */
export interface Paper {
  schemaVersion?: PaperSchemaVersion;
  id: string;
  meta: PaperMeta;
  status: PaperStatus;
  spaces?: string[];
  guide?: PaperGuide;
  evidence?: PaperEvidence;
  structure?: PaperStructure;
  learning?: PaperLearning;
  resources?: PaperResources;
  citations?: PaperCitations;
  relations?: PaperRelation[];
  /** 新 AI 草稿落库时带运行时出处；旧论文没有可靠出处时不补造。 */
  generatedBy?: GeneratedBy;
}

export interface PaperArxivUploadRequest {
  arxivUrl: string;
}

export interface PaperAskRequest {
  question: string;
}

export type PaperDraftMeta = PaperMeta & ({
  titleZh: string;
  authors: string[];
  year: number;
  venue: string;
  version: string;
  paperType: string;
  paperKind: PaperKind;
  studyDesign: string;
  sourceUrl: string;
  doi: string | null;
  arxivId: string | null;
  anthologyId: string | null;
});

export type PaperDraftPrerequisite = PaperPrerequisite & {
  example: string;
};

export type PaperDraftGuide = PaperGuide & {
  oneSentence: string;
  readingGoal: string;
  /** 1800–3000 汉字是目标，不是硬上限；非典型论文允许更短。 */
  article: string;
  prerequisites: PaperDraftPrerequisite[];
  bottomLine: PaperBottomLine;
  limitations: string[];
};

export type PaperDraftClaim = PaperClaim & {
  metric: string;
  anchor: string;
  condition: string;
  /** @minimum 1 */
  pdfPage: number;
  sourceLines: number[];
  claimOrigin: PaperClaimOrigin;
  interpretationBoundary: string;
  quantities: PaperQuantity[];
};

export type PaperDraftEvidence = PaperEvidence & {
  readerCheck: PaperReaderCheck;
  claims: PaperDraftClaim[];
  articleBlocks: PaperArticleBlock[];
};

export type PaperDraftSection = PaperSection & {
  role: string;
  keyQuestion: string;
  status: PaperSectionStatus;
};

export type PaperDraftFigure = PaperFigure & {
  explanation: string;
};

export type PaperDraftConcept = PaperConcept & {
  explanation: string;
  anchor: string;
  claimOrigin: PaperClaimOrigin;
};

export type PaperDraftStructure = PaperStructure & {
  /** @minimum 1 */
  pageCount: number;
  sections: PaperDraftSection[];
  figures: PaperDraftFigure[];
  concepts: PaperDraftConcept[];
};

export type PaperDraftCode = PaperCode & ({
  url: string | null;
  note: string;
  checkedAt: string | null;
});

export type PaperDraftResources = PaperResources & {
  landingPage: string;
  code: PaperDraftCode;
};

export interface PaperDraft {
  meta: PaperDraftMeta;
  guide: PaperDraftGuide;
  evidence: PaperDraftEvidence;
  structure: PaperDraftStructure;
  resources: PaperDraftResources;
  generatedBy?: GeneratedBy;
}

export interface PaperAuthorInput {
  paperId: string;
  knownMeta: PaperMeta | null;
  pages: string;
  previousDraft: PaperDraft | null;
  problems: string[];
  instructions: string | null;
}

export type PaperMastery = typeof PaperMastery[keyof typeof PaperMastery];


export const PaperMastery = {
  pending: 'pending',
  confirmed: 'confirmed',
} as const;

export interface PaperExplanation {
  id: string;
  question: string;
  answer: string;
  pages: number[];
  status: PaperMastery;
  createdAt: string;
  /** 保存 AI 回答时保留该次问答的运行时出处。 */
  generatedBy?: GeneratedBy;
}

/**
 * 新AI解释卡沿用原QA出处；旧数据缺省，不由API编造模型信息。
 */
export interface PaperExplanationCreate {
  question: string;
  answer: string;
  pages: number[];
  generatedBy?: GeneratedBy;
}

export interface PaperExplanationPatch {
  status: PaperMastery;
}

export interface PaperIndependentSourceCheck {
  /** @minimum 1 */
  pdfPage: number;
  sourceExcerpt: string;
  minimumClaim: string;
  counterexampleOrLimit: string;
  comparisonToArticle: string;
}

export interface PaperLegacyCard {
  title: string;
  markdown: string;
}

/**
 * 列表摘要由计算任务与 Paper 一起写入；原文缺省的展示字段用 null。
 */
export interface PaperSummary {
  id: string;
  title: string;
  titleZh: string | null;
  year: number | null;
  venue: string | null;
  oneSentence: string | null;
  spaces: string[];
  readingDepth: PaperReadingDepth;
  paperKind: PaperKind | null;
  paperType: string | null;
  visibility: PaperVisibility;
  review: PaperReviewStatus;
  updatedAt: string;
  hasCode: boolean;
  conceptCount: number;
}

/**
 * 游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
 * 用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
 */
export interface PaperPage {
  /** 本页条目 */
  items: PaperSummary[];
  /** 下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null */
  nextCursor: string | null;
}

export interface PaperPatch {
  visibility?: PaperVisibility;
  spaces?: string[];
  readingDepth?: PaperReadingDepth;
  nextAction?: string;
}

export type PaperPrivateSchemaVersion = typeof PaperPrivateSchemaVersion[keyof typeof PaperPrivateSchemaVersion];


export const PaperPrivateSchemaVersion = {
  NUMBER_1: 1,
} as const;

export interface PaperPrivate {
  schemaVersion: PaperPrivateSchemaVersion;
  mastery: PaperMastery;
  notes: string;
  explanations: PaperExplanation[];
  legacyCards: PaperLegacyCard[];
}

export interface PaperPrivateWrite {
  mastery: PaperMastery;
  notes: string;
}

export interface PaperQaInput {
  question: string;
  guide: PaperGuide;
  claims: PaperClaim[];
  pages: string;
}

export interface PaperQaOutput {
  answer: string;
  pages: number[];
  generatedBy?: GeneratedBy;
}

export type PaperReviewCheckStatus = typeof PaperReviewCheckStatus[keyof typeof PaperReviewCheckStatus];


export const PaperReviewCheckStatus = {
  pass: 'pass',
  fail: 'fail',
  not_applicable: 'not_applicable',
} as const;

export interface PaperReviewCheck {
  status: PaperReviewCheckStatus;
  evidence: string;
}

export interface PaperReviewChecks {
  identity: PaperReviewCheck;
  explanation: PaperReviewCheck;
  method: PaperReviewCheck;
  results: PaperReviewCheck;
  boundaries: PaperReviewCheck;
  sources: PaperReviewCheck;
}

export type PaperReviewDecision = typeof PaperReviewDecision[keyof typeof PaperReviewDecision];


export const PaperReviewDecision = {
  pass: 'pass',
  revise: 'revise',
  escalate: 'escalate',
} as const;

export type PaperReviewFindingSeverity = typeof PaperReviewFindingSeverity[keyof typeof PaperReviewFindingSeverity];


export const PaperReviewFindingSeverity = {
  P0: 'P0',
  P1: 'P1',
  P2: 'P2',
} as const;

export interface PaperReviewFinding {
  severity: PaperReviewFindingSeverity;
  location: string;
  fix: string;
}

export interface PaperReviewContent {
  decision: PaperReviewDecision;
  readerRestatement: string;
  independentSourceCheck: PaperIndependentSourceCheck;
  sampledClaimIds: string[];
  checks: PaperReviewChecks;
  findings: PaperReviewFinding[];
  pagesChecked: number[];
  visualPagesChecked: number[];
}

export interface PaperReviewInput {
  paperId: string;
  paper: Paper | PaperDraft;
  pages: string;
  pageImages: number[];
}

export interface PaperReviewOutput {
  decision: PaperReviewDecision;
  readerRestatement: string;
  independentSourceCheck: PaperIndependentSourceCheck;
  sampledClaimIds: string[];
  checks: PaperReviewChecks;
  findings: PaperReviewFinding[];
  pagesChecked: number[];
  visualPagesChecked: number[];
  generatedBy?: GeneratedBy;
}

export interface PaperReviseRequest {
  instructions: string;
}

export interface PaperSearchItem {
  id: string;
  title: string;
  titleZh: string | null;
  authors: string[];
  oneSentence: string | null;
  concepts: string[];
  /** 研究空间的展示名称，供本地全文搜索。 */
  spaces: string[];
}

export interface PaperSpace {
  id: string;
  label: string;
  shortLabel: string;
  color: string;
  description: string;
  aliases: string[];
  paperCount: number;
}

export type PaperUploadStatus = typeof PaperUploadStatus[keyof typeof PaperUploadStatus];


export const PaperUploadStatus = {
  queued: 'queued',
  extracting: 'extracting',
  authoring: 'authoring',
  checking: 'checking',
  reviewing: 'reviewing',
  ready: 'ready',
  failed: 'failed',
} as const;

export interface PaperUploadPatch {
  status?: PaperUploadStatus;
  error?: string | null;
  paperId?: string;
}

export interface PaperWrite {
  paper: Paper;
  summary: PaperSummary;
}

export interface PapersCatalogStats {
  paperCount: number;
  spaceCount: number;
  conceptCount: number;
  edgeCount: number;
}

export interface PapersCatalog {
  stats: PapersCatalogStats;
  spaces: PaperSpace[];
  papers: PaperSummary[];
}

/**
 * 错误响应的正文（application/problem+json，RFC 9457）。
 * 各接口统一用 HubHttp.ErrorResponse 声明错误（OpenAPI 里是 default 响应）。
 */
export interface Problem {
  /** 错误类型的 URI；没有专门类型时为 about:blank */
  type: string;
  /** 简短的错误标题，如“未实现” */
  title: string;
  /** HTTP 状态码 */
  status: number;
  /** 具体说明，如“未实现（任务 T14）” */
  detail: string;
}

export interface Review {
  decision: PaperReviewDecision;
  readerRestatement: string;
  independentSourceCheck: PaperIndependentSourceCheck;
  sampledClaimIds: string[];
  checks: PaperReviewChecks;
  findings: PaperReviewFinding[];
  pagesChecked: number[];
  visualPagesChecked: number[];
  id: string;
  createdAt: string;
  durationMs: number;
  generatedBy: GeneratedBy;
}

/**
 * 统计：由各任务自己决定写什么（条目数、AI 调用数、校验删掉了什么等）
 */
export type RunStats = {[key: string]: unknown};

/**
 * 运行状态：开始时写 running，结束时写 succeeded 或 failed
 */
export type RunStatus = typeof RunStatus[keyof typeof RunStatus];


export const RunStatus = {
  running: 'running',
  succeeded: 'succeeded',
  failed: 'failed',
} as const;

/**
 * 计算任务的一次运行（runs 表，docs/09 第 3、7、9 节）。
 * 任务开始和结束各写一次 PUT /v1/internal/runs/{runId}（同一 id 覆盖）。
 */
export interface Run {
  /** 运行 ID，由任务生成，如 news-morning-2026-09-30-<GitHub 运行号> */
  id: string;
  /** 任务名，如 news-morning、market-eod、papers-ingest、data-export；月度预算超支提醒记为 budget-alert */
  job: string;
  /** 这次运行处理的业务日期（如早报日期、A 股交易日） */
  date: string;
  status: RunStatus;
  /** 开始时间 */
  startedAt: string;
  /** 结束时间；还在运行时为 null */
  finishedAt: string | null;
  /** 统计：由各任务自己决定写什么（条目数、AI 调用数、校验删掉了什么等） */
  stats: RunStats;
  /** 错误摘要；没有出错时为 null */
  error: string | null;
}

/**
 * GET /v1/runs 的一页
 */
export interface RunPage {
  /** 本页条目 */
  items: Run[];
  /** 下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null */
  nextCursor: string | null;
}

export interface SearchIndex {
  papers: PaperSearchItem[];
}

export type TickerDigestInputMode = typeof TickerDigestInputMode[keyof typeof TickerDigestInputMode];


export const TickerDigestInputMode = {
  daily: 'daily',
  weekly: 'weekly',
} as const;

export interface TickerDigestInput {
  mode: TickerDigestInputMode;
  symbol: string;
  name: string;
  changeText: string | null;
  withSector: boolean | null;
  sectorEtf: string | null;
  articles: NewsTickerArticle[];
  filings: NewsTickerFiling[];
  earnings: NewsTickerEarnings[] | null;
}

export interface TickerDigestOutput {
  whatHappened: string;
  whyItMatters: string | null;
  /** 0–3 个来源，由能力运行时按提示词检查。 */
  sourceIds: string[];
  points: TickerDigestPoint[];
  generatedBy?: GeneratedBy;
}

export interface Upload {
  id: string;
  filename: string | null;
  arxivUrl: string | null;
  status: PaperUploadStatus;
  error: string | null;
  createdAt: string;
  updatedAt: string;
  /** 定下后立即写入；重试沿用，避免误加版本后缀。 */
  paperId?: string;
}

export interface UsRankInput {
  candidates: NewsCandidate[];
  minItems: number;
  maxItems: number;
}

export interface UsRankOutput {
  items: NewsRankedItem[];
  generatedBy?: GeneratedBy;
}

/**
 * 自选股类型（docs/02 第 3 节）：stock 有自己的新闻和 SEC 公告；etf 按代码取新闻再加别名匹配；
 * leveraged_etf 并入标的；crypto 用加密新闻和日线（日涨跌幅按 UTC 日计算）
 */
export type WatchItemKind = typeof WatchItemKind[keyof typeof WatchItemKind];


export const WatchItemKind = {
  stock: 'stock',
  etf: 'etf',
  leveraged_etf: 'leveraged_etf',
  crypto: 'crypto',
} as const;

/**
 * 一只自选股（watch_items 表，docs/09 第 3 节）
 */
export interface WatchItem {
  /** 代码（主键）；加密资产用 BTC、XRP */
  symbol: string;
  /** 中文名或常用名 */
  name: string;
  kind: WatchItemKind;
  /** 分组（控制台和邮件里按组显示），如 半导体 */
  group: string;
  /** 杠杆 ETF / 现货 ETF 并入的标的（新闻、公告都算在标的名下），如 TSMX → TSM；没有时为 null */
  underlying: string | null;
  /** 判断“与板块同向”时对照的 ETF；为 null 时用 config/newsroom.yaml 的 defaultSectorEtf */
  sectorEtf: string | null;
  /** 在 RSS 标题里匹配这只股票用的名字（英文按词边界匹配，不区分大小写） */
  aliases: string[];
  /** 是否启用 */
  active: boolean;
}

/**
 * WeeklyDataHealth：市场观测台数据。
 */
export interface WeeklyDataHealth {
  /**
     * @minItems 5
     * @maxItems 5
     */
  sessions: string[];
  missing: string[];
  /**
     * 有方向数据的交易日数量，页面显示覆盖 n/5。
     * @minimum 0
     * @maximum 5
     */
  directionCoverageDays: number;
  boundary: string;
}

/**
 * WeeklyJudgment：市场观测台数据。
 */
export interface WeeklyJudgment {
  id: string;
  title: string;
  result: HypothesisResult;
  resultNote: string;
}

export type WeeklyLifecycleWindowDays = typeof WeeklyLifecycleWindowDays[keyof typeof WeeklyLifecycleWindowDays];


export const WeeklyLifecycleWindowDays = {
  NUMBER_5: 5,
} as const;

/**
 * WeeklyOscillatingDirection：市场观测台数据。
 */
export interface WeeklyOscillatingDirection {
  name: string;
  signChanges: number;
  /** 最后交易日缺该方向数据时为空，不回填更早日期。 */
  latestRelative: number | null;
}

/**
 * WeeklyLifecycle：市场观测台数据。
 */
export interface WeeklyLifecycle {
  persistentDirections: MarketAppearance[];
  oscillatingDirections: WeeklyOscillatingDirection[];
  latestWeakDirections: string[] | null;
  /**
     * 有方向数据的交易日数量，页面显示覆盖 n/5。
     * @minimum 0
     * @maximum 5
     */
  directionCoverageDays: number;
  windowDays: WeeklyLifecycleWindowDays;
}

/**
 * WeeklyQuestion：市场观测台数据。
 */
export interface WeeklyQuestion {
  question: string;
  confirm: string;
  invalidate: string;
}

/**
 * WeeklySummary：市场观测台数据。
 */
export interface WeeklySummary {
  date: string;
  title: string;
  sentence: string;
  settledCount: number;
  researchErrorCount: number;
  inconclusiveCount: number;
}

/**
 * WeeklyVerification：市场观测台数据。
 */
export interface WeeklyVerification {
  settledCount: number;
  confirmedCount: number;
  notConfirmedCount: number;
  inconclusiveCount: number;
  unsettledDueCount: number;
  items: WeeklyJudgment[];
}

/**
 * WeeklyStructuralChange：市场观测台数据。
 */
export interface WeeklyStructuralChange {
  name: string;
  change: number;
  judgment: string;
  counter: string;
}

export type WeeklyResearchErrorResult = typeof WeeklyResearchErrorResult[keyof typeof WeeklyResearchErrorResult];


export const WeeklyResearchErrorResult = {
  NOT_CONFIRMED: 'NOT_CONFIRMED',
} as const;

/**
 * WeeklyResearchError：市场观测台数据。
 */
export interface WeeklyResearchError {
  id: string;
  title: string;
  result: WeeklyResearchErrorResult;
  reason: string;
}

/**
 * WeeklyResearchErrors：市场观测台数据。
 */
export interface WeeklyResearchErrors {
  items: WeeklyResearchError[];
  unsettledDue: WeeklyJudgment[];
}

/**
 * WeeklyReport：市场观测台数据。
 */
export type WeeklyReport = WeeklySummary & ({
  /**
     * @minItems 5
     * @maxItems 5
     */
  sessions: string[];
  previousJudgmentVerification: WeeklyVerification;
  threeStructuralChanges: WeeklyStructuralChange[];
  lifecycle: WeeklyLifecycle;
  researchErrors: WeeklyResearchErrors;
  nextWeekQuestions: (WeeklyQuestion | null)[];
  dataAndMethodHealth: WeeklyDataHealth;
  markdown: string;
});

/**
 * 上一页返回的 nextCursor；取第一页时不传
 */
export type HubHttpCursorParamsCursorParameter = string;

/**
 * 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20
 */
export type HubHttpCursorParamsLimitParameter = number;

export type PrivatePlatformGetAiUsageParams = {
/**
 * 统计最近多少天（含今天），默认 30，按 Asia/Singapore（UTC+8）计
 * @minimum 1
 */
days?: number;
};

export type PrivatePlatformListEvalsParams = {
/**
 * 只看某个能力，如 news.ticker_digest
 */
capability?: string;
};

export type InternalPlatformPutDocumentBody = {[key: string]: unknown};

export type InternalPlatformExportTableParams = {
/**
 * 上一页返回的 nextCursor；取第一页时不传
 */
cursor?: HubHttpCursorParamsCursorParameter;
/**
 * 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20
 * @minimum 1
 * @maximum 100
 */
limit?: HubHttpCursorParamsLimitParameter;
};

export type InternalNewsPruneArticlesParams = {
before: string;
};

export type PrivateNewsSearchArticlesParams = {
q: string;
ticker?: string;
/**
 * @minimum 1
 */
days?: number;
};

export type PrivateNewsListEditionsParams = {
kind?: EditionKind;
/**
 * 上一页返回的 nextCursor；取第一页时不传
 */
cursor?: HubHttpCursorParamsCursorParameter;
/**
 * 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20
 * @minimum 1
 * @maximum 100
 */
limit?: HubHttpCursorParamsLimitParameter;
};

export type PrivateNewsListFeedbackParams = {
since?: string;
};

export type PrivateNewsGetTimelineParams = {
/**
 * @minimum 1
 */
days?: number;
};

export type PrivateNewsGetFullTimelineParams = {
/**
 * @minimum 1
 */
days?: number;
};

export type PrivatePapersListPapersParams = {
visibility?: PaperVisibility;
review?: PaperReviewStatus;
space?: string;
q?: string;
/**
 * 上一页返回的 nextCursor；取第一页时不传
 */
cursor?: HubHttpCursorParamsCursorParameter;
/**
 * 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20
 * @minimum 1
 * @maximum 100
 */
limit?: HubHttpCursorParamsLimitParameter;
};

export type PrivatePapersListUploadsParams = {
status?: PaperUploadStatus;
};

export type PublicMarketsListDaysParams = {
before?: string;
/**
 * 上一页返回的 nextCursor；取第一页时不传
 */
cursor?: HubHttpCursorParamsCursorParameter;
/**
 * 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20
 * @minimum 1
 * @maximum 100
 */
limit?: HubHttpCursorParamsLimitParameter;
};

export type PublicMarketsListEventsParams = {
from?: string;
to?: string;
};

export type PublicMarketsListHypothesesParams = {
result?: HypothesisResult;
from?: string;
to?: string;
dateField?: PublicMarketsListHypothesesDateField;
/**
 * 上一页返回的 nextCursor；取第一页时不传
 */
cursor?: HubHttpCursorParamsCursorParameter;
/**
 * 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20
 * @minimum 1
 * @maximum 100
 */
limit?: HubHttpCursorParamsLimitParameter;
};

export type PublicMarketsListHypothesesDateField = typeof PublicMarketsListHypothesesDateField[keyof typeof PublicMarketsListHypothesesDateField];


export const PublicMarketsListHypothesesDateField = {
  created: 'created',
  due: 'due',
  settled: 'settled',
} as const;

export type PublicMarketsListIndexBarsParams = {
/**
 * @minimum 1
 * @maximum 250
 */
limit?: number;
};

export type PrivatePlatformListRunsParams = {
/**
 * 只看某个任务，如 news-morning
 */
job?: string;
/**
 * 上一页返回的 nextCursor；取第一页时不传
 */
cursor?: HubHttpCursorParamsCursorParameter;
/**
 * 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20
 * @minimum 1
 * @maximum 100
 */
limit?: HubHttpCursorParamsLimitParameter;
};

