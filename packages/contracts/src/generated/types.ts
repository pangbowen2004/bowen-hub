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

