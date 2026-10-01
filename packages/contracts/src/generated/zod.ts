// 由 contracts 生成，勿手改（mise run gen）
import * as zod from 'zod';

export const AiCall = zod.object({
  "capability": zod.string().describe('能力 ID，如 news.ticker_digest'),
  "version": zod.int().describe('能力清单的 version'),
  "model": zod.string().describe('实际调用的模型（供应商/模型），如 openai/gpt-6-luna'),
  "inputTokens": zod.int().describe('输入 token 数'),
  "outputTokens": zod.int().describe('输出 token 数'),
  "costUsd": zod.number().describe('费用（美元），按 config/llm.yaml 的单价计算'),
  "durationMs": zod.int().describe('耗时（毫秒）'),
  "ok": zod.boolean().describe('是否成功'),
  "runId": zod.union([zod.string(),zod.null()]).describe('所属运行（Run.id）；API 里的按需调用（如控制台问论文）没有运行记录，为 null'),
  "at": zod.iso.datetime({"offset":true}).describe('调用时间（按天统计用量要用）')
}).describe('一次 AI 能力调用的记录（ai_calls 表，docs/09 第 3 节；运行时在 docs/10 第 5 节第 7 步回调写入）');

export type AiCall = zod.input<typeof AiCall>;
export type AiCallOutput = zod.output<typeof AiCall>;

export const AiUsageCapability = zod.object({
  "capability": zod.string().describe('能力 ID'),
  "calls": zod.int().describe('调用次数'),
  "failedCalls": zod.int().describe('其中失败的次数'),
  "inputTokens": zod.int().describe('输入 token 合计'),
  "outputTokens": zod.int().describe('输出 token 合计'),
  "costUsd": zod.number().describe('费用合计（美元）')
}).describe('某个能力的用量');

export type AiUsageCapability = zod.input<typeof AiUsageCapability>;
export type AiUsageCapabilityOutput = zod.output<typeof AiUsageCapability>;

export const AiUsageDay = zod.object({
  "date": zod.iso.date(),
  "calls": zod.int().describe('调用次数'),
  "failedCalls": zod.int().describe('其中失败的次数'),
  "inputTokens": zod.int().describe('输入 token 合计'),
  "outputTokens": zod.int().describe('输出 token 合计'),
  "costUsd": zod.number().describe('费用合计（美元）')
}).describe('某一天的用量');

export type AiUsageDay = zod.input<typeof AiUsageDay>;
export type AiUsageDayOutput = zod.output<typeof AiUsageDay>;

export const AiUsageStats = zod.object({
  "calls": zod.int().describe('调用次数'),
  "failedCalls": zod.int().describe('其中失败的次数'),
  "inputTokens": zod.int().describe('输入 token 合计'),
  "outputTokens": zod.int().describe('输出 token 合计'),
  "costUsd": zod.number().describe('费用合计（美元）')
}).describe('一组 AI 调用的合计');

export type AiUsageStats = zod.input<typeof AiUsageStats>;
export type AiUsageStatsOutput = zod.output<typeof AiUsageStats>;

export const AiUsageSummary = zod.object({
  "days": zod.int().describe('统计窗口：最近多少天（含今天）'),
  "total": AiUsageStats.describe('窗口内的合计'),
  "byDay": zod.array(AiUsageDay).describe('按天（日期升序；没有调用的日子不出现）'),
  "byCapability": zod.array(AiUsageCapability).describe('按能力'),
  "monthCostUsd": zod.number().describe('本月累计费用（美元），与窗口无关'),
  "monthlyBudgetUsd": zod.number().describe('月度预算（美元，config/llm.yaml 的 monthlyBudgetUsd）')
}).describe('GET /v1/ai/usage?days 的用量汇总（ai_calls 表的 SQL 聚合）。\n控制台“运维”页显示用量与费用并对比月度预算，“今日”页显示本月 AI 费用（docs/05 第 6 节）。');

export type AiUsageSummary = zod.input<typeof AiUsageSummary>;
export type AiUsageSummaryOutput = zod.output<typeof AiUsageSummary>;

export const AutonomyLevel = zod.enum(['L0', 'L1', 'L2', 'L3']).describe('自治等级（docs/10 第 6 节）');

export type AutonomyLevel = zod.input<typeof AutonomyLevel>;
export type AutonomyLevelOutput = zod.output<typeof AutonomyLevel>;

