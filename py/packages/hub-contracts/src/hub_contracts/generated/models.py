# 由 contracts 生成，勿手改（mise run gen）

from pydantic import AwareDatetime, BaseModel
from datetime import date as date_aliased
from typing import Any, Literal


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
    按天（日期升序；没有调用的日子不出现）
    """
    byCapability: list[AiUsageCapability]
    """
    按能力
    """
    monthCostUsd: float
    """
    本月累计费用（美元），与窗口无关
    """
    monthlyBudgetUsd: float
    """
    月度预算（美元，config/llm.yaml 的 monthlyBudgetUsd）
    """


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
