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

export const AiUsageCapability = zod.object({
  "capability": zod.string().describe('能力 ID'),
  "calls": zod.int().describe('调用次数'),
  "failedCalls": zod.int().describe('其中失败的次数'),
  "inputTokens": zod.int().describe('输入 token 合计'),
  "outputTokens": zod.int().describe('输出 token 合计'),
  "costUsd": zod.number().describe('费用合计（美元）')
}).describe('某个能力的用量');

export type AiUsageCapability = zod.input<typeof AiUsageCapability>;

export const AiUsageDay = zod.object({
  "date": zod.iso.date(),
  "calls": zod.int().describe('调用次数'),
  "failedCalls": zod.int().describe('其中失败的次数'),
  "inputTokens": zod.int().describe('输入 token 合计'),
  "outputTokens": zod.int().describe('输出 token 合计'),
  "costUsd": zod.number().describe('费用合计（美元）')
}).describe('某一天的用量');

export type AiUsageDay = zod.input<typeof AiUsageDay>;

export const AiUsageStats = zod.object({
  "calls": zod.int().describe('调用次数'),
  "failedCalls": zod.int().describe('其中失败的次数'),
  "inputTokens": zod.int().describe('输入 token 合计'),
  "outputTokens": zod.int().describe('输出 token 合计'),
  "costUsd": zod.number().describe('费用合计（美元）')
}).describe('一组 AI 调用的合计');

export type AiUsageStats = zod.input<typeof AiUsageStats>;

export const AiUsageSummary = zod.object({
  "days": zod.int().describe('统计窗口：最近多少天（含今天）'),
  "total": AiUsageStats.describe('窗口内的合计'),
  "byDay": zod.array(AiUsageDay).describe('按 Asia/Singapore（UTC+8）日期统计（日期升序；没有调用的日子不出现）'),
  "byCapability": zod.array(AiUsageCapability).describe('按能力'),
  "monthCostUsd": zod.number().describe('按 Asia/Singapore（UTC+8）月份统计的本月累计费用（美元），与窗口无关'),
  "monthlyBudgetUsd": zod.number().describe('月度预算（美元，config/llm.yaml 的 monthlyBudgetUsd）')
}).describe('GET /v1/ai/usage?days 的用量汇总（ai_calls 表的 SQL 聚合）。\n控制台“运维”页显示用量与费用并对比月度预算，“今日”页显示本月 AI 费用（docs/05 第 6 节）。');

export type AiUsageSummary = zod.input<typeof AiUsageSummary>;

export const NewsPaywall = zod.enum(['none', 'metered', 'hard']);

export type NewsPaywall = zod.input<typeof NewsPaywall>;

export const Article = zod.object({
  "id": zod.string(),
  "sourceId": zod.string(),
  "kind": zod.enum(['news', 'filing', 'press_release', 'macro']),
  "title": zod.string(),
  "url": zod.string(),
  "publishedAt": zod.iso.datetime({"offset":true}),
  "summary": zod.union([zod.string(),zod.null()]),
  "lang": zod.string(),
  "tickers": zod.array(zod.string()),
  "topics": zod.array(zod.string()),
  "paywall": NewsPaywall,
  "clusterId": zod.union([zod.string(),zod.null()])
});

export type Article = zod.input<typeof Article>;

export const ArticleTimelineItem = zod.object({
  "kind": zod.enum(['article']),
  "at": zod.iso.datetime({"offset":true}),
  "article": Article
});

export type ArticleTimelineItem = zod.input<typeof ArticleTimelineItem>;

export const AutonomyLevel = zod.enum(['L0', 'L1', 'L2', 'L3']).describe('自治等级（docs/10 第 6 节）');

export type AutonomyLevel = zod.input<typeof AutonomyLevel>;

export const NewsPromptItem = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "summary": zod.union([zod.string(),zod.null()])
});

export type NewsPromptItem = zod.input<typeof NewsPromptItem>;

export const BriefInput = zod.object({
  "items": zod.array(NewsPromptItem)
});

export type BriefInput = zod.input<typeof BriefInput>;

export const NewsBrief = zod.object({
  "id": zod.string(),
  "brief": zod.string()
});

export type NewsBrief = zod.input<typeof NewsBrief>;

export const GeneratedBy = zod.object({
  "capability": zod.string().describe('能力 ID，如 news.ticker_digest'),
  "version": zod.int().describe('能力清单的 version'),
  "model": zod.string().describe('实际调用的模型（供应商/模型），如 openai/gpt-6-luna'),
  "at": zod.iso.datetime({"offset":true}).describe('生成时间')
}).describe('AI 生成内容的出处（docs/08 第 4 节；运行时在 docs/10 第 5 节第 6 步盖上）');

export type GeneratedBy = zod.input<typeof GeneratedBy>;

export const BriefOutput = zod.object({
  "briefs": zod.array(NewsBrief),
  "generatedBy": GeneratedBy.optional()
});

export type BriefOutput = zod.input<typeof BriefOutput>;

export const CalendarEvent = zod.object({
  "kind": zod.enum(['macro', 'earnings', 'fomc']),
  "date": zod.iso.date(),
  "fredReleaseId": zod.union([zod.int(),zod.null()]),
  "at": zod.union([zod.iso.datetime({"offset":true}),zod.null()]),
  "title": zod.string(),
  "tickers": zod.array(zod.string()),
  "timing": zod.union([zod.string(),zod.null()]),
  "importance": zod.string()
});

export type CalendarEvent = zod.input<typeof CalendarEvent>;

export const EvalSchedule = zod.enum(['weekly', 'on-change']).describe('评测时机：weekly 参加每周全量评测；on-change 只在改动时跑');

export type EvalSchedule = zod.input<typeof EvalSchedule>;

export const CapabilityEvals = zod.object({
  "dataset": zod.string().describe('评测集目录，如 evals/news.ticker_digest/'),
  "schedule": EvalSchedule.describe('清单没写时为 weekly'),
  "thresholds": zod.record(zod.string(), zod.number()).describe('评测阈值（评分器名 → 最低分 0–1）')
}).describe('能力的评测设置');

export type CapabilityEvals = zod.input<typeof CapabilityEvals>;

export const CapabilityRuntime = zod.enum(['python', 'typescript']).describe('能力在哪一端运行');

export type CapabilityRuntime = zod.input<typeof CapabilityRuntime>;

export const ModelTier = zod.enum(['fast', 'balanced', 'frontier']).describe('模型档位（docs/10 第 4 节；档位 → 模型只在 config/llm.yaml 定义）');

export type ModelTier = zod.input<typeof ModelTier>;

export const ReasoningEffort = zod.enum(['none', 'low', 'medium', 'high', 'xhigh', 'max']).describe('推理强度（config/llm.yaml 里各档位的 reasoning）');

export type ReasoningEffort = zod.input<typeof ReasoningEffort>;

export const CapabilityIo = zod.object({
  "input": zod.string(),
  "output": zod.string()
}).describe('能力的输入输出模型名（contracts/capabilities.tsp 里的模型）');

export type CapabilityIo = zod.input<typeof CapabilityIo>;

export const CapabilityLimits = zod.object({
  "maxInputTokens": zod.int(),
  "maxOutputTokens": zod.int(),
  "timeoutSec": zod.int()
}).describe('能力的调用上限');

export type CapabilityLimits = zod.input<typeof CapabilityLimits>;

export const EvalResult = zod.object({
  "capability": zod.string().describe('能力 ID'),
  "model": zod.string().describe('被评测的模型（供应商/模型）'),
  "datasetVersion": zod.string().describe('评测集版本'),
  "scores": zod.record(zod.string(), zod.number()).describe('各评分器的得分（评分器名 → 0–1），如 schema_valid、judge_faithful'),
  "passed": zod.boolean().describe('是否达到清单里的全部阈值'),
  "at": zod.iso.datetime({"offset":true}).describe('评测时间'),
  "costUsd": zod.number().optional().describe('这次评测的费用（美元）（运维页显示费用，docs/10 第 7.3 节）'),
  "durationMs": zod.int().optional().describe('这次评测的耗时（毫秒）（运维页显示耗时，docs/10 第 7.3 节）')
}).describe('一个能力的一次评测结果（eval_results 表，docs/09 第 3 节、docs/10 第 7 节）');

export type EvalResult = zod.input<typeof EvalResult>;

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

export const ClassifyInput = zod.object({
  "items": zod.array(NewsPromptItem)
});

export type ClassifyInput = zod.input<typeof ClassifyInput>;

export const NewsTopic = zod.enum(['us_china', 'war_geopolitics', 'markets_macro', 'ai_tech', 'big_tech', 'us_politics', 'china_business', 'other']);

export type NewsTopic = zod.input<typeof NewsTopic>;

export const NewsClassification = zod.object({
  "id": zod.string(),
  "topic": NewsTopic
});

export type NewsClassification = zod.input<typeof NewsClassification>;

export const ClassifyOutput = zod.object({
  "classifications": zod.array(NewsClassification),
  "generatedBy": GeneratedBy.optional()
});

export type ClassifyOutput = zod.input<typeof ClassifyOutput>;

export const NewsCandidate = NewsPromptItem.and(zod.object({
  "topic": zod.union([zod.string(),zod.null()]),
  "source": zod.string(),
  "publishedAt": zod.iso.datetime({"offset":true}),
  "tickers": zod.array(zod.string()),
  "ruleScore": zod.number(),
  "paywall": NewsPaywall
}));

export type NewsCandidate = zod.input<typeof NewsCandidate>;

export const CurateInput = zod.object({
  "candidates": zod.array(NewsCandidate)
});

export type CurateInput = zod.input<typeof CurateInput>;

export const NewsCuratedItem = zod.object({
  "id": zod.string(),
  "summary": zod.string(),
  "whyItMatters": zod.string()
});

export type NewsCuratedItem = zod.input<typeof NewsCuratedItem>;

export const CurateOutput = zod.object({
  "overview": zod.string(),
  "top5": zod.array(NewsCuratedItem),
  "generatedBy": GeneratedBy.optional()
});

export type CurateOutput = zod.input<typeof CurateOutput>;

export const DirectionPersistenceActual = zod.object({
  "relativeVsAllA": zod.number(),
  "advanceShare": zod.number(),
  "medianReturn1d": zod.number(),
  "amountShare": zod.number(),
  "membershipAsOf": zod.iso.date()
}).describe('DirectionPersistenceActual：市场观测台数据。');

export type DirectionPersistenceActual = zod.input<typeof DirectionPersistenceActual>;

export const DirectionPersistenceBaseline = zod.object({
  "membershipAsOf": zod.iso.date(),
  "return1d": zod.number(),
  "advanceShare": zod.number(),
  "amountShare": zod.number()
}).describe('DirectionPersistenceBaseline：市场观测台数据。');

export type DirectionPersistenceBaseline = zod.input<typeof DirectionPersistenceBaseline>;

export const DirectionPersistenceThresholds = zod.object({
  "relativeMin": zod.number(),
  "advanceShareMin": zod.number(),
  "amountShareMin": zod.number(),
  "advanceShareInvalid": zod.number()
}).describe('DirectionPersistenceThresholds：市场观测台数据。');

export type DirectionPersistenceThresholds = zod.input<typeof DirectionPersistenceThresholds>;

export const DirectionPersistenceRule = zod.object({
  "type": zod.enum(['DIRECTION_PERSISTENCE']),
  "thresholds": DirectionPersistenceThresholds,
  "baseline": DirectionPersistenceBaseline,
  "entity": zod.string()
}).describe('DirectionPersistenceRule：市场观测台数据。');

export type DirectionPersistenceRule = zod.input<typeof DirectionPersistenceRule>;

export const DirectionRepairActual = zod.object({
  "relativeVsAllA": zod.number(),
  "advanceShare": zod.number(),
  "medianReturn1d": zod.number(),
  "amountShare": zod.number(),
  "membershipAsOf": zod.iso.date()
}).describe('DirectionRepairActual：市场观测台数据。');

export type DirectionRepairActual = zod.input<typeof DirectionRepairActual>;

export const DirectionRepairBaseline = zod.object({
  "membershipAsOf": zod.iso.date(),
  "relativeVsAllA": zod.number(),
  "advanceShare": zod.number()
}).describe('DirectionRepairBaseline：市场观测台数据。');

export type DirectionRepairBaseline = zod.input<typeof DirectionRepairBaseline>;

export const DirectionRepairThresholds = zod.object({
  "relativeMin": zod.number(),
  "advanceShareMin": zod.number(),
  "medianReturnMin": zod.number(),
  "relativeInvalidMax": zod.number(),
  "advanceShareInvalid": zod.number()
}).describe('DirectionRepairThresholds：市场观测台数据。');

export type DirectionRepairThresholds = zod.input<typeof DirectionRepairThresholds>;

export const DirectionRepairRule = zod.object({
  "type": zod.enum(['DIRECTION_REPAIR']),
  "thresholds": DirectionRepairThresholds,
  "baseline": DirectionRepairBaseline,
  "entity": zod.string()
}).describe('DirectionRepairRule：市场观测台数据。');

export type DirectionRepairRule = zod.input<typeof DirectionRepairRule>;

export const DirectionSpreadActual = zod.object({
  "spread": zod.number(),
  "strongRelative": zod.number(),
  "weakRelative": zod.number(),
  "weakAdvanceShare": zod.number()
}).describe('DirectionSpreadActual：市场观测台数据。');

export type DirectionSpreadActual = zod.input<typeof DirectionSpreadActual>;

export const DirectionSpreadBaseline = zod.object({
  "spread": zod.number(),
  "strongMembershipAsOf": zod.iso.date(),
  "weakMembershipAsOf": zod.iso.date()
}).describe('DirectionSpreadBaseline：市场观测台数据。');

export type DirectionSpreadBaseline = zod.input<typeof DirectionSpreadBaseline>;

export const DirectionSpreadThresholds = zod.object({
  "spreadMax": zod.number(),
  "spreadInvalidMin": zod.number(),
  "weakAdvanceBaseline": zod.number()
}).describe('DirectionSpreadThresholds：市场观测台数据。');

export type DirectionSpreadThresholds = zod.input<typeof DirectionSpreadThresholds>;

export const DirectionSpreadRule = zod.object({
  "type": zod.enum(['DIRECTION_SPREAD']),
  "thresholds": DirectionSpreadThresholds,
  "baseline": DirectionSpreadBaseline,
  "entities": zod.array(zod.string())
}).describe('DirectionSpreadRule：市场观测台数据。');

export type DirectionSpreadRule = zod.input<typeof DirectionSpreadRule>;

export const DocumentKey = zod.enum(['markets.reference', 'papers.catalog.public', 'papers.catalog.all', 'papers.graph.public', 'papers.graph.all', 'papers.search.public']).describe('documents 表里的文档键（派生数据与参考资料；docs/03 第 2、7 节，docs/04 第 6 节）');

export type DocumentKey = zod.input<typeof DocumentKey>;

export const Document = zod.object({
  "key": DocumentKey,
  "payload": zod.looseObject({

}).describe('文档内容，结构由 key 决定：markets.reference → MarketReference，papers.catalog.* → PapersCatalog，papers.graph.* → GraphData，papers.search.public → SearchIndex'),
  "updatedAt": zod.iso.datetime({"offset":true}).describe('最后写入时间')
}).describe('通用的“单份文档”（documents 表，docs/09 第 3 节）。\n写入用 PUT /v1/internal/documents/{key}，请求体就是 payload 本身；读取由各领域的接口完成\n（如 GET /v1/public/markets/reference 返回 markets.reference 的 payload）。');