export const EvalSchedule = zod.enum(['weekly', 'on-change']).describe('评测时机：weekly 参加每周全量评测；on-change 只在改动时跑');

export type EvalSchedule = zod.input<typeof EvalSchedule>;
export type EvalScheduleOutput = zod.output<typeof EvalSchedule>;

export const CapabilityEvals = zod.object({
  "dataset": zod.string().describe('评测集目录，如 evals/news.ticker_digest/'),
  "schedule": EvalSchedule.describe('清单没写时为 weekly'),
  "thresholds": zod.looseObject({

}).describe('评测阈值（评分器名 → 最低分 0–1）')
}).describe('能力的评测设置');

export type CapabilityEvals = zod.input<typeof CapabilityEvals>;
export type CapabilityEvalsOutput = zod.output<typeof CapabilityEvals>;

export const CapabilityRuntime = zod.enum(['python', 'typescript']).describe('能力在哪一端运行');

export type CapabilityRuntime = zod.input<typeof CapabilityRuntime>;
export type CapabilityRuntimeOutput = zod.output<typeof CapabilityRuntime>;

export const ModelTier = zod.enum(['fast', 'balanced', 'frontier']).describe('模型档位（docs/10 第 4 节；档位 → 模型只在 config/llm.yaml 定义）');

export type ModelTier = zod.input<typeof ModelTier>;
export type ModelTierOutput = zod.output<typeof ModelTier>;

export const ReasoningEffort = zod.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']).describe('推理强度（config/llm.yaml 里各档位的 reasoning）');

export type ReasoningEffort = zod.input<typeof ReasoningEffort>;
export type ReasoningEffortOutput = zod.output<typeof ReasoningEffort>;

export const CapabilityIo = zod.object({
  "input": zod.string(),
  "output": zod.string()
}).describe('能力的输入输出模型名（contracts/capabilities.tsp 里的模型）');

export type CapabilityIo = zod.input<typeof CapabilityIo>;
export type CapabilityIoOutput = zod.output<typeof CapabilityIo>;

export const CapabilityLimits = zod.object({
  "maxInputTokens": zod.int(),
  "maxOutputTokens": zod.int(),
  "timeoutSec": zod.int()
}).describe('能力的调用上限');

export type CapabilityLimits = zod.input<typeof CapabilityLimits>;
export type CapabilityLimitsOutput = zod.output<typeof CapabilityLimits>;

export const EvalResult = zod.object({
  "capability": zod.string().describe('能力 ID'),
  "model": zod.string().describe('被评测的模型（供应商/模型）'),
  "datasetVersion": zod.string().describe('评测集版本'),
  "scores": zod.looseObject({

}).describe('各评分器的得分（评分器名 → 0–1），如 schema_valid、judge_faithful'),
  "passed": zod.boolean().describe('是否达到清单里的全部阈值'),
  "at": zod.iso.datetime({"offset":true}).describe('评测时间'),
  "costUsd": zod.number().optional().describe('这次评测的费用（美元）（运维页显示费用，docs/10 第 7.3 节）'),
  "durationMs": zod.int().optional().describe('这次评测的耗时（毫秒）（运维页显示耗时，docs/10 第 7.3 节）')
}).describe('一个能力的一次评测结果（eval_results 表，docs/09 第 3 节、docs/10 第 7 节）');

export type EvalResult = zod.input<typeof EvalResult>;
export type EvalResultOutput = zod.output<typeof EvalResult>;

export const CapabilityInfo = zod.object({
  "id": zod.string().describe('能力 ID，如 news.ticker_digest'),
  "version": zod.int().describe('清单版本：提示词、输入输出或校验变了就 +1'),
  "summary": zod.string().describe('一句话说明'),
  "owner": zod.string().describe('所属领域，如 newsroom、papers'),
  "runtime": CapabilityRuntime,
  "tier": ModelTier,
  "model": zod.string().describe('档位当前映射到的模型（config/llm.yaml 的 tiers.<tier>.model）'),
  "reasoning": ReasoningEffort.describe('档位的推理强度（config/llm.yaml 的 tiers.<tier>.reasoning）'),
  "autonomy": AutonomyLevel,
  "prompt": zod.string().describe('提示词文件，如 prompts/news_ticker_digest.md'),
  "io": CapabilityIo,
  "limits": CapabilityLimits,
  "checks": zod.array(zod.string()).describe('确定性后置校验，按顺序执行（docs/10 第 5.2 节）'),
  "fallback": zod.string().describe('失败时调用方怎么降级'),
  "params": zod.looseObject({

}).describe('能力自己的参数（如 papers.author 的 repairRounds）'),
  "evals": CapabilityEvals,
  "latestEval": zod.union([EvalResult,zod.null()]).describe('最近一次评测结果；还没有评测过时为 null')
}).describe('GET /v1/capabilities 的一项：能力清单 capabilities/<id>.yaml 的字段（docs/10 第 3 节），\n加上档位当前对应的模型与推理强度（config/llm.yaml），以及最近一次评测结果。');

