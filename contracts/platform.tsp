// 平台：运行记录、AI 用量、评测、能力清单、健康检查、通用文档、数据导出（docs/08 第 2 节、docs/09 第 3–5 节、docs/10）。
// 接口在 routes/health.tsp、routes/private/platform.tsp、routes/internal/platform.tsp。
import "./common.tsp";

namespace BowenHub;

// ───────────── 运行记录（runs 表） ─────────────

/** 运行状态：开始时写 running，结束时写 succeeded 或 failed */
union RunStatus {
  "running",
  "succeeded",
  "failed",
}

/**
 * 计算任务的一次运行（runs 表，docs/09 第 3、7、9 节）。
 * 任务开始和结束各写一次 PUT /v1/internal/runs/{runId}（同一 id 覆盖）。
 */
model Run {
  /** 运行 ID，由任务生成，如 news-morning-2026-09-30-<GitHub 运行号> */
  id: string;

  /** 任务名，如 news-morning、market-eod、papers-ingest、data-export；月度预算超支提醒记为 budget-alert */
  job: string;

  /** 这次运行处理的业务日期（如早报日期、A 股交易日） */
  date: Date;

  status: RunStatus;

  /** 开始时间 */
  startedAt: DateTime;

  /** 结束时间；还在运行时为 null */
  finishedAt: DateTime | null;

  /** 统计：由各任务自己决定写什么（条目数、AI 调用数、校验删掉了什么等） */
  stats: Record<unknown>;

  /** 错误摘要；没有出错时为 null */
  error: string | null;
}

/** GET /v1/runs 的一页 */
model RunPage is CursorPage<Run>;

// ───────────── AI 调用与用量（ai_calls 表） ─────────────

/** 一次 AI 能力调用的记录（ai_calls 表，docs/09 第 3 节；运行时在 docs/10 第 5 节第 7 步回调写入） */
model AiCall {
  /** 能力 ID，如 news.ticker_digest */
  capability: string;

  /** 能力清单的 version */
  version: int32;

  /** 实际调用的模型（供应商/模型），如 openai/gpt-6-luna */
  `model`: string;

  /** 输入 token 数 */
  inputTokens: int32;

  /** 输出 token 数 */
  outputTokens: int32;

  /** 费用（美元），按 config/llm.yaml 的单价计算 */
  costUsd: float64;

  /** 耗时（毫秒） */
  durationMs: int32;

  /** 是否成功 */
  ok: boolean;

  /** 所属运行（Run.id）；API 里的按需调用（如控制台问论文）没有运行记录，为 null */
  runId: string | null;

  /** 调用时间（按天统计用量要用） */
  at: DateTime;
}

/** 一组 AI 调用的合计 */
model AiUsageStats {
  /** 调用次数 */
  calls: int32;

  /** 其中失败的次数 */
  failedCalls: int32;

  /** 输入 token 合计 */
  inputTokens: int32;

  /** 输出 token 合计 */
  outputTokens: int32;

  /** 费用合计（美元） */
  costUsd: float64;
}

/** 某一天的用量 */
model AiUsageDay {
  date: Date;
  ...AiUsageStats;
}

/** 某个能力的用量 */
model AiUsageCapability {
  /** 能力 ID */
  capability: string;

  ...AiUsageStats;
}

/**
 * GET /v1/ai/usage?days 的用量汇总（ai_calls 表的 SQL 聚合）。
 * 控制台“运维”页显示用量与费用并对比月度预算，“今日”页显示本月 AI 费用（docs/05 第 6 节）。
 */
model AiUsageSummary {
  /** 统计窗口：最近多少天（含今天） */
  days: int32;

  /** 窗口内的合计 */
  total: AiUsageStats;

  /** 按天（日期升序；没有调用的日子不出现） */
  byDay: AiUsageDay[];

  /** 按能力 */
  byCapability: AiUsageCapability[];

  /** 本月累计费用（美元），与窗口无关 */
  monthCostUsd: float64;

  /** 月度预算（美元，config/llm.yaml 的 monthlyBudgetUsd） */
  monthlyBudgetUsd: float64;
}

// ───────────── 评测（eval_results 表） ─────────────

/** 一个能力的一次评测结果（eval_results 表，docs/09 第 3 节、docs/10 第 7 节） */
model EvalResult {
  /** 能力 ID */
  capability: string;

  /** 被评测的模型（供应商/模型） */
  `model`: string;

  /** 评测集版本 */
  datasetVersion: string;

  /** 各评分器的得分（评分器名 → 0–1），如 schema_valid、judge_faithful */
  scores: Record<float64>;

  /** 是否达到清单里的全部阈值 */
  passed: boolean;

  /** 评测时间 */
  at: DateTime;

  /** 这次评测的费用（美元）（运维页显示费用，docs/10 第 7.3 节） */
  costUsd?: float64;

  /** 这次评测的耗时（毫秒）（运维页显示耗时，docs/10 第 7.3 节） */
  durationMs?: int32;
}

