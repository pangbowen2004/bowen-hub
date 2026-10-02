// docs/09第3节的业务表。大文档整块保存，摘要和筛选列独立查询。
import {
  index,
  integer,
  primaryKey,
  real,
  sqliteTable,
  text,
  uniqueIndex,
} from "drizzle-orm/sqlite-core";

const payload = () => text("payload").notNull();
export const newsSources = sqliteTable("news_sources", {
  id: text("id").primaryKey(),
  checkedAt: text("checked_at").notNull(),
  status: text("status").notNull(),
  error: text("error"),
});
export const articles = sqliteTable(
  "articles",
  {
    id: text("id").primaryKey(),
    dedupeKey: text("dedupe_key").notNull(),
    sourceId: text("source_id").notNull(),
    kind: text("kind").notNull(),
    title: text("title").notNull(),
    summary: text("summary"),
    url: text("url").notNull(),
    publishedAt: text("published_at").notNull(),
    tickers: text("tickers").notNull(),
    topics: text("topics").notNull(),
    payload: payload(),
  },
  (t) => [
    uniqueIndex("articles_dedupe_key_unique").on(t.dedupeKey),
    index("articles_published_at_idx").on(t.publishedAt),
  ],
);
export const filings = sqliteTable(
  "filings",
  {
    accession: text("accession").primaryKey(),
    ticker: text("ticker").notNull(),
    filedAt: text("filed_at").notNull(),
    payload: payload(),
  },
  (t) => [uniqueIndex("filings_accession_unique").on(t.accession)],
);
export const insiderTrades = sqliteTable(
  "insider_trades",
  {
    accession: text("accession").notNull(),
    transactionIndex: integer("transaction_index").notNull(),
    ticker: text("ticker").notNull(),
    filedAt: text("filed_at").notNull(),
    payload: payload(),
  },
  (t) => [primaryKey({ columns: [t.accession, t.transactionIndex] })],
);
// source_key：宏观=FRED release id、财报=股票代码、FOMC=空串；类型+日期+来源为自然键。
export const calendarEvents = sqliteTable(
  "calendar_events",
  {
    kind: text("kind").notNull(),
    date: text("date").notNull(),
    sourceKey: text("source_key").notNull(),
    payload: payload(),
  },
  (t) => [primaryKey({ columns: [t.kind, t.date, t.sourceKey] })],
);
export const earningsCards = sqliteTable(
  "earnings_cards",
  {
    symbol: text("symbol").notNull(),
    sourceKey: text("source_key").notNull(),
    period: text("period").notNull(),
    publishedAt: text("published_at").notNull(),
    payload: payload(),
  },
  (t) => [primaryKey({ columns: [t.symbol, t.sourceKey] })],
);
export const editions = sqliteTable("editions", {
  id: text("id").primaryKey(),
  kind: text("kind").notNull(),
  date: text("date").notNull(),
  payload: payload(),
  emailSentAt: text("email_sent_at"),
});
export const editionFeedback = sqliteTable("edition_feedback", {
  id: text("id").primaryKey(),
  editionId: text("edition_id").notNull(),
  itemId: text("item_id"),
  score: integer("score"),
  reason: text("reason"),
  at: text("at").notNull(),
});
export const watchItems = sqliteTable("watch_items", {
  symbol: text("symbol").primaryKey(),
  name: text("name").notNull(),
  kind: text("kind").notNull(),
  group: text("group").notNull(),
  underlying: text("underlying"),
  sectorEtf: text("sector_etf"),
  aliases: text("aliases").notNull(),
  active: integer("active", { mode: "boolean" }).notNull(),
});
export const marketDays = sqliteTable("market_days", {
  date: text("date").primaryKey(),
  complete: integer("complete", { mode: "boolean" }).notNull(),
  summary: text("summary").notNull(),
  payload: payload(),
});
export const marketHypotheses = sqliteTable("market_hypotheses", {
  id: text("id").primaryKey(),
  createdOn: text("created_on").notNull(),
  dueOn: text("due_on").notNull(),
  result: text("result").notNull(),
  mode: text("mode").notNull(),
  payload: payload(),
});
export const marketWeeklies = sqliteTable("market_weeklies", {
  date: text("date").primaryKey(),
  payload: payload(),
});
export const marketEvents = sqliteTable("market_events", {
  id: text("id").primaryKey(),
  startDate: text("start_date").notNull(),
  endDate: text("end_date").notNull(),
  payload: payload(),
});
export const indexHistory = sqliteTable(
  "index_history",
  {
    code: text("code").notNull(),
    date: text("date").notNull(),
    open: real("open").notNull(),
    high: real("high").notNull(),
    low: real("low").notNull(),
    close: real("close").notNull(),
    preClose: real("pre_close"),
    return1d: real("return1d"),
    amountCny: real("amount_cny"),
  },
  (t) => [primaryKey({ columns: [t.code, t.date] })],
);
export const papers = sqliteTable(
  "papers",
  {
    id: text("id").primaryKey(),
    visibility: text("visibility").notNull(),
    review: text("review").notNull(),
    readingDepth: text("reading_depth").notNull(),
    year: integer("year"),
    spaces: text("spaces").notNull(),
    updatedAt: text("updated_at").notNull(),
    summary: text("summary").notNull(),
    doc: text("doc").notNull(),
  },
  (t) => [index("papers_updated_at_idx").on(t.updatedAt)],
);
export const paperPrivate = sqliteTable("paper_private", {
  id: text("id").primaryKey(),
  mastery: text("mastery").notNull(),
  notes: text("notes").notNull(),
  explanations: text("explanations").notNull(),
  legacyCards: text("legacy_cards").notNull(),
});
export const paperReviews = sqliteTable("paper_reviews", {
  id: text("id").primaryKey(),
  paperId: text("paper_id").notNull(),
  createdAt: text("created_at").notNull(),
  payload: payload(),
});
export const paperUploads = sqliteTable("paper_uploads", {
  id: text("id").primaryKey(),
  filename: text("filename"),
  arxivUrl: text("arxiv_url"),
  status: text("status").notNull(),
  error: text("error"),
  paperId: text("paper_id"),
  createdAt: text("created_at").notNull(),
  updatedAt: text("updated_at").notNull(),
});
export const documents = sqliteTable("documents", {
  key: text("key").primaryKey(),
  payload: payload(),
  updatedAt: text("updated_at").notNull(),
});
export const runs = sqliteTable(
  "runs",
  {
    id: text("id").primaryKey(),
    job: text("job").notNull(),
    date: text("date").notNull(),
    status: text("status").notNull(),
    startedAt: text("started_at").notNull(),
    finishedAt: text("finished_at"),
    stats: text("stats").notNull(),
    error: text("error"),
  },
  (t) => [
    index("runs_started_id_idx").on(t.startedAt, t.id),
    index("runs_job_started_idx").on(t.job, t.startedAt),
  ],
);
export const aiCalls = sqliteTable(
  "ai_calls",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    capability: text("capability").notNull(),
    version: integer("version").notNull(),
    model: text("model").notNull(),
    inputTokens: integer("input_tokens").notNull(),
    outputTokens: integer("output_tokens").notNull(),
    costUsd: real("cost_usd").notNull(),
    durationMs: integer("duration_ms").notNull(),
    ok: integer("ok", { mode: "boolean" }).notNull(),
    runId: text("run_id"),
    at: text("at").notNull(),
  },
  (t) => [
    index("ai_calls_at_idx").on(t.at),
    index("ai_calls_capability_at_idx").on(t.capability, t.at),
  ],
);
export const evalResults = sqliteTable(
  "eval_results",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    capability: text("capability").notNull(),
    model: text("model").notNull(),
    datasetVersion: text("dataset_version").notNull(),
    scores: text("scores").notNull(),
    passed: integer("passed", { mode: "boolean" }).notNull(),
    at: text("at").notNull(),
    costUsd: real("cost_usd"),
    durationMs: integer("duration_ms"),
  },
  (t) => [index("eval_results_capability_at_idx").on(t.capability, t.at)],
);