export type CapabilityInfo = zod.input<typeof CapabilityInfo>;
export type CapabilityInfoOutput = zod.output<typeof CapabilityInfo>;

export const DocumentKey = zod.enum(['markets.reference', 'papers.catalog.public', 'papers.catalog.all', 'papers.graph.public', 'papers.graph.all', 'papers.search.public']).describe('documents 表里的文档键（派生数据与参考资料；docs/03 第 2、7 节，docs/04 第 6 节）');

export type DocumentKey = zod.input<typeof DocumentKey>;
export type DocumentKeyOutput = zod.output<typeof DocumentKey>;

export const Document = zod.object({
  "key": DocumentKey,
  "payload": zod.looseObject({

}).describe('文档内容，结构由 key 决定：markets.reference → MarketReference，papers.catalog.* → PapersCatalog，papers.graph.* → GraphData，papers.search.public → SearchIndex'),
  "updatedAt": zod.iso.datetime({"offset":true}).describe('最后写入时间')
}).describe('通用的“单份文档”（documents 表，docs/09 第 3 节）。\n写入用 PUT /v1/internal/documents/{key}，请求体就是 payload 本身；读取由各领域的接口完成\n（如 GET /v1/public/markets/reference 返回 markets.reference 的 payload）。');

export type Document = zod.input<typeof Document>;
export type DocumentOutput = zod.output<typeof Document>;

export const ExportTable = zod.enum(['news_sources', 'articles', 'filings', 'insider_trades', 'calendar_events', 'earnings_cards', 'editions', 'edition_feedback', 'watch_items', 'market_days', 'market_hypotheses', 'market_weeklies', 'market_events', 'index_history', 'papers', 'paper_private', 'paper_reviews', 'paper_uploads', 'documents', 'runs', 'ai_calls', 'eval_results']).describe('可以导出的表：docs/09 第 3 节除鉴权表和两张 FTS5 虚拟表以外的全部表');

export type ExportTable = zod.input<typeof ExportTable>;
export type ExportTableOutput = zod.output<typeof ExportTable>;

