// 公共约定（docs/08 第 4 节）：装饰器、日期与时间、错误、分页、出处。各领域文件都用这里的东西。
//
// 全体遵守：
// - 字段名 camelCase；模型名 PascalCase，且全局唯一（JSON Schema 文件名、TS 类型名、Python 类名都直接用它）。
// - 字段名不要用 Python 关键字（from、class、global、import、in、is、lambda、pass 等）：Pydantic 会被迫加别名。
// - 日期用 Date（YYYY-MM-DD），时间用 DateTime（ISO 8601 带时区）；字段注释写明是哪个时区的日期。
// - 比例和收益率是 0–1 小数（0.0123 = 1.23%），显示时再格式化；字段名不带 Pct。
// - 金额是元或美元的数值，字段名写明币种：amountCny、valueUsd、costUsd。
// - 枚举用字符串联合（union X { "a", "b" } 或 "a" | "b"），不用 TypeSpec 的 enum。
// - “暂无 / 缺失”的值：必填 + `| null`；只有文档写明“可选”的字段（老数据可能没有）才用 `?`。
// - AI 生成的字段所在的对象带 `generatedBy: GeneratedBy`（docs/10 第 5 节第 6 步）。
// - 能力输出里的文字字段用 @maxChars 标字数上限，不要用 @maxLength（生成的校验器会强制，运行时就没法截断了）。
import "@typespec/http";
import "@typespec/json-schema";

using TypeSpec.Reflection;

namespace BowenHub;

// ───────────── 装饰器（实现在 lib/decorators.js；只写 x- 扩展，生成的校验器不强制） ─────────────

/** 接口由哪个任务实现：tasks/graph.yaml 里的任务号（如 "T14"）→ OpenAPI 操作上的 x-task。每个接口都要有。 */
extern dec task(target: Operation, id: valueof string);

/**
 * 字数上限 → x-max-chars（OpenAPI 与 JSON Schema 都有）。由 AI 运行时的 length_within 读取，超出截到最后一个完整句。
 * 用在 string[] 上时指每个元素的上限。同一字段的上限随 mode 变化时标较宽的一档（docs/10 第 5 节）。
 */
extern dec maxChars(target: ModelProperty, limit: valueof int32);

/** 原文片段 → x-source-quote：必须是输入原文的子串（quotes_in_sources 校验），如财报卡片的 quote */
extern dec sourceQuote(target: ModelProperty);

/** 图片字段 → x-image：运行时作为图片附件随 user 消息发送，提示词占位处只写页码（如 papers.review 的 pageImages） */
extern dec image(target: ModelProperty);

// ───────────── 日期与时间 ─────────────

/** 日期：YYYY-MM-DD（format: date） */
alias Date = plainDate;

/** 时间：ISO 8601 / RFC 3339，必须带时区（Z 或 +08:00 这样的偏移；format: date-time） */
alias DateTime = utcDateTime;

// ───────────── 错误（RFC 9457） ─────────────

/**
 * 错误响应的正文（application/problem+json，RFC 9457）。
 * 各接口统一用 HubHttp.ErrorResponse 声明错误（OpenAPI 里是 default 响应）。
 */
model Problem {
  /** 错误类型的 URI；没有专门类型时为 about:blank */
  type: string;

  /** 简短的错误标题，如“未实现” */
  title: string;

  /** HTTP 状态码 */
  status: int32;

  /** 具体说明，如“未实现（任务 T14）” */
  detail: string;
}

// ───────────── 游标分页 ─────────────

/**
 * 游标分页的返回（docs/08 第 4 节），配 HubHttp.CursorParams 使用。
 * 用具名模型声明，如 `model RunPage is CursorPage<Run>;`，TS、Python 两边都会有这个类型。
 */
model CursorPage<T> {
  /** 本页条目 */
  items: T[];

  /** 下一页的游标，原样作为 ?cursor= 传回；没有下一页时为 null */
  nextCursor: string | null;
}

// ───────────── 出处 ─────────────

/** AI 生成内容的出处（docs/08 第 4 节；运行时在 docs/10 第 5 节第 6 步盖上） */
model GeneratedBy {
  /** 能力 ID，如 news.ticker_digest */
  capability: string;

  /** 能力清单的 version */
  version: int32;

  /** 实际调用的模型（供应商/模型），如 openai/gpt-6-luna */
  `model`: string;

  /** 生成时间 */
  at: DateTime;
}