// ───────────── 能力清单 ─────────────

/** 能力在哪一端运行 */
union CapabilityRuntime {
  "python",
  "typescript",
}

/** 模型档位（docs/10 第 4 节；档位 → 模型只在 config/llm.yaml 定义） */
union ModelTier {
  "fast",
  "balanced",
  "frontier",
}

/** 推理强度（config/llm.yaml 里各档位的 reasoning） */
union ReasoningEffort {
  "none",
  "low",
  "medium",
  "high",
  "xhigh",
  "max",
}

/** 自治等级（docs/10 第 6 节） */
union AutonomyLevel {
  "L0",
  "L1",
  "L2",
  "L3",
}

/** 评测时机：weekly 参加每周全量评测；on-change 只在改动时跑 */
union EvalSchedule {
  "weekly",
  "on-change",
}

/** 能力的输入输出模型名（contracts/capabilities.tsp 里的模型） */
model CapabilityIo {
  input: string;
  output: string;
}

/** 能力的调用上限 */
model CapabilityLimits {
  maxInputTokens: int32;
  maxOutputTokens: int32;
  timeoutSec: int32;
}

/** 能力的评测设置 */
model CapabilityEvals {
  /** 评测集目录，如 evals/news.ticker_digest/ */
  dataset: string;

  /** 清单没写时为 weekly */
  schedule: EvalSchedule;

  /** 评测阈值（评分器名 → 最低分 0–1） */
  thresholds: Record<float64>;
}

/**
 * GET /v1/capabilities 的一项：能力清单 capabilities/<id>.yaml 的字段（docs/10 第 3 节），
 * 加上档位当前对应的模型与推理强度（config/llm.yaml），以及最近一次评测结果。
 */
model CapabilityInfo {
  /** 能力 ID，如 news.ticker_digest */
  id: string;

  /** 清单版本：提示词、输入输出或校验变了就 +1 */
  version: int32;

  /** 一句话说明 */
  summary: string;

  /** 所属领域，如 newsroom、papers */
  owner: string;

  runtime: CapabilityRuntime;
  tier: ModelTier;

  /** 档位当前映射到的模型（config/llm.yaml 的 tiers.<tier>.model） */
  `model`: string;

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
  params: Record<unknown>;

  evals: CapabilityEvals;

  /** 最近一次评测结果；还没有评测过时为 null */
  latestEval: EvalResult | null;
}

// ───────────── 健康检查 ─────────────

/** GET /v1/health 的返回 */
model Health {
  /** API 在线时为 ok */
  status: "ok";
}

// ───────────── 通用文档（documents 表） ─────────────

/** documents 表里的文档键（派生数据与参考资料；docs/03 第 2、7 节，docs/04 第 6 节） */
union DocumentKey {
  "markets.reference",
  "papers.catalog.public",
  "papers.catalog.all",
  "papers.graph.public",
  "papers.graph.all",
  "papers.search.public",
}

/**
 * 通用的“单份文档”（documents 表，docs/09 第 3 节）。
 * 写入用 PUT /v1/internal/documents/{key}，请求体就是 payload 本身；读取由各领域的接口完成
 * （如 GET /v1/public/markets/reference 返回 markets.reference 的 payload）。
 */
model Document {
  key: DocumentKey;

  /** 文档内容，结构由 key 决定：markets.reference → MarketReference，papers.catalog.* → PapersCatalog，papers.graph.* → GraphData，papers.search.public → SearchIndex */
  payload: Record<unknown>;

  /** 最后写入时间 */
  updatedAt: DateTime;
}

// ───────────── 数据导出 ─────────────

/** 可以导出的表：docs/09 第 3 节除鉴权表和两张 FTS5 虚拟表以外的全部表 */
union ExportTable {
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
}

/** GET /v1/internal/export/{table} 的一页（hub export 每晚分页读出，写进数据仓库 bowen-hub-data，docs/09 第 5 节） */
model ExportPage {
  /** 导出的表 */
  table: ExportTable;

  /** 本页的行：列名 → 值，保持数据库里的原样 */
  items: Record<unknown>[];

  /** 下一页的游标；没有下一页时为 null */
  nextCursor: string | null;
}