export type Document = zod.input<typeof Document>;

export const EarningsFigure = zod.object({
  "name": zod.string(),
  "value": zod.string(),
  "yoy": zod.union([zod.string(),zod.null()]),
  "basis": zod.enum(['gaap', 'adjusted', 'other']),
  "quote": zod.string()
});

export type EarningsFigure = zod.input<typeof EarningsFigure>;

export const EarningsGuidance = zod.object({
  "text": zod.string(),
  "quote": zod.string()
});

export type EarningsGuidance = zod.input<typeof EarningsGuidance>;

export const EarningsCard = zod.object({
  "symbol": zod.string(),
  "period": zod.string(),
  "figures": zod.array(EarningsFigure),
  "guidance": zod.union([EarningsGuidance,zod.null()]),
  "takeaway": zod.string(),
  "sourceUrl": zod.string(),
  "sourceAccession": zod.union([zod.string(),zod.null()]),
  "publishedAt": zod.iso.datetime({"offset":true}),
  "generatedBy": zod.union([GeneratedBy,zod.null()])
});

export type EarningsCard = zod.input<typeof EarningsCard>;

export const EarningsCardInput = zod.object({
  "symbol": zod.string(),
  "name": zod.string(),
  "sourceKind": zod.enum(['press_release', 'news']),
  "sourceUrl": zod.string(),
  "sourceText": zod.string()
});

export type EarningsCardInput = zod.input<typeof EarningsCardInput>;

export const EarningsCardOutput = zod.object({
  "period": zod.string(),
  "figures": zod.array(EarningsFigure),
  "guidance": zod.union([EarningsGuidance,zod.null()]),
  "takeaway": zod.string(),
  "generatedBy": GeneratedBy.optional()
});

export type EarningsCardOutput = zod.input<typeof EarningsCardOutput>;

export const EarningsTimelineItem = zod.object({
  "kind": zod.enum(['earnings']),
  "at": zod.iso.datetime({"offset":true}),
  "earnings": EarningsCard
});

export type EarningsTimelineItem = zod.input<typeof EarningsTimelineItem>;

export const EditionKind = zod.enum(['morning', 'premarket', 'weekly', 'legacy']);

export type EditionKind = zod.input<typeof EditionKind>;

export const EditionWindow = zod.object({
  "fromAt": zod.union([zod.iso.datetime({"offset":true}),zod.null()]),
  "toAt": zod.union([zod.iso.datetime({"offset":true}),zod.null()])
});

export type EditionWindow = zod.input<typeof EditionWindow>;

export const EditionLede = zod.object({
  "lines": zod.array(zod.string()),
  "generatedBy": zod.union([GeneratedBy,zod.null()])
});

export type EditionLede = zod.input<typeof EditionLede>;

export const NewsPriceChange = zod.object({
  "symbol": zod.string(),
  "change": zod.number()
});

export type NewsPriceChange = zod.input<typeof NewsPriceChange>;

export const NewsCloseSnapshot = zod.object({
  "indices": zod.array(NewsPriceChange),
  "watchlist": zod.array(NewsPriceChange),
  "treasury10Year": zod.union([zod.number(),zod.null()]),
  "vix": zod.union([zod.number(),zod.null()])
});

export type NewsCloseSnapshot = zod.input<typeof NewsCloseSnapshot>;