export const ExportPage = zod.object({
  "table": ExportTable.describe('导出的表'),
  "items": zod.array(zod.looseObject({

})).describe('本页的行：列名 → 值，保持数据库里的原样'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标；没有下一页时为 null')
}).describe('GET /v1/internal/export/{table} 的一页（hub export 每晚分页读出，写进数据仓库 bowen-hub-data，docs/09 第 5 节）');

export type ExportPage = zod.input<typeof ExportPage>;
export type ExportPageOutput = zod.output<typeof ExportPage>;

export const GeneratedBy = zod.object({
  "capability": zod.string().describe('能力 ID，如 news.ticker_digest'),
  "version": zod.int().describe('能力清单的 version'),
  "model": zod.string().describe('实际调用的模型（供应商/模型），如 openai/gpt-6-luna'),
  "at": zod.iso.datetime({"offset":true}).describe('生成时间')
}).describe('AI 生成内容的出处（docs/08 第 4 节；运行时在 docs/10 第 5 节第 6 步盖上）');

export type GeneratedBy = zod.input<typeof GeneratedBy>;
export type GeneratedByOutput = zod.output<typeof GeneratedBy>;

export const Health = zod.object({
  "status": zod.enum(['ok']).describe('API 在线时为 ok')
}).describe('GET /v1/health 的返回');

export type Health = zod.input<typeof Health>;
export type HealthOutput = zod.output<typeof Health>;

export const Problem = zod.object({
  "type": zod.string().describe('错误类型的 URI；没有专门类型时为 about:blank'),
  "title": zod.string().describe('简短的错误标题，如“未实现”'),
  "status": zod.int().describe('HTTP 状态码'),
  "detail": zod.string().describe('具体说明，如“未实现（任务 T14）”')
}).describe('错误响应的正文（application/problem+json，RFC 9457）。\n各接口统一用 HubHttp.ErrorResponse 声明错误（OpenAPI 里是 default 响应）。');

export type Problem = zod.input<typeof Problem>;
export type ProblemOutput = zod.output<typeof Problem>;

export const RunStatus = zod.enum(['running', 'succeeded', 'failed']).describe('运行状态：开始时写 running，结束时写 succeeded 或 failed');

export type RunStatus = zod.input<typeof RunStatus>;
export type RunStatusOutput = zod.output<typeof RunStatus>;

export const Run = zod.object({
  "id": zod.string().describe('运行 ID，由任务生成，如 news-morning-2026-09-30-<GitHub 运行号>'),
  "job": zod.string().describe('任务名，如 news-morning、market-eod、papers-ingest、data-export；月度预算超支提醒记为 budget-alert'),
  "date": zod.iso.date().describe('这次运行处理的业务日期（如早报日期、A 股交易日）'),
  "status": RunStatus,
  "startedAt": zod.iso.datetime({"offset":true}).describe('开始时间'),
  "finishedAt": zod.union([zod.iso.datetime({"offset":true}),zod.null()]).describe('结束时间；还在运行时为 null'),
  "stats": zod.looseObject({

}).describe('统计：由各任务自己决定写什么（条目数、AI 调用数、校验删掉了什么等）'),
  "error": zod.union([zod.string(),zod.null()]).describe('错误摘要；没有出错时为 null')
}).describe('计算任务的一次运行（runs 表，docs/09 第 3、7、9 节）。\n任务开始和结束各写一次 PUT /v1/internal/runs/{runId}（同一 id 覆盖）。');

export type Run = zod.input<typeof Run>;
export type RunOutput = zod.output<typeof Run>;

export const RunPage = zod.object({
  "items": zod.array(Run).describe('本页条目'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null')
}).describe('GET /v1/runs 的一页');

export type RunPage = zod.input<typeof RunPage>;
export type RunPageOutput = zod.output<typeof RunPage>;

export const WatchItemKind = zod.enum(['stock', 'etf', 'leveraged_etf', 'crypto']).describe('自选股类型（docs/02 第 3 节）：stock 有自己的新闻和 SEC 公告；etf 按代码取新闻再加别名匹配；\nleveraged_etf 并入标的；crypto 用加密新闻和日线（日涨跌幅按 UTC 日计算）');

export type WatchItemKind = zod.input<typeof WatchItemKind>;
export type WatchItemKindOutput = zod.output<typeof WatchItemKind>;

export const WatchItem = zod.object({
  "symbol": zod.string().describe('代码（主键）；加密资产用 BTC、XRP'),
  "name": zod.string().describe('中文名或常用名'),
  "kind": WatchItemKind,
  "group": zod.string().describe('分组（控制台和邮件里按组显示），如 半导体'),
  "underlying": zod.union([zod.string(),zod.null()]).describe('杠杆 ETF / 现货 ETF 并入的标的（新闻、公告都算在标的名下），如 TSMX → TSM；没有时为 null'),
  "sectorEtf": zod.union([zod.string(),zod.null()]).describe('判断“与板块同向”时对照的 ETF；为 null 时用 config/newsroom.yaml 的 defaultSectorEtf'),
  "aliases": zod.array(zod.string()).describe('在 RSS 标题里匹配这只股票用的名字（英文按词边界匹配，不区分大小写）'),
  "active": zod.boolean().describe('是否启用')
}).describe('一只自选股（watch_items 表，docs/09 第 3 节）');

export type WatchItem = zod.input<typeof WatchItem>;
export type WatchItemOutput = zod.output<typeof WatchItem>;
/**
 * AI 用量汇总（ai_calls 表的聚合）
 */



export const PrivatePlatformGetAiUsageQueryParams = zod.object({
  "days": zod.coerce.number().int().min(1).optional().describe('统计最近多少天（含今天）')
})

export const PrivatePlatformGetAiUsageResponse = AiUsageSummary


/**
 * 能力清单（读 packages/ai 构建时生成的注册表）+ 各能力最近一次评测结果
 */
export const PrivatePlatformListCapabilitiesResponseItem = CapabilityInfo
export const PrivatePlatformListCapabilitiesResponse = zod.array(PrivatePlatformListCapabilitiesResponseItem)


/**
 * 评测结果（eval_results 表），最新的在前
 */
export const PrivatePlatformListEvalsQueryParams = zod.object({
  "capability": zod.string().optional().describe('只看某个能力，如 news.ticker_digest')
})

export const PrivatePlatformListEvalsResponseItem = EvalResult
export const PrivatePlatformListEvalsResponse = zod.array(PrivatePlatformListEvalsResponseItem)


/**
 * API 在线就返回 200
 */
export const HealthCheckGetResponse = Health


/**
 * 批量写入 AI 调用记录
 */
export const InternalPlatformBatchAiCallsBodyItem = AiCall
export const InternalPlatformBatchAiCallsBody = zod.array(InternalPlatformBatchAiCallsBodyItem)

export const InternalPlatformBatchAiCallsResponse = zod.void()


/**
 * 写一份派生数据或参考资料（documents 表，按 key 覆盖）。
 * 请求体就是文档本身，结构由 key 决定（见 Document.payload）；API 不解析重组，整块存入。
 */
export const InternalPlatformPutDocumentParams = zod.object({
  "key": zod.enum(['markets.reference', 'papers.catalog.public', 'papers.catalog.all', 'papers.graph.public', 'papers.graph.all', 'papers.search.public']).describe('documents 表里的文档键（派生数据与参考资料；docs/03 第 2、7 节，docs/04 第 6 节）')
})

export const InternalPlatformPutDocumentBody = zod.looseObject({

})

export const InternalPlatformPutDocumentResponse = zod.void()


/**
 * 批量写入评测结果（每周评测）
 */
export const InternalPlatformBatchEvalResultsBodyItem = EvalResult
export const InternalPlatformBatchEvalResultsBody = zod.array(InternalPlatformBatchEvalResultsBodyItem)

export const InternalPlatformBatchEvalResultsResponse = zod.void()


/**
 * 数据导出：分页读出一张表（hub export 每晚调用，docs/09 第 5 节）
 */
export const InternalPlatformExportTableParams = zod.object({
  "table": zod.enum(['news_sources', 'articles', 'filings', 'insider_trades', 'calendar_events', 'earnings_cards', 'editions', 'edition_feedback', 'watch_items', 'market_days', 'market_hypotheses', 'market_weeklies', 'market_events', 'index_history', 'papers', 'paper_private', 'paper_reviews', 'paper_uploads', 'documents', 'runs', 'ai_calls', 'eval_results']).describe('可以导出的表：docs/09 第 3 节除鉴权表和两张 FTS5 虚拟表以外的全部表')
})

export const internalPlatformExportTableQueryLimitMax = 100;



export const InternalPlatformExportTableQueryParams = zod.object({
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(internalPlatformExportTableQueryLimitMax).optional().describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时由服务端决定')
})

export const InternalPlatformExportTableResponse = ExportPage


/**
 * 写一条运行记录（任务开始和结束各写一次，按 runId 覆盖）；body.id 必须等于路径里的 runId
 */
export const InternalPlatformPutRunParams = zod.object({
  "runId": zod.string()
})

export const InternalPlatformPutRunBody = Run

export const InternalPlatformPutRunResponse = zod.void()


/**
 * 自选股初始导入（hub migrate watchlist）：按代码覆盖写入
 */
export const InternalWatchlistBatchBodyItem = WatchItem
export const InternalWatchlistBatchBody = zod.array(InternalWatchlistBatchBodyItem)

export const InternalWatchlistBatchResponse = zod.void()


/**
 * 运行记录（runs 表），最新的在前
 */
export const privatePlatformListRunsQueryLimitMax = 100;



export const PrivatePlatformListRunsQueryParams = zod.object({
  "job": zod.string().optional().describe('只看某个任务，如 news-morning'),
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(privatePlatformListRunsQueryLimitMax).optional().describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时由服务端决定')
})

export const PrivatePlatformListRunsResponse = RunPage


/**
 * 全部自选股（含停用的）
 */
export const PrivateWatchlistListResponseItem = WatchItem
export const PrivateWatchlistListResponse = zod.array(PrivateWatchlistListResponseItem)


/**
 * 新增或修改一只自选股（按代码覆盖）；body.symbol 必须等于路径里的 symbol
 */
export const PrivateWatchlistPutParams = zod.object({
  "symbol": zod.string()
})

export const PrivateWatchlistPutBody = WatchItem

export const PrivateWatchlistPutResponse = WatchItem


/**
 * 删除一只自选股
 */
export const PrivateWatchlistRemoveParams = zod.object({
  "symbol": zod.string()
})

export const PrivateWatchlistRemoveResponse = zod.void()