export const NewsNewsCloseSnapshotItem = zod.object({
  "id": zod.string(),
  "data": NewsCloseSnapshot,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsNewsCloseSnapshotItem = zod.input<typeof NewsNewsCloseSnapshotItem>;

export const NewsSnapshotSection = zod.object({
  "kind": zod.enum(['close_snapshot', 'weekly_performance']),
  "title": zod.string(),
  "items": zod.array(NewsNewsCloseSnapshotItem)
});

export type NewsSnapshotSection = zod.input<typeof NewsSnapshotSection>;

export const TickerDigestPoint = zod.object({
  "text": zod.string(),
  "sourceIds": zod.array(zod.string()).describe('0–3 个来源，由能力运行时按提示词检查。')
});

export type TickerDigestPoint = zod.input<typeof TickerDigestPoint>;

export const TickerDigest = zod.object({
  "symbol": zod.string(),
  "change": zod.union([zod.number(),zod.null()]),
  "withSector": zod.union([zod.boolean(),zod.null()]),
  "whatHappened": zod.string(),
  "whyItMatters": zod.union([zod.string(),zod.null()]),
  "sourceIds": zod.array(zod.string()).describe('0–3 个来源，由能力运行时按提示词检查。'),
  "points": zod.array(TickerDigestPoint),
  "generatedBy": zod.union([GeneratedBy,zod.null()])
});

export type TickerDigest = zod.input<typeof TickerDigest>;

export const NewsTickerDigestItem = zod.object({
  "id": zod.string(),
  "data": TickerDigest,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsTickerDigestItem = zod.input<typeof NewsTickerDigestItem>;

export const NewsTickerSection = zod.object({
  "kind": zod.enum(['ticker_digests', 'ticker_weekly']),
  "title": zod.string(),
  "items": zod.array(NewsTickerDigestItem)
});

export type NewsTickerSection = zod.input<typeof NewsTickerSection>;

export const NewsUnchangedTickers = zod.object({
  "symbols": zod.array(zod.string())
});

export type NewsUnchangedTickers = zod.input<typeof NewsUnchangedTickers>;

export const NewsNewsUnchangedTickersItem = zod.object({
  "id": zod.string(),
  "data": NewsUnchangedTickers,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsNewsUnchangedTickersItem = zod.input<typeof NewsNewsUnchangedTickersItem>;

export const NewsQuietSection = zod.object({
  "kind": zod.enum(['unchanged_tickers']),
  "title": zod.string(),
  "items": zod.array(NewsNewsUnchangedTickersItem)
});

export type NewsQuietSection = zod.input<typeof NewsQuietSection>;

export const NewsArticleDigest = zod.object({
  "article": Article,
  "summary": zod.union([zod.string(),zod.null()]),
  "whyItMatters": zod.union([zod.string(),zod.null()]),
  "topic": zod.union([zod.string(),zod.null()]),
  "generatedBy": zod.union([GeneratedBy,zod.null()])
});

export type NewsArticleDigest = zod.input<typeof NewsArticleDigest>;

export const NewsNewsArticleDigestItem = zod.object({
  "id": zod.string(),
  "data": NewsArticleDigest,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsNewsArticleDigestItem = zod.input<typeof NewsNewsArticleDigestItem>;

export const NewsArticlesSection = zod.object({
  "kind": zod.enum(['us_news', 'new_messages', 'international_weekly']),
  "title": zod.string(),
  "items": zod.array(NewsNewsArticleDigestItem)
});

export type NewsArticlesSection = zod.input<typeof NewsArticlesSection>;

export const NewsEarningsCardItem = zod.object({
  "id": zod.string(),
  "data": EarningsCard,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsEarningsCardItem = zod.input<typeof NewsEarningsCardItem>;

export const NewsEarningsSection = zod.object({
  "kind": zod.enum(['earnings', 'premarket_earnings', 'earnings_review']),
  "title": zod.string(),
  "items": zod.array(NewsEarningsCardItem)
});

export type NewsEarningsSection = zod.input<typeof NewsEarningsSection>;

export const FilingExhibit = zod.object({
  "name": zod.string(),
  "url": zod.string()
});

export type FilingExhibit = zod.input<typeof FilingExhibit>;

export const Filing = zod.object({
  "accession": zod.string(),
  "cik": zod.string(),
  "ticker": zod.string(),
  "form": zod.string(),
  "filedAt": zod.iso.datetime({"offset":true}),
  "items": zod.array(zod.string()),
  "url": zod.string(),
  "exhibits": zod.array(FilingExhibit)
});

export type Filing = zod.input<typeof Filing>;

export const NewsFilingDigest = zod.object({
  "filing": Filing,
  "digest": zod.union([zod.string(),zod.null()]),
  "generatedBy": zod.union([GeneratedBy,zod.null()])
});

export type NewsFilingDigest = zod.input<typeof NewsFilingDigest>;

export const NewsNewsFilingDigestItem = zod.object({
  "id": zod.string(),
  "data": NewsFilingDigest,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsNewsFilingDigestItem = zod.input<typeof NewsNewsFilingDigestItem>;

export const NewsFilingsSection = zod.object({
  "kind": zod.enum(['filings', 'important_filings']),
  "title": zod.string(),
  "items": zod.array(NewsNewsFilingDigestItem)
});

export type NewsFilingsSection = zod.input<typeof NewsFilingsSection>;

export const InsiderTrade = zod.object({
  "accession": zod.string(),
  "transactionIndex": zod.int(),
  "ticker": zod.string(),
  "insider": zod.string(),
  "role": zod.string(),
  "code": zod.string(),
  "shares": zod.number(),
  "priceUsd": zod.union([zod.number(),zod.null()]),
  "valueUsd": zod.union([zod.number(),zod.null()]),
  "filedAt": zod.iso.datetime({"offset":true}),
  "url": zod.string()
});

export type InsiderTrade = zod.input<typeof InsiderTrade>;

export const NewsInsiderTradeItem = zod.object({
  "id": zod.string(),
  "data": InsiderTrade,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsInsiderTradeItem = zod.input<typeof NewsInsiderTradeItem>;

export const NewsInsidersSection = zod.object({
  "kind": zod.enum(['insider_trades']),
  "title": zod.string(),
  "items": zod.array(NewsInsiderTradeItem)
});

export type NewsInsidersSection = zod.input<typeof NewsInsidersSection>;

export const NewsCalendarEventItem = zod.object({
  "id": zod.string(),
  "data": CalendarEvent,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsCalendarEventItem = zod.input<typeof NewsCalendarEventItem>;

export const NewsCalendarSection = zod.object({
  "kind": zod.enum(['calendar', 'next_week_calendar']),
  "title": zod.string(),
  "items": zod.array(NewsCalendarEventItem)
});

export type NewsCalendarSection = zod.input<typeof NewsCalendarSection>;

export const NewsInternational = zod.object({
  "overview": zod.string(),
  "top5": zod.array(NewsNewsArticleDigestItem),
  "briefs": zod.array(NewsNewsArticleDigestItem),
  "generatedBy": zod.union([GeneratedBy,zod.null()])
});

export type NewsInternational = zod.input<typeof NewsInternational>;

export const NewsNewsInternationalItem = zod.object({
  "id": zod.string(),
  "data": NewsInternational,
  "ruleScore": zod.number().optional(),
  "clusterId": zod.union([zod.string(),zod.null()]).optional()
});

export type NewsNewsInternationalItem = zod.input<typeof NewsNewsInternationalItem>;

export const NewsInternationalSection = zod.object({
  "kind": zod.enum(['international', 'legacy_headlines']),
  "title": zod.string(),
  "items": zod.array(NewsNewsInternationalItem)
});

export type NewsInternationalSection = zod.input<typeof NewsInternationalSection>;

export const NewsSection = zod.union([NewsSnapshotSection,NewsTickerSection,NewsQuietSection,NewsArticlesSection,NewsEarningsSection,NewsFilingsSection,NewsInsidersSection,NewsCalendarSection,NewsInternationalSection]);

export type NewsSection = zod.input<typeof NewsSection>;

export const NewsSourceHealth = zod.object({
  "id": zod.string(),
  "checkedAt": zod.iso.datetime({"offset":true}),
  "status": zod.enum(['ok', 'failed']),
  "error": zod.union([zod.string(),zod.null()])
});

export type NewsSourceHealth = zod.input<typeof NewsSourceHealth>;

export const EditionAiUsage = zod.object({
  "inputTokens": zod.int(),
  "outputTokens": zod.int(),
  "costUsd": zod.number()
});

export type EditionAiUsage = zod.input<typeof EditionAiUsage>;

export const EditionEmail = zod.object({
  "sentAt": zod.union([zod.iso.datetime({"offset":true}),zod.null()])
});

export type EditionEmail = zod.input<typeof EditionEmail>;

export const Edition = zod.object({
  "id": zod.string(),
  "kind": EditionKind,
  "date": zod.iso.date(),
  "window": EditionWindow,
  "generatedAt": zod.union([zod.iso.datetime({"offset":true}),zod.null()]),
  "lede": zod.union([EditionLede,zod.null()]),
  "sections": zod.array(NewsSection),
  "sources": zod.array(NewsSourceHealth),
  "aiUsage": zod.union([EditionAiUsage,zod.null()]),
  "email": zod.union([EditionEmail,zod.null()])
});

export type Edition = zod.input<typeof Edition>;

export const editionFeedbackScoreMax = 5;



export const EditionFeedback = zod.object({
  "kind": zod.enum(['edition']),
  "id": zod.string(),
  "createdAt": zod.iso.datetime({"offset":true}),
  "editionId": zod.string(),
  "score": zod.int().min(1).max(editionFeedbackScoreMax)
});

export type EditionFeedback = zod.input<typeof EditionFeedback>;

export const editionFeedbackRequestScoreMax = 5;



export const EditionFeedbackRequest = zod.object({
  "score": zod.int().min(1).max(editionFeedbackRequestScoreMax)
});

export type EditionFeedbackRequest = zod.input<typeof EditionFeedbackRequest>;

export const EditionLedeFact = zod.object({
  "id": zod.string(),
  "text": zod.string()
}).describe('已整理的事实文本，数字用显示口径字符串，避免向提示词传浮点收益率。');

export type EditionLedeFact = zod.input<typeof EditionLedeFact>;

export const EditionLedeInput = zod.object({
  "mode": zod.enum(['morning', 'premarket', 'weekly']),
  "date": zod.iso.date(),
  "facts": zod.array(EditionLedeFact)
});

export type EditionLedeInput = zod.input<typeof EditionLedeInput>;

export const EditionLedeOutput = zod.object({
  "lines": zod.array(zod.string()),
  "generatedBy": GeneratedBy.optional()
});

export type EditionLedeOutput = zod.input<typeof EditionLedeOutput>;

export const EditionSummary = zod.object({
  "id": zod.string(),
  "kind": EditionKind,
  "date": zod.iso.date(),
  "generatedAt": zod.union([zod.iso.datetime({"offset":true}),zod.null()])
});

export type EditionSummary = zod.input<typeof EditionSummary>;

export const EditionPage = zod.object({
  "items": zod.array(EditionSummary).describe('本页条目'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null')
}).describe('游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。\n用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。');

export type EditionPage = zod.input<typeof EditionPage>;

export const ExportTable = zod.enum(['news_sources', 'articles', 'filings', 'insider_trades', 'calendar_events', 'earnings_cards', 'editions', 'edition_feedback', 'watch_items', 'market_days', 'market_hypotheses', 'market_weeklies', 'market_events', 'index_history', 'papers', 'paper_private', 'paper_reviews', 'paper_uploads', 'documents', 'runs', 'ai_calls', 'eval_results']).describe('可以导出的表：docs/09 第 3 节除鉴权表和两张 FTS5 虚拟表以外的全部表');

export type ExportTable = zod.input<typeof ExportTable>;

export const ExportPage = zod.object({
  "table": ExportTable.describe('导出的表'),
  "items": zod.array(zod.looseObject({

})).describe('本页的行：列名 → 值，保持数据库里的原样'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标；没有下一页时为 null')
}).describe('GET /v1/internal/export/{table} 的一页（hub export 每晚分页读出，写进数据仓库 bowen-hub-data，docs/09 第 5 节）');

export type ExportPage = zod.input<typeof ExportPage>;

export const ItemFeedback = zod.object({
  "kind": zod.enum(['item']),
  "id": zod.string(),
  "createdAt": zod.iso.datetime({"offset":true}),
  "editionId": zod.string(),
  "itemId": zod.string(),
  "reason": zod.enum(['useless', 'incorrect'])
});

export type ItemFeedback = zod.input<typeof ItemFeedback>;

export const Feedback = zod.union([EditionFeedback,ItemFeedback]);

export type Feedback = zod.input<typeof Feedback>;

export const FilingDigestInput = zod.object({
  "symbol": zod.string(),
  "name": zod.string(),
  "form": zod.string(),
  "items": zod.array(zod.string()),
  "text": zod.string()
});

export type FilingDigestInput = zod.input<typeof FilingDigestInput>;

export const FilingDigestOutput = zod.object({
  "digest": zod.string(),
  "generatedBy": GeneratedBy.optional()
});

export type FilingDigestOutput = zod.input<typeof FilingDigestOutput>;

export const FilingTimelineItem = zod.object({
  "kind": zod.enum(['filing']),
  "at": zod.iso.datetime({"offset":true}),
  "filing": Filing
});

export type FilingTimelineItem = zod.input<typeof FilingTimelineItem>;

export const PaperGraphNode = zod.object({
  "id": zod.string(),
  "kind": zod.enum(['paper', 'concept', 'space']),
  "label": zod.string()
});

export type PaperGraphNode = zod.input<typeof PaperGraphNode>;

export const PaperGraphEdge = zod.object({
  "source": zod.string(),
  "target": zod.string(),
  "type": zod.enum(['discusses', 'belongs_to', 'relation']),
  "relationType": zod.string().optional(),
  "note": zod.string().optional()
});

export type PaperGraphEdge = zod.input<typeof PaperGraphEdge>;

export const PaperConceptCooccurrence = zod.object({
  "source": zod.string(),
  "target": zod.string(),
  "count": zod.int()
});

export type PaperConceptCooccurrence = zod.input<typeof PaperConceptCooccurrence>;

export const GraphData = zod.object({
  "nodes": zod.array(PaperGraphNode),
  "edges": zod.array(PaperGraphEdge),
  "cooccurrence": zod.array(PaperConceptCooccurrence)
});

export type GraphData = zod.input<typeof GraphData>;

export const Health = zod.object({
  "status": zod.enum(['ok']).describe('API 在线时为 ok')
}).describe('GET /v1/health 的返回');

export type Health = zod.input<typeof Health>;

export const MarketPersistenceThresholds = zod.object({
  "advanceShareMin": zod.number(),
  "aboveMa20ShareMin": zod.number(),
  "turnoverCnyMin": zod.number(),
  "advanceShareInvalid": zod.number(),
  "turnoverRatioInvalid": zod.number(),
  "aboveMa20DropInvalid": zod.number()
}).describe('MarketPersistenceThresholds：市场观测台数据。');

export type MarketPersistenceThresholds = zod.input<typeof MarketPersistenceThresholds>;

export const MarketPersistenceBaseline = zod.object({
  "turnoverCny": zod.number(),
  "aboveMa20Share": zod.number()
}).describe('MarketPersistenceBaseline：市场观测台数据。');

export type MarketPersistenceBaseline = zod.input<typeof MarketPersistenceBaseline>;

export const MarketPersistenceRule = zod.object({
  "type": zod.enum(['MARKET_PERSISTENCE']),
  "thresholds": MarketPersistenceThresholds,
  "baseline": MarketPersistenceBaseline
}).describe('MarketPersistenceRule：市场观测台数据。');

export type MarketPersistenceRule = zod.input<typeof MarketPersistenceRule>;

export const LimitEcologyThresholds = zod.object({
  "sealRateMin": zod.number(),
  "multiBoardMin": zod.int(),
  "limitDownMax": zod.int(),
  "sealRateInvalid": zod.number(),
  "multiBoardInvalid": zod.int(),
  "limitDownInvalid": zod.int()
}).describe('LimitEcologyThresholds：市场观测台数据。');

export type LimitEcologyThresholds = zod.input<typeof LimitEcologyThresholds>;

export const LimitEcologyBaseline = zod.object({
  "sealRate": zod.number(),
  "multiBoardCount": zod.int(),
  "limitDownCount": zod.int()
}).describe('LimitEcologyBaseline：市场观测台数据。');

export type LimitEcologyBaseline = zod.input<typeof LimitEcologyBaseline>;

export const LimitEcologyRule = zod.object({
  "type": zod.enum(['LIMIT_ECOLOGY']),
  "thresholds": LimitEcologyThresholds,
  "baseline": LimitEcologyBaseline
}).describe('LimitEcologyRule：市场观测台数据。');

export type LimitEcologyRule = zod.input<typeof LimitEcologyRule>;

export const HypothesisRule = zod.union([MarketPersistenceRule,DirectionPersistenceRule,DirectionRepairRule,LimitEcologyRule,DirectionSpreadRule]);

export type HypothesisRule = zod.input<typeof HypothesisRule>;

export const HypothesisResult = zod.enum(['PENDING', 'CONFIRMED', 'NOT_CONFIRMED', 'INCONCLUSIVE']);

export type HypothesisResult = zod.input<typeof HypothesisResult>;

export const MarketPersistenceActual = zod.object({
  "advanceShare": zod.number(),
  "aboveMa20Share": zod.number(),
  "turnoverCny": zod.number()
}).describe('MarketPersistenceActual：市场观测台数据。');

export type MarketPersistenceActual = zod.input<typeof MarketPersistenceActual>;

export const LimitEcologyActual = zod.object({
  "sealRate": zod.number(),
  "multiBoardCount": zod.int(),
  "limitDownCount": zod.int()
}).describe('LimitEcologyActual：市场观测台数据。');

export type LimitEcologyActual = zod.input<typeof LimitEcologyActual>;

export const HypothesisActual = zod.union([MarketPersistenceActual,DirectionPersistenceActual,DirectionRepairActual,LimitEcologyActual,DirectionSpreadActual]);

export type HypothesisActual = zod.input<typeof HypothesisActual>;

export const Hypothesis = zod.object({
  "id": zod.string(),
  "createdOn": zod.iso.date(),
  "dueOn": zod.iso.date(),
  "mode": zod.enum(['realtime', 'backfill']),
  "engineVersion": zod.string().optional(),
  "title": zod.string(),
  "confirmation": zod.string(),
  "invalidation": zod.string(),
  "risk": zod.string(),
  "counterEvidence": zod.string(),
  "resultNote": zod.string(),
  "scope": zod.enum(['market', 'direction', 'theme', 'sector', 'index']),
  "rule": zod.union([HypothesisRule,zod.null()]),
  "result": HypothesisResult,
  "settledOn": zod.union([zod.iso.date(),zod.null()]),
  "actual": zod.union([HypothesisActual,zod.null()])
}).describe('Hypothesis：市场观测台数据。');

export type Hypothesis = zod.input<typeof Hypothesis>;

export const HypothesisPage = zod.object({
  "items": zod.array(Hypothesis).describe('本页条目'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null')
}).describe('游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。\n用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。');

export type HypothesisPage = zod.input<typeof HypothesisPage>;

export const HypothesisRuleType = zod.enum(['MARKET_PERSISTENCE', 'DIRECTION_PERSISTENCE', 'DIRECTION_REPAIR', 'LIMIT_ECOLOGY', 'DIRECTION_SPREAD']);

export type HypothesisRuleType = zod.input<typeof HypothesisRuleType>;

export const IndexBar = zod.object({
  "date": zod.iso.date(),
  "open": zod.number(),
  "high": zod.number(),
  "low": zod.number(),
  "close": zod.number(),
  "preClose": zod.number(),
  "return1d": zod.number(),
  "amountCny": zod.number()
}).describe('IndexBar：市场观测台数据。');

export type IndexBar = zod.input<typeof IndexBar>;

export const ItemFeedbackRequest = zod.object({
  "editionId": zod.string(),
  "itemId": zod.string(),
  "reason": zod.enum(['useless', 'incorrect'])
});

export type ItemFeedbackRequest = zod.input<typeof ItemFeedbackRequest>;

export const MarketAppearance = zod.object({
  "name": zod.string(),
  "top3Appearances": zod.int()
}).describe('MarketAppearance：市场观测台数据。');

export type MarketAppearance = zod.input<typeof MarketAppearance>;

export const MarketBoardSegment = zod.object({
  "name": zod.string(),
  "sampleCount": zod.int(),
  "return1d": zod.number(),
  "advanceShare": zod.number(),
  "aboveMa20Share": zod.number(),
  "turnoverRateMedian": zod.union([zod.number(),zod.null()]).describe('换手率为0–1小数。')
}).describe('MarketBoardSegment：市场观测台数据。');

export type MarketBoardSegment = zod.input<typeof MarketBoardSegment>;

export const MarketCapSegment = zod.object({
  "name": zod.string(),
  "sampleCount": zod.int(),
  "return1d": zod.number(),
  "advanceShare": zod.number(),
  "medianMarketCapCny": zod.number()
}).describe('MarketCapSegment：市场观测台数据。');

export type MarketCapSegment = zod.input<typeof MarketCapSegment>;

export const MarketComponentCrossCheck = zod.object({
  "return1d": zod.union([zod.number(),zod.null()]),
  "return5d": zod.union([zod.number(),zod.null()]),
  "return20d": zod.union([zod.number(),zod.null()]),
  "delta1dVsOfficial": zod.union([zod.number(),zod.null()])
}).describe('MarketComponentCrossCheck：市场观测台数据。');

export type MarketComponentCrossCheck = zod.input<typeof MarketComponentCrossCheck>;

export const MarketDataStatus = zod.object({
  "complete": zod.boolean(),
  "missing": zod.array(zod.enum(['moneyflow', 'limitDetail', 'etfGroups', 'etfShares', 'directions']))
}).describe('MarketDataStatus：市场观测台数据。');

export type MarketDataStatus = zod.input<typeof MarketDataStatus>;

export const MarketIndex = zod.object({
  "code": zod.string(),
  "name": zod.string(),
  "close": zod.number(),
  "return1d": zod.number(),
  "amountCny": zod.number()
}).describe('MarketIndex：市场观测台数据。');

export type MarketIndex = zod.input<typeof MarketIndex>;

export const MarketOverview = zod.object({
  "sampleCount": zod.int(),
  "advanceCount": zod.int(),
  "declineCount": zod.int(),
  "flatCount": zod.int(),
  "newHigh20Count": zod.int(),
  "newLow20Count": zod.int(),
  "advanceShare": zod.number(),
  "medianReturn1d": zod.number(),
  "aboveMa20Share": zod.number(),
  "turnoverCny": zod.number(),
  "turnoverPrevCny": zod.number(),
  "turnoverChange": zod.number(),
  "turnoverMedian20Cny": zod.number(),
  "totalMarketCapCny": zod.number(),
  "medianTurnoverRate": zod.union([zod.number(),zod.null()]).describe('换手率为0–1小数，旧数据百分数除以100。'),
  "medianPeTtm": zod.union([zod.number(),zod.null()]),
  "medianPb": zod.union([zod.number(),zod.null()])
}).describe('MarketOverview：市场观测台数据。');

export type MarketOverview = zod.input<typeof MarketOverview>;

export const MarketTemperatureParts = zod.object({
  "breadth": zod.number(),
  "trend": zod.number(),
  "limitEcology": zod.number(),
  "liquidity": zod.number(),
  "positiveIndices": zod.number()
}).describe('MarketTemperatureParts：市场观测台数据。');

export type MarketTemperatureParts = zod.input<typeof MarketTemperatureParts>;

export const MarketTemperature = zod.object({
  "value": zod.number(),
  "version": zod.enum(['transparent-close-v1']),
  "parts": MarketTemperatureParts,
  "boundary": zod.string()
}).describe('MarketTemperature：市场观测台数据。');

export type MarketTemperature = zod.input<typeof MarketTemperature>;

export const MarketLossEffectInput = zod.object({
  "limitDown": zod.int(),
  "largeLoss": zod.int()
}).describe('MarketSentimentDimension：市场观测台数据。');

export type MarketLossEffectInput = zod.input<typeof MarketLossEffectInput>;

export const MarketUpDownBalanceInput = zod.object({
  "limitUp": zod.int(),
  "limitDown": zod.int()
});

export type MarketUpDownBalanceInput = zod.input<typeof MarketUpDownBalanceInput>;

export const MarketSentimentDimension = zod.object({
  "key": zod.enum(['limitHeight', 'limitUpCount', 'sealRate', 'advancementRate', 'previousLimitPremium', 'lossEffect', 'breadth', 'upDownBalance', 'turnover']),
  "label": zod.string(),
  "weight": zod.number(),
  "input": zod.union([zod.number(),MarketLossEffectInput,MarketUpDownBalanceInput,zod.null()]),
  "unit": zod.string(),
  "score": zod.number(),
  "formula": zod.string()
});

export type MarketSentimentDimension = zod.input<typeof MarketSentimentDimension>;

export const MarketSentiment = zod.object({
  "value": zod.number(),
  "version": zod.enum(['transparent-ecology-v2']),
  "dimensions": zod.array(MarketSentimentDimension),
  "boundary": zod.string()
}).describe('MarketSentiment：市场观测台数据。');

export type MarketSentiment = zod.input<typeof MarketSentiment>;

export const MarketStyleGroup = zod.object({
  "name": zod.enum(['高位加速', '趋势延续', '低位修复', '中间状态']),
  "count": zod.int(),
  "share": zod.number(),
  "meanReturn1d": zod.number(),
  "medianReturn1d": zod.number()
}).describe('MarketStyleGroup：市场观测台数据。');

export type MarketStyleGroup = zod.input<typeof MarketStyleGroup>;

export const MarketStyle = zod.object({
  "version": zod.enum(['transparent-style-v1']),
  "groups": zod.array(MarketStyleGroup),
  "trendStrongShare": zod.number()
}).describe('MarketStyle：市场观测台数据。');

export type MarketStyle = zod.input<typeof MarketStyle>;

export const MarketProviderDetail = zod.object({
  "rowCount": zod.int(),
  "limitUpCount": zod.int(),
  "limitDownCount": zod.int(),
  "openedOrTouchedNotClosedCount": zod.int(),
  "classification": zod.string()
}).describe('MarketProviderDetail：市场观测台数据。');

export type MarketProviderDetail = zod.input<typeof MarketProviderDetail>;

export const MarketHeightDistribution = zod.object({
  "height": zod.int(),
  "count": zod.int(),
  "names": zod.array(zod.string())
}).describe('MarketHeightDistribution：市场观测台数据。');

export type MarketHeightDistribution = zod.input<typeof MarketHeightDistribution>;

export const MarketIndustryCluster = zod.object({
  "industry": zod.string(),
  "count": zod.int(),
  "maxBoardHeight": zod.int(),
  "names": zod.array(zod.string())
}).describe('MarketIndustryCluster：市场观测台数据。');

export type MarketIndustryCluster = zod.input<typeof MarketIndustryCluster>;

export const MarketLimitDetail = zod.object({
  "type": zod.enum(['U', 'D', 'Z']),
  "firstTime": zod.union([zod.string(),zod.null()]),
  "lastTime": zod.union([zod.string(),zod.null()]),
  "upStat": zod.union([zod.string(),zod.null()]),
  "openTimes": zod.union([zod.int(),zod.null()]),
  "limitTimes": zod.union([zod.int(),zod.null()]),
  "sealedAmountCny": zod.union([zod.number(),zod.null()])
}).describe('MarketLimitDetail：市场观测台数据。');

export type MarketLimitDetail = zod.input<typeof MarketLimitDetail>;

export const MarketStock = zod.object({
  "code": zod.string(),
  "name": zod.string(),
  "industry": zod.string(),
  "board": zod.string(),
  "return1d": zod.number(),
  "boardHeight": zod.int(),
  "amountCny": zod.number(),
  "limitDetail": zod.union([MarketLimitDetail,zod.null()])
}).describe('MarketStock：市场观测台数据。');

export type MarketStock = zod.input<typeof MarketStock>;

export const MarketProgression = MarketStock.and(zod.object({
  "previousBoardHeight": zod.int(),
  "progressionState": zod.enum(['连续晋级', '首板建立', '重新封板', '晋级未完成'])
})).describe('MarketProgression：市场观测台数据。');

export type MarketProgression = zod.input<typeof MarketProgression>;

export const MarketLimitEcology = zod.object({
  "limitUpCount": zod.int(),
  "limitDownCount": zod.int(),
  "touchedCount": zod.int(),
  "failedCount": zod.int(),
  "maxBoardHeight": zod.int(),
  "firstBoardCount": zod.int(),
  "multiBoardCount": zod.int(),
  "previousLimitUpCount": zod.int(),
  "advancementCount": zod.int(),
  "largeLoss7Count": zod.int(),
  "sealRate": zod.union([zod.number(),zod.null()]),
  "advancementRate": zod.union([zod.number(),zod.null()]),
  "previousLimitPremium": zod.union([zod.number(),zod.null()]),
  "providerDetail": zod.union([MarketProviderDetail,zod.null()]),
  "heightDistribution": zod.array(MarketHeightDistribution),
  "industryClusters": zod.array(MarketIndustryCluster),
  "progression": zod.array(MarketProgression),
  "failedPromotions": zod.array(MarketProgression),
  "leaders": zod.array(MarketStock),
  "limitDownSamples": zod.array(MarketStock),
  "largeLossSamples": zod.array(MarketStock)
}).describe('MarketLimitEcology：市场观测台数据。');

export type MarketLimitEcology = zod.input<typeof MarketLimitEcology>;

export const MarketMoneyflow = zod.object({
  "marketNetCny": zod.number(),
  "marketNetRate": zod.number(),
  "extraLargeNetCny": zod.number(),
  "largeNetCny": zod.number(),
  "mediumNetCny": zod.number(),
  "smallNetCny": zod.number(),
  "stockCoverageCount": zod.union([zod.int(),zod.null()]),
  "classificationBoundary": zod.string()
}).describe('MarketMoneyflow：市场观测台数据。');

export type MarketMoneyflow = zod.input<typeof MarketMoneyflow>;

export const MarketIndustry = zod.object({
  "name": zod.string(),
  "sampleCount": zod.int(),
  "return1d": zod.number(),
  "medianReturn1d": zod.number(),
  "advanceShare": zod.number(),
  "aboveMa20Share": zod.number(),
  "amountCny": zod.number(),
  "amountShare": zod.number(),
  "return5d": zod.union([zod.number(),zod.null()]),
  "return20d": zod.union([zod.number(),zod.null()]),
  "medianPeTtm": zod.union([zod.number(),zod.null()]),
  "medianPb": zod.union([zod.number(),zod.null()]),
  "limitUpCount": zod.int(),
  "limitDownCount": zod.int(),
  "lifecycle": zod.enum(['趋势扩散', '高位分歧', '修复延续', '退潮观察', '低位修复', '方向待明'])
}).describe('MarketIndustry：市场观测台数据。');

export type MarketIndustry = zod.input<typeof MarketIndustry>;

export const MarketTheme = zod.object({
  "name": zod.string(),
  "members": zod.array(zod.string()),
  "sampleCount": zod.int(),
  "return1d": zod.number(),
  "advanceShare": zod.number(),
  "aboveMa20Share": zod.number(),
  "amountShare": zod.number(),
  "return5d": zod.union([zod.number(),zod.null()]),
  "return20d": zod.union([zod.number(),zod.null()]),
  "limitUpCount": zod.int(),
  "limitDownCount": zod.int()
}).describe('MarketTheme：市场观测台数据。');

export type MarketTheme = zod.input<typeof MarketTheme>;

export const MarketDirectionLeader = zod.object({
  "code": zod.string(),
  "name": zod.string(),
  "return1d": zod.number(),
  "amountCny": zod.number()
}).describe('MarketDirectionLeader：市场观测台数据。');

export type MarketDirectionLeader = zod.input<typeof MarketDirectionLeader>;

export const MarketDirectionLaggard = zod.object({
  "code": zod.string(),
  "name": zod.string(),
  "return1d": zod.number()
}).describe('MarketDirectionLaggard：市场观测台数据。');

export type MarketDirectionLaggard = zod.input<typeof MarketDirectionLaggard>;

export const MarketDirection = zod.object({
  "name": zod.string(),
  "sourceIndexCode": zod.string(),
  "memberCount": zod.int(),
  "coveredCount": zod.int(),
  "return1d": zod.number(),
  "medianReturn1d": zod.number(),
  "advanceShare": zod.number(),
  "aboveMa20Share": zod.number(),
  "amountCny": zod.number(),
  "amountShare": zod.number(),
  "amount20dPercentile": zod.number(),
  "relativeVsAllA": zod.number(),
  "return5d": zod.union([zod.number(),zod.null()]),
  "return20d": zod.union([zod.number(),zod.null()]),
  "moneyflowProxyCny": zod.union([zod.number(),zod.null()]),
  "moneyflowCoverage": zod.union([zod.number(),zod.null()]).describe('有资金流数据的成员数 / memberCount；无法核实股数时为空。'),
  "limitUpCount": zod.int(),
  "limitDownCount": zod.int(),
  "loss5Count": zod.int(),
  "componentCrossCheck": MarketComponentCrossCheck,
  "leaders": zod.array(MarketDirectionLeader),
  "laggards": zod.array(MarketDirectionLaggard),
  "state": zod.enum(['趋势扩散', '高位分歧', '低位修复', '趋势转弱', '方向待明'])
}).describe('MarketDirection：市场观测台数据。');

export type MarketDirection = zod.input<typeof MarketDirection>;

export const MarketDirections = zod.object({
  "membershipAsOf": zod.iso.date(),
  "items": zod.array(MarketDirection)
}).describe('MarketDirections：市场观测台数据。');

export type MarketDirections = zod.input<typeof MarketDirections>;

export const MarketEtfRepresentative = zod.object({
  "code": zod.string(),
  "name": zod.string(),
  "return1d": zod.number(),
  "amountCny": zod.number(),
  "shareDelta": zod.union([zod.number(),zod.null()])
}).describe('MarketEtfRepresentative：市场观测台数据。');

export type MarketEtfRepresentative = zod.input<typeof MarketEtfRepresentative>;

export const MarketEtfGroup = zod.object({
  "name": zod.string(),
  "rule": zod.string(),
  "sampleCount": zod.int(),
  "amountWeightedReturn1d": zod.number(),
  "medianReturn1d": zod.number(),
  "amountCny": zod.number(),
  "medianReturn5d": zod.union([zod.number(),zod.null()]),
  "medianReturn20d": zod.union([zod.number(),zod.null()]),
  "shareCoverage": zod.union([zod.number(),zod.null()]),
  "shareIncreaseCount": zod.union([zod.int(),zod.null()]),
  "shareDecreaseCount": zod.union([zod.int(),zod.null()]),
  "representative": MarketEtfRepresentative
}).describe('MarketEtfGroup：市场观测台数据。');

export type MarketEtfGroup = zod.input<typeof MarketEtfGroup>;

export const MarketEtfGroups = zod.object({
  "groups": zod.array(MarketEtfGroup)
}).describe('MarketEtfGroups：市场观测台数据。');

export type MarketEtfGroups = zod.input<typeof MarketEtfGroups>;

export const MarketSegments = zod.object({
  "boards": zod.array(MarketBoardSegment),
  "marketCap": zod.array(MarketCapSegment)
}).describe('MarketSegments：市场观测台数据。');

export type MarketSegments = zod.input<typeof MarketSegments>;

export const MarketStocks = zod.object({
  "top": zod.array(MarketStock),
  "bottom": zod.array(MarketStock)
}).describe('MarketStocks：市场观测台数据。');

export type MarketStocks = zod.input<typeof MarketStocks>;

export const MarketTechnicalLevel = zod.object({
  "label": zod.string(),
  "value": zod.number(),
  "kind": zod.enum(['dynamic_average', 'observed_low', 'observed_high'])
}).describe('MarketTechnicalLevel：市场观测台数据。');

export type MarketTechnicalLevel = zod.input<typeof MarketTechnicalLevel>;

export const MarketTechnical = zod.object({
  "indexCode": zod.string(),
  "asOf": zod.iso.date(),
  "close": zod.number(),
  "ma5": zod.number(),
  "ma10": zod.number(),
  "ma20": zod.number(),
  "atr20": zod.number(),
  "support": zod.array(MarketTechnicalLevel),
  "resistance": zod.array(MarketTechnicalLevel),
  "confirmationRule": zod.string(),
  "confirmationNow": zod.boolean()
}).describe('MarketTechnical：市场观测台数据。');

export type MarketTechnical = zod.input<typeof MarketTechnical>;

export const MarketQuestion = zod.object({
  "title": zod.string(),
  "text": zod.string()
}).describe('MarketQuestion：市场观测台数据。');

export type MarketQuestion = zod.input<typeof MarketQuestion>;

export const MarketStateSummary = zod.object({
  "headline": zod.string(),
  "text": zod.string(),
  "support": zod.string(),
  "counterEvidence": zod.string(),
  "tags": zod.array(zod.string()),
  "risks": zod.array(MarketQuestion),
  "nextValidations": zod.array(MarketQuestion)
}).describe('MarketStateSummary：市场观测台数据。');

export type MarketStateSummary = zod.input<typeof MarketStateSummary>;

export const MarketRankedReturn = zod.object({
  "name": zod.string(),
  "return1d": zod.number()
}).describe('MarketRankedReturn：市场观测台数据。');

export type MarketRankedReturn = zod.input<typeof MarketRankedReturn>;

export const MarketDirectionRelative = zod.object({
  "name": zod.string(),
  "relativeVsAllA": zod.number()
}).describe('MarketDirectionRelative：市场观测台数据。');

export type MarketDirectionRelative = zod.input<typeof MarketDirectionRelative>;

export const MarketDaySummary = zod.object({
  "date": zod.iso.date(),
  "headline": zod.string(),
  "complete": zod.boolean(),
  "temperature": zod.number(),
  "sentiment": zod.number(),
  "advanceShare": zod.number(),
  "aboveMa20Share": zod.number(),
  "medianReturn1d": zod.number(),
  "turnoverCny": zod.number(),
  "trendStrongShare": zod.number(),
  "advanceCount": zod.int(),
  "declineCount": zod.int(),
  "limitUpCount": zod.int(),
  "limitDownCount": zod.int(),
  "maxBoard": zod.int(),
  "sealRate": zod.union([zod.number(),zod.null()]),
  "topDirections": zod.union([zod.array(MarketRankedReturn),zod.null()]),
  "topIndustries": zod.array(MarketRankedReturn),
  "directionsRelative": zod.union([zod.array(MarketDirectionRelative),zod.null()])
}).describe('MarketDaySummary：市场观测台数据。');

export type MarketDaySummary = zod.input<typeof MarketDaySummary>;

export const MarketEdgeChange = zod.object({
  "change": zod.number(),
  "state": zod.string()
}).describe('MarketEdgeChange：市场观测台数据。');

export type MarketEdgeChange = zod.input<typeof MarketEdgeChange>;

export const MarketEvolutionEdgeChanges = zod.object({
  "turnover": zod.union([MarketEdgeChange,zod.null()]),
  "advanceShare": zod.union([MarketEdgeChange,zod.null()]),
  "limitUpCount": zod.union([MarketEdgeChange,zod.null()]),
  "maxBoard": zod.union([MarketEdgeChange,zod.null()])
}).describe('MarketEvolutionEdgeChanges：市场观测台数据。');

export type MarketEvolutionEdgeChanges = zod.input<typeof MarketEvolutionEdgeChanges>;

export const marketEvolutionSummaryDirectionCoverageDaysMin = 0;
export const marketEvolutionSummaryDirectionCoverageDaysMax = 5;



export const MarketEvolutionSummary = zod.object({
  "turnoverMedianCny": zod.number(),
  "temperatureRange": zod.array(zod.number()),
  "advanceShareRange": zod.array(zod.number()),
  "directions": zod.array(MarketAppearance),
  "industries": zod.array(MarketAppearance),
  "directionCoverageDays": zod.int().min(marketEvolutionSummaryDirectionCoverageDaysMin).max(marketEvolutionSummaryDirectionCoverageDaysMax).describe('有方向数据的交易日数量，页面显示覆盖 n/5。'),
  "windowDays": zod.literal(5)
}).describe('MarketEvolutionSummary：市场观测台数据。');

export type MarketEvolutionSummary = zod.input<typeof MarketEvolutionSummary>;

export const MarketTransmissionPart = zod.object({
  "name": zod.string(),
  "text": zod.string()
}).describe('MarketTransmissionPart：市场观测台数据。');

export type MarketTransmissionPart = zod.input<typeof MarketTransmissionPart>;

export const MarketTransmission = zod.object({
  "liquidityBreadth": MarketTransmissionPart,
  "direction": zod.union([MarketTransmissionPart,zod.null()]),
  "limitCluster": MarketTransmissionPart,
  "negativeFeedback": MarketTransmissionPart
}).describe('MarketTransmission：市场观测台数据。');

export type MarketTransmission = zod.input<typeof MarketTransmission>;

export const MarketEvolutionSignal = zod.object({
  "name": zod.string(),
  "currentState": zod.string(),
  "confirmation": zod.string(),
  "invalidation": zod.string()
}).describe('MarketEvolutionSignal：市场观测台数据。');

export type MarketEvolutionSignal = zod.input<typeof MarketEvolutionSignal>;

export const MarketEvolutionSignals = zod.object({
  "liquidity": MarketEvolutionSignal,
  "direction": zod.union([MarketEvolutionSignal,zod.null()]),
  "progression": MarketEvolutionSignal,
  "breadth": MarketEvolutionSignal
}).describe('MarketEvolutionSignals：市场观测台数据。');

export type MarketEvolutionSignals = zod.input<typeof MarketEvolutionSignals>;

export const marketEvolutionRowsMin = 5;
export const marketEvolutionRowsMax = 5;



export const MarketEvolution = zod.object({
  "rows": zod.array(MarketDaySummary).min(marketEvolutionRowsMin).max(marketEvolutionRowsMax).describe('固定最近五个交易日；缺方向时保留该日，不跨缺口比较。'),
  "edgeChanges": MarketEvolutionEdgeChanges,
  "summary": MarketEvolutionSummary,
  "transmission": MarketTransmission,
  "signals": MarketEvolutionSignals
}).describe('MarketEvolution：市场观测台数据。');

export type MarketEvolution = zod.input<typeof MarketEvolution>;

export const MarketValidationCount = zod.object({
  "ruleType": zod.union([HypothesisRuleType,zod.null()]),
  "settledCount": zod.int(),
  "confirmedCount": zod.int(),
  "notConfirmedCount": zod.int(),
  "inconclusiveCount": zod.int(),
  "confirmedShare": zod.union([zod.number(),zod.null()]),
  "notConfirmedShare": zod.union([zod.number(),zod.null()]),
  "inconclusiveShare": zod.union([zod.number(),zod.null()])
}).describe('MarketValidationCount：市场观测台数据。');

export type MarketValidationCount = zod.input<typeof MarketValidationCount>;

export const MarketValidationStats = zod.object({
  "cumulative": zod.array(MarketValidationCount),
  "last20TradingDays": zod.array(MarketValidationCount)
}).describe('MarketValidationStats：市场观测台数据。');

export type MarketValidationStats = zod.input<typeof MarketValidationStats>;

export const MarketValidation = zod.object({
  "settledToday": zod.array(zod.string()),
  "createdToday": zod.array(zod.string()),
  "stats": MarketValidationStats
}).describe('MarketValidation：市场观测台数据。');

export type MarketValidation = zod.input<typeof MarketValidation>;

export const MarketDay = zod.object({
  "schemaVersion": zod.literal(1),
  "date": zod.iso.date(),
  "previousDate": zod.iso.date(),
  "generatedAt": zod.iso.datetime({"offset":true}),
  "dataStatus": MarketDataStatus,
  "indices": zod.array(MarketIndex),
  "market": MarketOverview,
  "temperature": MarketTemperature,
  "sentiment": MarketSentiment,
  "style": MarketStyle,
  "limitEcology": MarketLimitEcology,
  "moneyflow": zod.union([MarketMoneyflow,zod.null()]),
  "industries": zod.array(MarketIndustry),
  "themes": zod.array(MarketTheme),
  "directions": zod.union([MarketDirections,zod.null()]),
  "etfGroups": zod.union([MarketEtfGroups,zod.null()]),
  "segments": MarketSegments,
  "stocks": MarketStocks,
  "technical": MarketTechnical,
  "summary": MarketStateSummary,
  "evolution": MarketEvolution,
  "validation": MarketValidation
}).describe('MarketDay：市场观测台数据。');

export type MarketDay = zod.input<typeof MarketDay>;

export const MarketDaySummaryPage = zod.object({
  "items": zod.array(MarketDaySummary).describe('本页条目'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null')
}).describe('游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。\n用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。');

export type MarketDaySummaryPage = zod.input<typeof MarketDaySummaryPage>;

export const MarketDayWrite = zod.object({
  "day": MarketDay,
  "summary": MarketDaySummary
}).describe('MarketDayWrite：市场观测台数据。');

export type MarketDayWrite = zod.input<typeof MarketDayWrite>;

export const MarketEvent = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "sourceLabel": zod.string(),
  "sourceUrl": zod.union([zod.string(),zod.null()]),
  "confirmation": zod.string(),
  "invalidation": zod.string(),
  "startDate": zod.iso.date(),
  "endDate": zod.iso.date(),
  "status": zod.enum(['confirmed', 'pending']),
  "watchItems": zod.array(zod.string()),
  "aShareMappings": zod.array(zod.string())
}).describe('MarketEvent：市场观测台数据。');

export type MarketEvent = zod.input<typeof MarketEvent>;

export const MarketReferenceMetric = zod.object({
  "id": zod.string(),
  "label": zod.string(),
  "group": zod.string(),
  "boundary": zod.string().optional(),
  "definition": zod.string(),
  "formula": zod.string(),
  "unit": zod.string(),
  "source": zod.string()
}).describe('MarketReferenceMetric：市场观测台数据。');

export type MarketReferenceMetric = zod.input<typeof MarketReferenceMetric>;

export const MarketReferenceDirection = zod.object({
  "name": zod.string(),
  "code": zod.string(),
  "sourceName": zod.string(),
  "mappingNote": zod.string()
}).describe('MarketReferenceDirection：市场观测台数据。');

export type MarketReferenceDirection = zod.input<typeof MarketReferenceDirection>;

export const MarketReferenceEtfGroup = zod.object({
  "name": zod.string(),
  "pattern": zod.string()
}).describe('MarketReferenceEtfGroup：市场观测台数据。');

export type MarketReferenceEtfGroup = zod.input<typeof MarketReferenceEtfGroup>;

export const MarketReferenceTheme = zod.object({
  "name": zod.string(),
  "industries": zod.array(zod.string())
}).describe('MarketReferenceTheme：市场观测台数据。');

export type MarketReferenceTheme = zod.input<typeof MarketReferenceTheme>;

export const MarketReferenceIndex = zod.object({
  "name": zod.string(),
  "code": zod.string(),
  "technical": zod.boolean().optional()
}).describe('MarketReferenceIndex：市场观测台数据。');

export type MarketReferenceIndex = zod.input<typeof MarketReferenceIndex>;

export const MarketReferenceSource = zod.object({
  "source": zod.string(),
  "api": zod.string(),
  "usage": zod.string(),
  "optional": zod.boolean()
}).describe('MarketReferenceSource：市场观测台数据。');

export type MarketReferenceSource = zod.input<typeof MarketReferenceSource>;

export const MarketReference = zod.object({
  "metrics": zod.array(MarketReferenceMetric),
  "directions": zod.array(MarketReferenceDirection),
  "etfGroups": zod.array(MarketReferenceEtfGroup),
  "themes": zod.array(MarketReferenceTheme),
  "indices": zod.array(MarketReferenceIndex),
  "sources": zod.array(MarketReferenceSource),
  "limitations": zod.array(zod.string()),
  "disclaimer": zod.string()
}).describe('MarketReference：市场观测台数据。');

export type MarketReference = zod.input<typeof MarketReference>;

export const UsNewsTopic = zod.enum(['macro_fed', 'earnings', 'ai_semis', 'big_tech', 'crypto', 'policy_geo', 'other']);

export type UsNewsTopic = zod.input<typeof UsNewsTopic>;

export const NewsRankedItem = NewsCuratedItem.and(zod.object({
  "topic": UsNewsTopic
}));

export type NewsRankedItem = zod.input<typeof NewsRankedItem>;

export const NewsTickerArticle = NewsPromptItem.and(zod.object({
  "source": zod.string(),
  "publishedAt": zod.iso.datetime({"offset":true})
}));

export type NewsTickerArticle = zod.input<typeof NewsTickerArticle>;

export const NewsTickerEarnings = EarningsCard.and(zod.object({
  "id": zod.string()
})).describe('财报来源具有稳定条目 id，供 source_ids_exist 校验。');

export type NewsTickerEarnings = zod.input<typeof NewsTickerEarnings>;

export const NewsTickerFiling = zod.object({
  "id": zod.string(),
  "form": zod.string(),
  "items": zod.array(zod.string()),
  "digest": zod.union([zod.string(),zod.null()])
});

export type NewsTickerFiling = zod.input<typeof NewsTickerFiling>;

export const NewsTimelineItem = zod.union([ArticleTimelineItem,FilingTimelineItem,EarningsTimelineItem]);

export type NewsTimelineItem = zod.input<typeof NewsTimelineItem>;

export const PaperKind = zod.enum(['empirical', 'theory', 'survey', 'system']);

export type PaperKind = zod.input<typeof PaperKind>;

export const PaperMeta = zod.object({
  "title": zod.string(),
  "titleZh": zod.string().optional(),
  "authors": zod.array(zod.string()).optional(),
  "year": zod.int().optional(),
  "venue": zod.string().optional(),
  "version": zod.string().optional(),
  "paperType": zod.string().optional(),
  "paperKind": PaperKind.optional(),
  "studyDesign": zod.string().optional(),
  "doi": zod.union([zod.string(),zod.null()]).optional(),
  "arxivId": zod.union([zod.string(),zod.null()]).optional(),
  "anthologyId": zod.union([zod.string(),zod.null()]).optional(),
  "sourceUrl": zod.string().optional(),
  "pdfUrl": zod.string().optional()
}).describe('书目信息：老档案只有英文标题是必填，未提供的字段可以缺省。');

export type PaperMeta = zod.input<typeof PaperMeta>;

export const PaperVisibility = zod.enum(['public', 'private']);

export type PaperVisibility = zod.input<typeof PaperVisibility>;

export const PaperReviewStatus = zod.enum(['draft', 'passed', 'revise']);

export type PaperReviewStatus = zod.input<typeof PaperReviewStatus>;

export const PaperReadingDepth = zod.enum(['R0', 'R1', 'R2', 'R3']);

export type PaperReadingDepth = zod.input<typeof PaperReadingDepth>;

export const PaperStatus = zod.object({
  "visibility": PaperVisibility,
  "review": PaperReviewStatus,
  "readingDepth": PaperReadingDepth,
  "nextAction": zod.string(),
  "updatedAt": zod.iso.date().describe('内容更新日期；迁移按 docs/06 的依次回退规则取日期部分。')
});

export type PaperStatus = zod.input<typeof PaperStatus>;

export const PaperPrerequisite = zod.object({
  "term": zod.string(),
  "explanation": zod.string(),
  "example": zod.string().optional()
});

export type PaperPrerequisite = zod.input<typeof PaperPrerequisite>;

export const PaperExistingMethod = zod.object({
  "name": zod.string(),
  "whatItDoes": zod.string().optional(),
  "whyNotEnough": zod.string().optional()
});

export type PaperExistingMethod = zod.input<typeof PaperExistingMethod>;

export const PaperProblem = zod.object({
  "setup": zod.string().optional(),
  "existingMethods": zod.array(PaperExistingMethod).optional(),
  "gap": zod.string().optional()
});

export type PaperProblem = zod.input<typeof PaperProblem>;

export const PaperMethodComponent = zod.object({
  "name": zod.string(),
  "question": zod.string().optional(),
  "how": zod.string().optional(),
  "purpose": zod.string().optional(),
  "caveat": zod.string().optional(),
  "anchor": zod.string().optional()
});

export type PaperMethodComponent = zod.input<typeof PaperMethodComponent>;

export const PaperMethod = zod.object({
  "thesis": zod.string().optional(),
  "pipeline": zod.array(zod.string()).optional(),
  "components": zod.array(PaperMethodComponent).optional()
});

export type PaperMethod = zod.input<typeof PaperMethod>;

export const PaperExperimentTable = zod.object({
  "columns": zod.array(zod.string()),
  "rows": zod.array(zod.array(zod.string()))
});

export type PaperExperimentTable = zod.input<typeof PaperExperimentTable>;

export const PaperExperiment = zod.object({
  "setup": zod.string().optional(),
  "table": PaperExperimentTable.optional(),
  "howToRead": zod.string().optional(),
  "anchor": zod.string().optional()
});

export type PaperExperiment = zod.input<typeof PaperExperiment>;

export const PaperFinding = zod.object({
  "title": zod.string(),
  "evidence": zod.string().optional(),
  "interpretation": zod.string().optional(),
  "caveat": zod.string().optional(),
  "anchor": zod.string().optional()
});

export type PaperFinding = zod.input<typeof PaperFinding>;

export const PaperBottomLine = zod.object({
  "supports": zod.string(),
  "doesNotSupport": zod.string(),
  "memorable": zod.string()
});

export type PaperBottomLine = zod.input<typeof PaperBottomLine>;

export const PaperProjectConnection = zod.object({
  "translation": zod.string().optional(),
  "safeDesign": zod.string().optional()
});

export type PaperProjectConnection = zod.input<typeof PaperProjectConnection>;

export const PaperGuide = zod.object({
  "oneSentence": zod.string().optional(),
  "readingGoal": zod.string().optional(),
  "article": zod.string().optional(),
  "prerequisites": zod.array(PaperPrerequisite).optional(),
  "problem": PaperProblem.optional(),
  "method": PaperMethod.optional(),
  "experiment": PaperExperiment.optional(),
  "findings": zod.array(PaperFinding).optional(),
  "bottomLine": PaperBottomLine.optional(),
  "limitations": zod.array(zod.string()).optional(),
  "openQuestions": zod.array(zod.string()).optional(),
  "projectConnection": zod.union([PaperProjectConnection,zod.null()]).optional()
}).describe('迁移导读允许只保留已有部分；新草稿的要求在 PaperDraftGuide 中收紧。');

export type PaperGuide = zod.input<typeof PaperGuide>;

export const PaperReaderCheck = zod.object({
  "problem": zod.string(),
  "gap": zod.string(),
  "input": zod.string(),
  "mechanism": zod.string(),
  "output": zod.string(),
  "boundary": zod.string(),
  "openQuestion": zod.string()
});

export type PaperReaderCheck = zod.input<typeof PaperReaderCheck>;

export const PaperClaimKind = zod.enum(['method', 'result', 'limitation', 'definition']);

export type PaperClaimKind = zod.input<typeof PaperClaimKind>;

export const PaperClaimOrigin = zod.enum(['paper_supported', 'llm_inferred', 'source_navigation']);

export type PaperClaimOrigin = zod.input<typeof PaperClaimOrigin>;

export const PaperQuantity = zod.object({
  "text": zod.string(),
  "sourceText": zod.string(),
  "meaning": zod.string()
});

export type PaperQuantity = zod.input<typeof PaperQuantity>;

export const PaperClaim = zod.object({
  "id": zod.string(),
  "kind": PaperClaimKind,
  "claim": zod.string(),
  "metric": zod.string().optional(),
  "condition": zod.string().optional(),
  "anchor": zod.string().optional(),
  "pdfPage": zod.union([zod.int(),zod.null()]).optional(),
  "sourceLines": zod.array(zod.int()).optional().describe('起止行号；新草稿由 paper_draft 校验两项及范围。'),
  "sourceExcerpt": zod.union([zod.string(),zod.null()]).optional(),
  "claimOrigin": PaperClaimOrigin.optional(),
  "interpretationBoundary": zod.string().optional(),
  "quantities": zod.array(PaperQuantity).optional()
}).describe('一条原文主张；R1 表格转换时没有页内行号和摘录，不制造这些值。');

export type PaperClaim = zod.input<typeof PaperClaim>;

export const PaperArticleBlock = zod.object({
  "claimOrigin": PaperClaimOrigin,
  "claimIds": zod.array(zod.string())
});

export type PaperArticleBlock = zod.input<typeof PaperArticleBlock>;

export const PaperEvidence = zod.object({
  "readerCheck": zod.union([PaperReaderCheck,zod.null()]).optional(),
  "claims": zod.array(PaperClaim).optional(),
  "articleBlocks": zod.array(PaperArticleBlock).optional(),
  "legacyAnchors": zod.boolean().optional().describe('旧文本抽取的行号不再逐行核验；重写后整个 evidence 换为 false。')
});

export type PaperEvidence = zod.input<typeof PaperEvidence>;

export const PaperSectionStatus = zod.enum(['read', 'skimmed', 'unread']);

export type PaperSectionStatus = zod.input<typeof PaperSectionStatus>;

export const PaperSection = zod.object({
  "pages": zod.string(),
  "role": zod.string().optional(),
  "keyQuestion": zod.string().optional(),
  "status": PaperSectionStatus.optional()
});

export type PaperSection = zod.input<typeof PaperSection>;




export const PaperFigure = zod.object({
  "page": zod.int().min(1),
  "title": zod.string(),
  "explanation": zod.string().optional(),
  "takeaway": zod.string().optional()
});

export type PaperFigure = zod.input<typeof PaperFigure>;

export const PaperConcept = zod.object({
  "id": zod.string(),
  "name": zod.string(),
  "explanation": zod.string().optional(),
  "whyItMatters": zod.string().optional(),
  "dependsOn": zod.array(zod.string()).optional(),
  "anchor": zod.string().optional(),
  "claimOrigin": PaperClaimOrigin.optional()
});

export type PaperConcept = zod.input<typeof PaperConcept>;

export const PaperCoverageStatus = zod.enum(['complete', 'partial', 'missing', 'not_applicable']);

export type PaperCoverageStatus = zod.input<typeof PaperCoverageStatus>;

export const PaperCoverage = zod.object({
  "dimension": zod.string(),
  "status": PaperCoverageStatus,
  "evidence": zod.string().optional()
});

export type PaperCoverage = zod.input<typeof PaperCoverage>;

export const PaperAppraisalDimension = zod.object({
  "name": zod.string(),
  "judgment": zod.string().optional(),
  "status": zod.string().optional(),
  "note": zod.string().optional()
});

export type PaperAppraisalDimension = zod.input<typeof PaperAppraisalDimension>;

export const PaperAppraisal = zod.object({
  "minimumClaim": zod.string().optional(),
  "overclaimToAvoid": zod.string().optional(),
  "dimensions": zod.array(PaperAppraisalDimension).optional()
});

export type PaperAppraisal = zod.input<typeof PaperAppraisal>;




export const PaperStructure = zod.object({
  "pageCount": zod.int().min(1).optional(),
  "sections": zod.array(PaperSection).optional(),
  "figures": zod.array(PaperFigure).optional(),
  "concepts": zod.array(PaperConcept).optional(),
  "coverage": zod.array(PaperCoverage).optional(),
  "appraisal": PaperAppraisal.optional(),
  "negativeResults": zod.array(zod.string()).optional()
});

export type PaperStructure = zod.input<typeof PaperStructure>;

export const PaperOrientation = zod.object({
  "whatItIs": zod.string().optional(),
  "analogy": zod.string().optional(),
  "whyItMatters": zod.string().optional(),
  "notTheSameAs": zod.array(zod.string()).optional(),
  "thirtySecondStory": zod.array(zod.string()).optional()
});

export type PaperOrientation = zod.input<typeof PaperOrientation>;

export const PaperMechanismStep = zod.object({
  "step": zod.string(),
  "detail": zod.string(),
  "input": zod.string().optional(),
  "output": zod.string().optional(),
  "anchor": zod.string().optional()
});

export type PaperMechanismStep = zod.input<typeof PaperMechanismStep>;

export const PaperDesignIdea = zod.object({
  "title": zod.string(),
  "explanation": zod.string(),
  "anchor": zod.string().optional()
});

export type PaperDesignIdea = zod.input<typeof PaperDesignIdea>;

export const PaperQuestionAnswer = zod.object({
  "question": zod.string(),
  "answer": zod.string()
});

export type PaperQuestionAnswer = zod.input<typeof PaperQuestionAnswer>;

export const PaperLearning = zod.object({
  "orientation": PaperOrientation.optional(),
  "mechanismSteps": zod.array(PaperMechanismStep).optional(),
  "designPhilosophy": zod.array(zod.union([zod.string(),PaperDesignIdea])).optional(),
  "activeRecall": zod.array(PaperQuestionAnswer).optional(),
  "expertQa": zod.array(PaperQuestionAnswer).optional()
});

export type PaperLearning = zod.input<typeof PaperLearning>;

export const PaperCodeStatus = zod.enum(['verified', 'unverified', 'not_found']);

export type PaperCodeStatus = zod.input<typeof PaperCodeStatus>;

export const PaperCode = zod.object({
  "status": PaperCodeStatus,
  "url": zod.union([zod.string(),zod.null()]).optional(),
  "note": zod.string().optional(),
  "checkedAt": zod.union([zod.iso.date(),zod.null()]).optional()
});

export type PaperCode = zod.input<typeof PaperCode>;

export const PaperSecondary = zod.object({
  "title": zod.string(),
  "note": zod.string().optional()
});

export type PaperSecondary = zod.input<typeof PaperSecondary>;

export const PaperResources = zod.object({
  "landingPage": zod.string().optional(),
  "code": PaperCode.optional(),
  "secondary": zod.array(PaperSecondary).optional()
});

export type PaperResources = zod.input<typeof PaperResources>;

export const PaperCitation = zod.object({
  "title": zod.string(),
  "why": zod.string()
});

export type PaperCitation = zod.input<typeof PaperCitation>;

export const PaperCitations = zod.object({
  "backward": zod.array(PaperCitation).optional(),
  "forward": zod.array(PaperCitation).optional()
});

export type PaperCitations = zod.input<typeof PaperCitations>;

export const PaperRelation = zod.object({
  "target": zod.string(),
  "type": zod.string(),
  "note": zod.string().optional()
});

export type PaperRelation = zod.input<typeof PaperRelation>;

export const Paper = zod.object({
  "schemaVersion": zod.literal(1).optional(),
  "id": zod.string(),
  "meta": PaperMeta,
  "status": PaperStatus,
  "spaces": zod.array(zod.string()).optional(),
  "guide": PaperGuide.optional(),
  "evidence": PaperEvidence.optional(),
  "structure": PaperStructure.optional(),
  "learning": PaperLearning.optional(),
  "resources": PaperResources.optional(),
  "citations": PaperCitations.optional(),
  "relations": zod.array(PaperRelation).optional(),
  "generatedBy": GeneratedBy.optional().describe('新 AI 草稿落库时带运行时出处；旧论文没有可靠出处时不补造。')
}).describe('单篇公开内容。私人笔记、解释卡、老阅读卡只存在 PaperPrivate。');

export type Paper = zod.input<typeof Paper>;

export const PaperArxivUploadRequest = zod.object({
  "arxivUrl": zod.string()
});

export type PaperArxivUploadRequest = zod.input<typeof PaperArxivUploadRequest>;

export const PaperAskRequest = zod.object({
  "question": zod.string()
});

export type PaperAskRequest = zod.input<typeof PaperAskRequest>;

export const PaperDraftMeta = PaperMeta.and(zod.object({
  "titleZh": zod.string(),
  "authors": zod.array(zod.string()),
  "year": zod.int(),
  "venue": zod.string(),
  "version": zod.string(),
  "paperType": zod.string(),
  "paperKind": PaperKind,
  "studyDesign": zod.string(),
  "sourceUrl": zod.string(),
  "doi": zod.union([zod.string(),zod.null()]),
  "arxivId": zod.union([zod.string(),zod.null()]),
  "anthologyId": zod.union([zod.string(),zod.null()])
}));

export type PaperDraftMeta = zod.input<typeof PaperDraftMeta>;

export const PaperDraftPrerequisite = PaperPrerequisite.and(zod.object({
  "example": zod.string()
}));

export type PaperDraftPrerequisite = zod.input<typeof PaperDraftPrerequisite>;

export const PaperDraftGuide = PaperGuide.and(zod.object({
  "oneSentence": zod.string(),
  "readingGoal": zod.string(),
  "article": zod.string().describe('1800–3000 汉字是目标，不是硬上限；非典型论文允许更短。'),
  "prerequisites": zod.array(PaperDraftPrerequisite),
  "bottomLine": PaperBottomLine,
  "limitations": zod.array(zod.string())
}));

export type PaperDraftGuide = zod.input<typeof PaperDraftGuide>;




export const PaperDraftClaim = PaperClaim.and(zod.object({
  "metric": zod.string(),
  "anchor": zod.string(),
  "condition": zod.string(),
  "pdfPage": zod.int().min(1),
  "sourceLines": zod.array(zod.int()),
  "claimOrigin": PaperClaimOrigin,
  "interpretationBoundary": zod.string(),
  "quantities": zod.array(PaperQuantity)
}));

export type PaperDraftClaim = zod.input<typeof PaperDraftClaim>;

export const PaperDraftEvidence = PaperEvidence.and(zod.object({
  "readerCheck": PaperReaderCheck,
  "claims": zod.array(PaperDraftClaim),
  "articleBlocks": zod.array(PaperArticleBlock)
}));

export type PaperDraftEvidence = zod.input<typeof PaperDraftEvidence>;

export const PaperDraftSection = PaperSection.and(zod.object({
  "role": zod.string(),
  "keyQuestion": zod.string(),
  "status": PaperSectionStatus
}));

export type PaperDraftSection = zod.input<typeof PaperDraftSection>;

export const PaperDraftFigure = PaperFigure.and(zod.object({
  "explanation": zod.string()
}));

export type PaperDraftFigure = zod.input<typeof PaperDraftFigure>;

export const PaperDraftConcept = PaperConcept.and(zod.object({
  "explanation": zod.string(),
  "anchor": zod.string(),
  "claimOrigin": PaperClaimOrigin
}));

export type PaperDraftConcept = zod.input<typeof PaperDraftConcept>;




export const PaperDraftStructure = PaperStructure.and(zod.object({
  "pageCount": zod.int().min(1),
  "sections": zod.array(PaperDraftSection),
  "figures": zod.array(PaperDraftFigure),
  "concepts": zod.array(PaperDraftConcept)
}));

export type PaperDraftStructure = zod.input<typeof PaperDraftStructure>;

export const PaperDraftCode = PaperCode.and(zod.object({
  "url": zod.union([zod.string(),zod.null()]),
  "note": zod.string(),
  "checkedAt": zod.union([zod.iso.date(),zod.null()])
}));

export type PaperDraftCode = zod.input<typeof PaperDraftCode>;

export const PaperDraftResources = PaperResources.and(zod.object({
  "landingPage": zod.string(),
  "code": PaperDraftCode
}));

export type PaperDraftResources = zod.input<typeof PaperDraftResources>;

export const PaperDraft = zod.object({
  "meta": PaperDraftMeta,
  "guide": PaperDraftGuide,
  "evidence": PaperDraftEvidence,
  "structure": PaperDraftStructure,
  "resources": PaperDraftResources,
  "generatedBy": GeneratedBy.optional()
});

export type PaperDraft = zod.input<typeof PaperDraft>;

export const PaperAuthorInput = zod.object({
  "paperId": zod.string(),
  "knownMeta": zod.union([PaperMeta,zod.null()]),
  "pages": zod.string(),
  "previousDraft": zod.union([PaperDraft,zod.null()]),
  "problems": zod.array(zod.string()),
  "instructions": zod.union([zod.string(),zod.null()])
});

export type PaperAuthorInput = zod.input<typeof PaperAuthorInput>;

export const PaperMastery = zod.enum(['pending', 'confirmed']);

export type PaperMastery = zod.input<typeof PaperMastery>;

export const PaperExplanation = zod.object({
  "id": zod.string(),
  "question": zod.string(),
  "answer": zod.string(),
  "pages": zod.array(zod.int()),
  "status": PaperMastery,
  "createdAt": zod.iso.datetime({"offset":true}),
  "generatedBy": GeneratedBy.optional().describe('保存 AI 回答时保留该次问答的运行时出处。')
});

export type PaperExplanation = zod.input<typeof PaperExplanation>;

export const PaperExplanationCreate = zod.object({
  "question": zod.string(),
  "answer": zod.string(),
  "pages": zod.array(zod.int()),
  "generatedBy": GeneratedBy.optional()
}).describe('新AI解释卡沿用原QA出处；旧数据缺省，不由API编造模型信息。');

export type PaperExplanationCreate = zod.input<typeof PaperExplanationCreate>;

export const PaperExplanationPatch = zod.object({
  "status": PaperMastery
});

export type PaperExplanationPatch = zod.input<typeof PaperExplanationPatch>;




export const PaperIndependentSourceCheck = zod.object({
  "pdfPage": zod.int().min(1),
  "sourceExcerpt": zod.string(),
  "minimumClaim": zod.string(),
  "counterexampleOrLimit": zod.string(),
  "comparisonToArticle": zod.string()
});

export type PaperIndependentSourceCheck = zod.input<typeof PaperIndependentSourceCheck>;

export const PaperLegacyCard = zod.object({
  "title": zod.string(),
  "markdown": zod.string()
});

export type PaperLegacyCard = zod.input<typeof PaperLegacyCard>;

export const PaperSummary = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "titleZh": zod.union([zod.string(),zod.null()]),
  "year": zod.union([zod.int(),zod.null()]),
  "venue": zod.union([zod.string(),zod.null()]),
  "oneSentence": zod.union([zod.string(),zod.null()]),
  "spaces": zod.array(zod.string()),
  "readingDepth": PaperReadingDepth,
  "paperKind": zod.union([PaperKind,zod.null()]),
  "paperType": zod.union([zod.string(),zod.null()]),
  "visibility": PaperVisibility,
  "review": PaperReviewStatus,
  "updatedAt": zod.iso.date(),
  "hasCode": zod.boolean(),
  "conceptCount": zod.int()
}).describe('列表摘要由计算任务与 Paper 一起写入；原文缺省的展示字段用 null。');

export type PaperSummary = zod.input<typeof PaperSummary>;

export const PaperPage = zod.object({
  "items": zod.array(PaperSummary).describe('本页条目'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null')
}).describe('游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。\n用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。');

export type PaperPage = zod.input<typeof PaperPage>;

export const PaperPatch = zod.object({
  "visibility": PaperVisibility.optional(),
  "spaces": zod.array(zod.string()).optional(),
  "readingDepth": PaperReadingDepth.optional(),
  "nextAction": zod.string().optional()
});

export type PaperPatch = zod.input<typeof PaperPatch>;

export const PaperPrivate = zod.object({
  "schemaVersion": zod.literal(1),
  "mastery": PaperMastery,
  "notes": zod.string(),
  "explanations": zod.array(PaperExplanation),
  "legacyCards": zod.array(PaperLegacyCard)
});

export type PaperPrivate = zod.input<typeof PaperPrivate>;

export const PaperPrivateWrite = zod.object({
  "mastery": PaperMastery,
  "notes": zod.string()
});

export type PaperPrivateWrite = zod.input<typeof PaperPrivateWrite>;

export const PaperQaInput = zod.object({
  "question": zod.string(),
  "guide": PaperGuide,
  "claims": zod.array(PaperClaim),
  "pages": zod.string()
});

export type PaperQaInput = zod.input<typeof PaperQaInput>;

export const PaperQaOutput = zod.object({
  "answer": zod.string(),
  "pages": zod.array(zod.int()),
  "generatedBy": GeneratedBy.optional()
});

export type PaperQaOutput = zod.input<typeof PaperQaOutput>;

export const PaperReviewCheck = zod.object({
  "status": zod.enum(['pass', 'fail', 'not_applicable']),
  "evidence": zod.string()
});

export type PaperReviewCheck = zod.input<typeof PaperReviewCheck>;

export const PaperReviewChecks = zod.object({
  "identity": PaperReviewCheck,
  "explanation": PaperReviewCheck,
  "method": PaperReviewCheck,
  "results": PaperReviewCheck,
  "boundaries": PaperReviewCheck,
  "sources": PaperReviewCheck
});

export type PaperReviewChecks = zod.input<typeof PaperReviewChecks>;

export const PaperReviewDecision = zod.enum(['pass', 'revise', 'escalate']);

export type PaperReviewDecision = zod.input<typeof PaperReviewDecision>;

export const PaperReviewFinding = zod.object({
  "severity": zod.enum(['P0', 'P1', 'P2']),
  "location": zod.string(),
  "fix": zod.string()
});

export type PaperReviewFinding = zod.input<typeof PaperReviewFinding>;

export const PaperReviewContent = zod.object({
  "decision": PaperReviewDecision,
  "readerRestatement": zod.string(),
  "independentSourceCheck": PaperIndependentSourceCheck,
  "sampledClaimIds": zod.array(zod.string()),
  "checks": PaperReviewChecks,
  "findings": zod.array(PaperReviewFinding),
  "pagesChecked": zod.array(zod.int()),
  "visualPagesChecked": zod.array(zod.int())
});

export type PaperReviewContent = zod.input<typeof PaperReviewContent>;

export const PaperReviewInput = zod.object({
  "paperId": zod.string(),
  "paper": zod.union([Paper,PaperDraft]),
  "pages": zod.string(),
  "pageImages": zod.array(zod.int())
});

export type PaperReviewInput = zod.input<typeof PaperReviewInput>;

export const PaperReviewOutput = zod.object({
  "decision": PaperReviewDecision,
  "readerRestatement": zod.string(),
  "independentSourceCheck": PaperIndependentSourceCheck,
  "sampledClaimIds": zod.array(zod.string()),
  "checks": PaperReviewChecks,
  "findings": zod.array(PaperReviewFinding),
  "pagesChecked": zod.array(zod.int()),
  "visualPagesChecked": zod.array(zod.int()),
  "generatedBy": GeneratedBy.optional()
});

export type PaperReviewOutput = zod.input<typeof PaperReviewOutput>;

export const PaperReviseRequest = zod.object({
  "instructions": zod.string()
});

export type PaperReviseRequest = zod.input<typeof PaperReviseRequest>;

export const PaperSearchItem = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "titleZh": zod.union([zod.string(),zod.null()]),
  "authors": zod.array(zod.string()),
  "oneSentence": zod.union([zod.string(),zod.null()]),
  "concepts": zod.array(zod.string()),
  "spaces": zod.array(zod.string()).describe('研究空间的展示名称，供本地全文搜索。')
});

export type PaperSearchItem = zod.input<typeof PaperSearchItem>;

export const PaperSpace = zod.object({
  "id": zod.string(),
  "label": zod.string(),
  "shortLabel": zod.string(),
  "color": zod.string(),
  "description": zod.string(),
  "aliases": zod.array(zod.string()),
  "paperCount": zod.int()
});

export type PaperSpace = zod.input<typeof PaperSpace>;

export const PaperUploadStatus = zod.enum(['queued', 'extracting', 'authoring', 'checking', 'reviewing', 'ready', 'failed']);

export type PaperUploadStatus = zod.input<typeof PaperUploadStatus>;

export const PaperUploadPatch = zod.object({
  "status": PaperUploadStatus.optional(),
  "error": zod.union([zod.string(),zod.null()]).optional(),
  "paperId": zod.string().optional()
});

export type PaperUploadPatch = zod.input<typeof PaperUploadPatch>;

export const PaperWrite = zod.object({
  "paper": Paper,
  "summary": PaperSummary
});

export type PaperWrite = zod.input<typeof PaperWrite>;

export const PapersCatalogStats = zod.object({
  "paperCount": zod.int(),
  "spaceCount": zod.int(),
  "conceptCount": zod.int(),
  "edgeCount": zod.int()
});

export type PapersCatalogStats = zod.input<typeof PapersCatalogStats>;

export const PapersCatalog = zod.object({
  "stats": PapersCatalogStats,
  "spaces": zod.array(PaperSpace),
  "papers": zod.array(PaperSummary)
});

export type PapersCatalog = zod.input<typeof PapersCatalog>;

export const Problem = zod.object({
  "type": zod.string().describe('错误类型的 URI；没有专门类型时为 about:blank'),
  "title": zod.string().describe('简短的错误标题，如“未实现”'),
  "status": zod.int().describe('HTTP 状态码'),
  "detail": zod.string().describe('具体说明，如“未实现（任务 T14）”')
}).describe('错误响应的正文（application/problem+json，RFC 9457）。\n各接口统一用 HubHttp.ErrorResponse 声明错误（OpenAPI 里是 default 响应）。');

export type Problem = zod.input<typeof Problem>;

export const Review = zod.object({
  "decision": PaperReviewDecision,
  "readerRestatement": zod.string(),
  "independentSourceCheck": PaperIndependentSourceCheck,
  "sampledClaimIds": zod.array(zod.string()),
  "checks": PaperReviewChecks,
  "findings": zod.array(PaperReviewFinding),
  "pagesChecked": zod.array(zod.int()),
  "visualPagesChecked": zod.array(zod.int()),
  "id": zod.string(),
  "createdAt": zod.iso.datetime({"offset":true}),
  "durationMs": zod.int(),
  "generatedBy": GeneratedBy
});

export type Review = zod.input<typeof Review>;

export const RunStatus = zod.enum(['running', 'succeeded', 'failed']).describe('运行状态：开始时写 running，结束时写 succeeded 或 failed');

export type RunStatus = zod.input<typeof RunStatus>;

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

export const RunPage = zod.object({
  "items": zod.array(Run).describe('本页条目'),
  "nextCursor": zod.union([zod.string(),zod.null()]).describe('下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null')
}).describe('GET /v1/runs 的一页');

export type RunPage = zod.input<typeof RunPage>;

export const SearchIndex = zod.object({
  "papers": zod.array(PaperSearchItem)
});

export type SearchIndex = zod.input<typeof SearchIndex>;

export const TickerDigestInput = zod.object({
  "mode": zod.enum(['daily', 'weekly']),
  "symbol": zod.string(),
  "name": zod.string(),
  "changeText": zod.union([zod.string(),zod.null()]),
  "withSector": zod.union([zod.boolean(),zod.null()]),
  "sectorEtf": zod.union([zod.string(),zod.null()]),
  "articles": zod.array(NewsTickerArticle),
  "filings": zod.array(NewsTickerFiling),
  "earnings": zod.union([zod.array(NewsTickerEarnings),zod.null()])
});

export type TickerDigestInput = zod.input<typeof TickerDigestInput>;

export const TickerDigestOutput = zod.object({
  "whatHappened": zod.string(),
  "whyItMatters": zod.union([zod.string(),zod.null()]),
  "sourceIds": zod.array(zod.string()).describe('0–3 个来源，由能力运行时按提示词检查。'),
  "points": zod.array(TickerDigestPoint),
  "generatedBy": GeneratedBy.optional()
});

export type TickerDigestOutput = zod.input<typeof TickerDigestOutput>;

export const Upload = zod.object({
  "id": zod.string(),
  "filename": zod.union([zod.string(),zod.null()]),
  "arxivUrl": zod.union([zod.string(),zod.null()]),
  "status": PaperUploadStatus,
  "error": zod.union([zod.string(),zod.null()]),
  "createdAt": zod.iso.datetime({"offset":true}),
  "updatedAt": zod.iso.datetime({"offset":true}),
  "paperId": zod.string().optional().describe('定下后立即写入；重试沿用，避免误加版本后缀。')
});

export type Upload = zod.input<typeof Upload>;

export const UsRankInput = zod.object({
  "candidates": zod.array(NewsCandidate),
  "minItems": zod.int(),
  "maxItems": zod.int()
});

export type UsRankInput = zod.input<typeof UsRankInput>;

export const UsRankOutput = zod.object({
  "items": zod.array(NewsRankedItem),
  "generatedBy": GeneratedBy.optional()
});

export type UsRankOutput = zod.input<typeof UsRankOutput>;

export const WatchItemKind = zod.enum(['stock', 'etf', 'leveraged_etf', 'crypto']).describe('自选股类型（docs/02 第 3 节）：stock 有自己的新闻和 SEC 公告；etf 按代码取新闻再加别名匹配；\nleveraged_etf 并入标的；crypto 用加密新闻和日线（日涨跌幅按 UTC 日计算）');

export type WatchItemKind = zod.input<typeof WatchItemKind>;

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

export const weeklyDataHealthSessionsMin = 5;
export const weeklyDataHealthSessionsMax = 5;

export const weeklyDataHealthDirectionCoverageDaysMin = 0;
export const weeklyDataHealthDirectionCoverageDaysMax = 5;



export const WeeklyDataHealth = zod.object({
  "sessions": zod.array(zod.iso.date()).min(weeklyDataHealthSessionsMin).max(weeklyDataHealthSessionsMax),
  "missing": zod.array(zod.string()),
  "directionCoverageDays": zod.int().min(weeklyDataHealthDirectionCoverageDaysMin).max(weeklyDataHealthDirectionCoverageDaysMax).describe('有方向数据的交易日数量，页面显示覆盖 n/5。'),
  "boundary": zod.string()
}).describe('WeeklyDataHealth：市场观测台数据。');

export type WeeklyDataHealth = zod.input<typeof WeeklyDataHealth>;

export const WeeklyJudgment = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "result": HypothesisResult,
  "resultNote": zod.string()
}).describe('WeeklyJudgment：市场观测台数据。');

export type WeeklyJudgment = zod.input<typeof WeeklyJudgment>;

export const WeeklyOscillatingDirection = zod.object({
  "name": zod.string(),
  "signChanges": zod.int(),
  "latestRelative": zod.union([zod.number(),zod.null()]).describe('最后交易日缺该方向数据时为空，不回填更早日期。')
}).describe('WeeklyOscillatingDirection：市场观测台数据。');

export type WeeklyOscillatingDirection = zod.input<typeof WeeklyOscillatingDirection>;

export const weeklyLifecycleDirectionCoverageDaysMin = 0;
export const weeklyLifecycleDirectionCoverageDaysMax = 5;



export const WeeklyLifecycle = zod.object({
  "persistentDirections": zod.array(MarketAppearance),
  "oscillatingDirections": zod.array(WeeklyOscillatingDirection),
  "latestWeakDirections": zod.union([zod.array(zod.string()),zod.null()]),
  "directionCoverageDays": zod.int().min(weeklyLifecycleDirectionCoverageDaysMin).max(weeklyLifecycleDirectionCoverageDaysMax).describe('有方向数据的交易日数量，页面显示覆盖 n/5。'),
  "windowDays": zod.literal(5)
}).describe('WeeklyLifecycle：市场观测台数据。');

export type WeeklyLifecycle = zod.input<typeof WeeklyLifecycle>;

export const WeeklyQuestion = zod.object({
  "question": zod.string(),
  "confirm": zod.string(),
  "invalidate": zod.string()
}).describe('WeeklyQuestion：市场观测台数据。');

export type WeeklyQuestion = zod.input<typeof WeeklyQuestion>;

export const WeeklySummary = zod.object({
  "date": zod.iso.date(),
  "title": zod.string(),
  "sentence": zod.string(),
  "settledCount": zod.int(),
  "researchErrorCount": zod.int(),
  "inconclusiveCount": zod.int()
}).describe('WeeklySummary：市场观测台数据。');

export type WeeklySummary = zod.input<typeof WeeklySummary>;

export const WeeklyVerification = zod.object({
  "settledCount": zod.int(),
  "confirmedCount": zod.int(),
  "notConfirmedCount": zod.int(),
  "inconclusiveCount": zod.int(),
  "unsettledDueCount": zod.int(),
  "items": zod.array(WeeklyJudgment)
}).describe('WeeklyVerification：市场观测台数据。');

export type WeeklyVerification = zod.input<typeof WeeklyVerification>;

export const WeeklyStructuralChange = zod.object({
  "name": zod.string(),
  "change": zod.number(),
  "judgment": zod.string(),
  "counter": zod.string()
}).describe('WeeklyStructuralChange：市场观测台数据。');

export type WeeklyStructuralChange = zod.input<typeof WeeklyStructuralChange>;

export const WeeklyResearchError = zod.object({
  "id": zod.string(),
  "title": zod.string(),
  "result": zod.enum(['NOT_CONFIRMED']),
  "reason": zod.string()
}).describe('WeeklyResearchError：市场观测台数据。');

export type WeeklyResearchError = zod.input<typeof WeeklyResearchError>;

export const WeeklyResearchErrors = zod.object({
  "items": zod.array(WeeklyResearchError),
  "unsettledDue": zod.array(WeeklyJudgment)
}).describe('WeeklyResearchErrors：市场观测台数据。');

export type WeeklyResearchErrors = zod.input<typeof WeeklyResearchErrors>;

export const weeklyReportTwoSessionsMin = 5;
export const weeklyReportTwoSessionsMax = 5;



export const WeeklyReport = WeeklySummary.and(zod.object({
  "sessions": zod.array(zod.iso.date()).min(weeklyReportTwoSessionsMin).max(weeklyReportTwoSessionsMax),
  "previousJudgmentVerification": WeeklyVerification,
  "threeStructuralChanges": zod.array(WeeklyStructuralChange),
  "lifecycle": WeeklyLifecycle,
  "researchErrors": WeeklyResearchErrors,
  "nextWeekQuestions": zod.array(zod.union([WeeklyQuestion,zod.null()])),
  "dataAndMethodHealth": WeeklyDataHealth,
  "markdown": zod.string()
})).describe('WeeklyReport：市场观测台数据。');

export type WeeklyReport = zod.input<typeof WeeklyReport>;
/**
 * AI 用量汇总（ai_calls 表的聚合）
 */
export const privatePlatformGetAiUsageQueryDaysDefault = 30;



export const PrivatePlatformGetAiUsageQueryParams = zod.object({
  "days": zod.coerce.number().int().min(1).default(privatePlatformGetAiUsageQueryDaysDefault).describe('统计最近多少天（含今天），默认 30，按 Asia/Singapore（UTC+8）计')
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

export const internalPlatformExportTableQueryLimitDefault = 20;
export const internalPlatformExportTableQueryLimitMax = 100;



export const InternalPlatformExportTableQueryParams = zod.object({
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(internalPlatformExportTableQueryLimitMax).default(internalPlatformExportTableQueryLimitDefault).describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20')
})

export const InternalPlatformExportTableResponse = ExportPage


/**
 * putDay：市场数据接口。
 */
export const InternalMarketsPutDayParams = zod.object({
  "date": zod.iso.date()
})

export const InternalMarketsPutDayBody = MarketDayWrite

export const InternalMarketsPutDayResponse = zod.void()


/**
 * putEvents：市场数据接口。
 */
export const InternalMarketsPutEventsBodyItem = MarketEvent
export const InternalMarketsPutEventsBody = zod.array(InternalMarketsPutEventsBodyItem)

export const InternalMarketsPutEventsResponse = zod.void()


/**
 * putHypotheses：市场数据接口。
 */
export const InternalMarketsPutHypothesesBodyItem = Hypothesis
export const InternalMarketsPutHypothesesBody = zod.array(InternalMarketsPutHypothesesBodyItem)

export const InternalMarketsPutHypothesesResponse = zod.void()


/**
 * putIndexBars：市场数据接口。
 */
export const InternalMarketsPutIndexBarsParams = zod.object({
  "code": zod.string()
})

export const InternalMarketsPutIndexBarsBodyItem = IndexBar
export const InternalMarketsPutIndexBarsBody = zod.array(InternalMarketsPutIndexBarsBodyItem)

export const InternalMarketsPutIndexBarsResponse = zod.void()


/**
 * putWeekly：市场数据接口。
 */
export const InternalMarketsPutWeeklyParams = zod.object({
  "date": zod.iso.date()
})

export const InternalMarketsPutWeeklyBody = WeeklyReport

export const InternalMarketsPutWeeklyResponse = zod.void()


export const InternalNewsPutArticlesBodyItem = Article
export const InternalNewsPutArticlesBody = zod.array(InternalNewsPutArticlesBodyItem)

export const InternalNewsPutArticlesResponse = zod.void()


export const InternalNewsPruneArticlesQueryParams = zod.object({
  "before": zod.iso.date()
})

export const InternalNewsPruneArticlesResponse = zod.void()


export const InternalNewsPutCalendarBodyItem = CalendarEvent
export const InternalNewsPutCalendarBody = zod.array(InternalNewsPutCalendarBodyItem)

export const InternalNewsPutCalendarResponse = zod.void()


export const InternalNewsPutEarningsCardsBodyItem = EarningsCard
export const InternalNewsPutEarningsCardsBody = zod.array(InternalNewsPutEarningsCardsBodyItem)

export const InternalNewsPutEarningsCardsResponse = zod.void()


export const InternalNewsPutEditionParams = zod.object({
  "id": zod.string()
})

export const InternalNewsPutEditionBody = Edition

export const InternalNewsPutEditionResponse = zod.void()


export const InternalNewsPutEditionHtmlParams = zod.object({
  "id": zod.string()
})

export const InternalNewsPutEditionHtmlResponse = zod.void()


export const InternalNewsPutFilingsBodyItem = Filing
export const InternalNewsPutFilingsBody = zod.array(InternalNewsPutFilingsBodyItem)

export const InternalNewsPutFilingsResponse = zod.void()


export const InternalNewsPutInsiderTradesBodyItem = InsiderTrade
export const InternalNewsPutInsiderTradesBody = zod.array(InternalNewsPutInsiderTradesBodyItem)

export const InternalNewsPutInsiderTradesResponse = zod.void()


export const InternalNewsPutSourceHealthParams = zod.object({
  "id": zod.string()
})

export const InternalNewsPutSourceHealthBody = NewsSourceHealth

export const InternalNewsPutSourceHealthResponse = zod.void()


export const InternalPapersGetUploadParams = zod.object({
  "uploadId": zod.string()
})

export const InternalPapersGetUploadResponse = Upload


export const InternalPapersPatchUploadParams = zod.object({
  "uploadId": zod.string()
})

export const InternalPapersPatchUploadBody = PaperUploadPatch

export const InternalPapersPatchUploadResponse = zod.void()


export const InternalPapersGetUploadFileParams = zod.object({
  "uploadId": zod.string()
})

export const InternalPapersGetUploadFileResponse = zod.unknown()


export const InternalPapersPutPaperParams = zod.object({
  "id": zod.string()
})

export const InternalPapersPutPaperBody = PaperWrite

export const InternalPapersPutPaperResponse = zod.void()


export const InternalPapersPutFileParams = zod.object({
  "id": zod.string(),
  "name": zod.enum(['source.pdf', 'pages.jsonl', 'pages.txt'])
})

export const InternalPapersPutFileResponse = zod.void()


export const InternalPapersGetFileParams = zod.object({
  "id": zod.string(),
  "name": zod.enum(['source.pdf', 'pages.jsonl', 'pages.txt'])
})

export const InternalPapersGetFileResponse = zod.string()





export const InternalPapersPutPageParams = zod.object({
  "id": zod.string(),
  "n": zod.coerce.number().int().min(1)
})

export const InternalPapersPutPageResponse = zod.void()


export const InternalPapersPutPrivateParams = zod.object({
  "id": zod.string()
})

export const InternalPapersPutPrivateBody = PaperPrivate

export const InternalPapersPutPrivateResponse = zod.void()


export const InternalPapersCreateReviewParams = zod.object({
  "id": zod.string()
})

export const InternalPapersCreateReviewBody = Review

export const InternalPapersCreateReviewResponse = zod.void()


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
 * createEvent：市场数据接口。
 */
export const PrivateMarketsCreateEventBody = MarketEvent

export const PrivateMarketsCreateEventResponse = MarketEvent


/**
 * putEvent：市场数据接口。
 */
export const PrivateMarketsPutEventParams = zod.object({
  "id": zod.string()
})

export const PrivateMarketsPutEventBody = MarketEvent

export const PrivateMarketsPutEventResponse = MarketEvent


/**
 * deleteEvent：市场数据接口。
 */
export const PrivateMarketsDeleteEventParams = zod.object({
  "id": zod.string()
})

export const PrivateMarketsDeleteEventResponse = zod.void()


export const privateNewsSearchArticlesQueryDaysDefault = 30;



export const PrivateNewsSearchArticlesQueryParams = zod.object({
  "q": zod.string(),
  "ticker": zod.string().optional(),
  "days": zod.coerce.number().int().min(1).default(privateNewsSearchArticlesQueryDaysDefault)
})

export const PrivateNewsSearchArticlesResponseItem = Article
export const PrivateNewsSearchArticlesResponse = zod.array(PrivateNewsSearchArticlesResponseItem)


export const privateNewsListEditionsQueryLimitDefault = 20;
export const privateNewsListEditionsQueryLimitMax = 100;



export const PrivateNewsListEditionsQueryParams = zod.object({
  "kind": zod.enum(['morning', 'premarket', 'weekly', 'legacy']).optional(),
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(privateNewsListEditionsQueryLimitMax).default(privateNewsListEditionsQueryLimitDefault).describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20')
})

export const PrivateNewsListEditionsResponse = EditionPage


export const PrivateNewsGetEditionParams = zod.object({
  "id": zod.string()
})

export const PrivateNewsGetEditionResponse = Edition


export const PrivateNewsRateEditionParams = zod.object({
  "id": zod.string()
})

export const PrivateNewsRateEditionBody = EditionFeedbackRequest

export const PrivateNewsRateEditionResponse = EditionFeedback


export const PrivateNewsGetEditionHtmlParams = zod.object({
  "id": zod.string()
})

export const PrivateNewsGetEditionHtmlResponse = zod.unknown()


export const PrivateNewsListFeedbackQueryParams = zod.object({
  "since": zod.iso.datetime({"offset":true}).optional()
})

export const PrivateNewsListFeedbackResponseItem = Feedback
export const PrivateNewsListFeedbackResponse = zod.array(PrivateNewsListFeedbackResponseItem)


export const PrivateNewsFlagItemBody = ItemFeedbackRequest

export const PrivateNewsFlagItemResponse = ItemFeedback


export const PrivateNewsListSourcesResponseItem = NewsSourceHealth
export const PrivateNewsListSourcesResponse = zod.array(PrivateNewsListSourcesResponseItem)


export const PrivateNewsGetTimelineParams = zod.object({
  "symbol": zod.string()
})

export const privateNewsGetTimelineQueryDaysDefault = 30;



export const PrivateNewsGetTimelineQueryParams = zod.object({
  "days": zod.coerce.number().int().min(1).default(privateNewsGetTimelineQueryDaysDefault)
})

export const PrivateNewsGetTimelineResponseItem = NewsTimelineItem
export const PrivateNewsGetTimelineResponse = zod.array(PrivateNewsGetTimelineResponseItem)


export const privatePapersListPapersQueryLimitDefault = 20;
export const privatePapersListPapersQueryLimitMax = 100;



export const PrivatePapersListPapersQueryParams = zod.object({
  "visibility": zod.enum(['public', 'private']).optional(),
  "review": zod.enum(['draft', 'passed', 'revise']).optional(),
  "space": zod.string().optional(),
  "q": zod.string().optional(),
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(privatePapersListPapersQueryLimitMax).default(privatePapersListPapersQueryLimitDefault).describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20')
})

export const PrivatePapersListPapersResponse = PaperPage


export const PrivatePapersGetCatalogResponse = PapersCatalog


export const PrivatePapersGetGraphResponse = GraphData


export const PrivatePapersListUploadsQueryParams = zod.object({
  "status": zod.enum(['queued', 'extracting', 'authoring', 'checking', 'reviewing', 'ready', 'failed']).optional()
})

export const PrivatePapersListUploadsResponseItem = Upload
export const PrivatePapersListUploadsResponse = zod.array(PrivatePapersListUploadsResponseItem)


export const PrivatePapersUploadArxivBody = PaperArxivUploadRequest

export const PrivatePapersUploadArxivResponse = Upload


export const PrivatePapersUploadPdfParams = zod.object({
  "filename": zod.string()
})

export const PrivatePapersUploadPdfResponse = Upload


export const PrivatePapersRetryUploadParams = zod.object({
  "uploadId": zod.string()
})

export const PrivatePapersRetryUploadResponse = Upload


export const PrivatePapersGetPaperParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersGetPaperResponse = Paper


export const PrivatePapersPatchPaperParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersPatchPaperBody = PaperPatch

export const PrivatePapersPatchPaperResponse = Paper


export const PrivatePapersAskParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersAskBody = PaperAskRequest

export const PrivatePapersAskResponse = zod.unknown()


export const PrivatePapersCreateExplanationParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersCreateExplanationBody = PaperExplanationCreate

export const PrivatePapersCreateExplanationResponse = PaperExplanation


export const PrivatePapersPatchExplanationParams = zod.object({
  "id": zod.string(),
  "eid": zod.string()
})

export const PrivatePapersPatchExplanationBody = PaperExplanationPatch

export const PrivatePapersPatchExplanationResponse = PaperExplanation





export const PrivatePapersGetPageParams = zod.object({
  "id": zod.string(),
  "n": zod.coerce.number().int().min(1)
})

export const PrivatePapersGetPageResponse = zod.unknown()


export const PrivatePapersGetPrivateParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersGetPrivateResponse = PaperPrivate


export const PrivatePapersPutPrivateParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersPutPrivateBody = PaperPrivateWrite

export const PrivatePapersPutPrivateResponse = PaperPrivate


export const PrivatePapersListReviewsParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersListReviewsResponseItem = Review
export const PrivatePapersListReviewsResponse = zod.array(PrivatePapersListReviewsResponseItem)


export const PrivatePapersReviseParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersReviseBody = PaperReviseRequest

export const PrivatePapersReviseResponse = zod.void()


export const PrivatePapersGetPdfParams = zod.object({
  "id": zod.string()
})

export const PrivatePapersGetPdfResponse = zod.unknown()


/**
 * listDays：市场数据接口。
 */
export const publicMarketsListDaysQueryLimitDefault = 20;
export const publicMarketsListDaysQueryLimitMax = 100;



export const PublicMarketsListDaysQueryParams = zod.object({
  "before": zod.iso.date().optional(),
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(publicMarketsListDaysQueryLimitMax).default(publicMarketsListDaysQueryLimitDefault).describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20')
})

export const PublicMarketsListDaysResponse = MarketDaySummaryPage


/**
 * getLatestDay：市场数据接口。
 */
export const PublicMarketsGetLatestDayResponse = MarketDay


/**
 * getDay：市场数据接口。
 */
export const PublicMarketsGetDayParams = zod.object({
  "date": zod.iso.date()
})

export const PublicMarketsGetDayResponse = MarketDay


/**
 * listEvents：市场数据接口。
 */
export const PublicMarketsListEventsQueryParams = zod.object({
  "from": zod.iso.date().optional(),
  "to": zod.iso.date().optional()
})

export const PublicMarketsListEventsResponseItem = MarketEvent
export const PublicMarketsListEventsResponse = zod.array(PublicMarketsListEventsResponseItem)


/**
 * listHypotheses：市场数据接口。
 */
export const publicMarketsListHypothesesQueryDateFieldDefault = `created`;
export const publicMarketsListHypothesesQueryLimitDefault = 20;
export const publicMarketsListHypothesesQueryLimitMax = 100;



export const PublicMarketsListHypothesesQueryParams = zod.object({
  "result": zod.enum(['PENDING', 'CONFIRMED', 'NOT_CONFIRMED', 'INCONCLUSIVE']).optional(),
  "from": zod.iso.date().optional(),
  "to": zod.iso.date().optional(),
  "dateField": zod.enum(['created', 'due', 'settled']).default(publicMarketsListHypothesesQueryDateFieldDefault),
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(publicMarketsListHypothesesQueryLimitMax).default(publicMarketsListHypothesesQueryLimitDefault).describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20')
})

export const PublicMarketsListHypothesesResponse = HypothesisPage


/**
 * listIndexBars：市场数据接口。
 */
export const PublicMarketsListIndexBarsParams = zod.object({
  "code": zod.string()
})

export const publicMarketsListIndexBarsQueryLimitDefault = 250;
export const publicMarketsListIndexBarsQueryLimitMax = 250;



export const PublicMarketsListIndexBarsQueryParams = zod.object({
  "limit": zod.coerce.number().int().min(1).max(publicMarketsListIndexBarsQueryLimitMax).default(publicMarketsListIndexBarsQueryLimitDefault)
})

export const PublicMarketsListIndexBarsResponseItem = IndexBar
export const PublicMarketsListIndexBarsResponse = zod.array(PublicMarketsListIndexBarsResponseItem)


/**
 * getReference：市场数据接口。
 */
export const PublicMarketsGetReferenceResponse = MarketReference


/**
 * listWeeklies：市场数据接口。
 */
export const PublicMarketsListWeekliesResponseItem = WeeklySummary
export const PublicMarketsListWeekliesResponse = zod.array(PublicMarketsListWeekliesResponseItem)


/**
 * getWeekly：市场数据接口。
 */
export const PublicMarketsGetWeeklyParams = zod.object({
  "date": zod.iso.date()
})

export const PublicMarketsGetWeeklyResponse = WeeklyReport


export const PublicPapersGetCatalogResponse = PapersCatalog


export const PublicPapersGetGraphResponse = GraphData


export const PublicPapersGetSearchIndexResponse = SearchIndex


export const PublicPapersGetPaperParams = zod.object({
  "id": zod.string()
})

export const PublicPapersGetPaperResponse = Paper


/**
 * 运行记录（runs 表），最新的在前
 */
export const privatePlatformListRunsQueryLimitDefault = 20;
export const privatePlatformListRunsQueryLimitMax = 100;



export const PrivatePlatformListRunsQueryParams = zod.object({
  "job": zod.string().optional().describe('只看某个任务，如 news-morning'),
  "cursor": zod.string().optional().describe('上一页返回的 nextCursor；取第一页时不传'),
  "limit": zod.coerce.number().int().min(1).max(privatePlatformListRunsQueryLimitMax).default(privatePlatformListRunsQueryLimitDefault).describe('每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时默认 20')
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
