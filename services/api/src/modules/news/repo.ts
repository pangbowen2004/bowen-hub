// 新闻的持久化与查询；计算与AI留在计算平面。
import type {
  Article,
  CalendarEvent,
  EarningsCard,
  Edition,
  EditionKind,
  Feedback,
  Filing,
  InsiderTrade,
  NewsSourceHealth,
} from "@bowen-hub/contracts";
import { and, asc, desc, eq, gte, lt, lte, or, sql } from "drizzle-orm";
import {
  articles,
  calendarEvents,
  earningsCards,
  editionFeedback,
  editions,
  filings,
  insiderTrades,
  newsSources,
  watchItems,
} from "../../db/schema/domain";
import { database } from "../../lib/db";

export async function getEdition(binding: D1Database, id: string): Promise<string | null> {
  const [row] = await database(binding)
    .select({ payload: editions.payload })
    .from(editions)
    .where(eq(editions.id, id));
  return row?.payload ?? null;
}
export async function putEdition(binding: D1Database, edition: Edition): Promise<void> {
  const values = {
    id: edition.id,
    kind: edition.kind,
    date: edition.date,
    payload: JSON.stringify(edition),
    emailSentAt: edition.email?.sentAt ?? null,
  };
  await database(binding)
    .insert(editions)
    .values(values)
    .onConflictDoUpdate({ target: editions.id, set: values });
}
export async function listEditions(
  binding: D1Database,
  limit: number,
  kind?: EditionKind,
  cursor?: { date: string; id: string },
) {
  return database(binding)
    .select({
      id: editions.id,
      kind: editions.kind,
      date: editions.date,
      generatedAt: sql<string | null>`json_extract(${editions.payload}, '$.generatedAt')`,
    })
    .from(editions)
    .where(
      and(
        kind === undefined ? undefined : eq(editions.kind, kind),
        cursor === undefined
          ? undefined
          : or(
              lt(editions.date, cursor.date),
              and(eq(editions.date, cursor.date), lt(editions.id, cursor.id)),
            ),
      ),
    )
    .orderBy(desc(editions.date), desc(editions.id))
    .limit(limit);
}
export async function saveFeedback(binding: D1Database, feedback: Feedback): Promise<void> {
  await database(binding)
    .insert(editionFeedback)
    .values({
      id: feedback.id,
      editionId: feedback.editionId,
      at: feedback.createdAt,
      score: feedback.kind === "edition" ? feedback.score : null,
      itemId: feedback.kind === "item" ? feedback.itemId : null,
      reason: feedback.kind === "item" ? feedback.reason : null,
    });
}
export async function listFeedback(binding: D1Database, since?: string): Promise<Feedback[]> {
  const rows = await database(binding)
    .select()
    .from(editionFeedback)
    .where(since === undefined ? undefined : gte(editionFeedback.at, since))
    .orderBy(desc(editionFeedback.at), desc(editionFeedback.id));
  return rows.map(
    (row): Feedback =>
      row.score !== null
        ? {
            kind: "edition",
            id: row.id,
            editionId: row.editionId,
            createdAt: row.at,
            score: row.score,
          }
        : {
            kind: "item",
            id: row.id,
            editionId: row.editionId,
            createdAt: row.at,
            itemId: row.itemId as string,
            reason: row.reason as "useless" | "incorrect",
          },
  );
}
export async function putArticles(
  binding: D1Database,
  items: { article: Article; dedupeKey: string }[],
): Promise<void> {
  const db = database(binding);
  const statements = items.map(({ article, dedupeKey }) => {
    const values = {
      id: article.id,
      dedupeKey,
      sourceId: article.sourceId,
      kind: article.kind,
      title: article.title,
      summary: article.summary,
      url: article.url,
      publishedAt: new Date(article.publishedAt).toISOString(),
      tickers: JSON.stringify(article.tickers),
      topics: JSON.stringify(article.topics),
      payload: JSON.stringify(article),
    };
    return db
      .insert(articles)
      .values(values)
      .onConflictDoUpdate({ target: articles.dedupeKey, set: values });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function putFilings(binding: D1Database, items: Filing[]): Promise<void> {
  const db = database(binding);
  const statements = items.map((item) => {
    const values = {
      accession: item.accession,
      ticker: item.ticker,
      filedAt: new Date(item.filedAt).toISOString(),
      payload: JSON.stringify(item),
    };
    return db
      .insert(filings)
      .values(values)
      .onConflictDoUpdate({ target: filings.accession, set: values });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function putInsiders(binding: D1Database, items: InsiderTrade[]): Promise<void> {
  const db = database(binding);
  const statements = items.map((item) => {
    const values = {
      accession: item.accession,
      transactionIndex: item.transactionIndex,
      ticker: item.ticker,
      filedAt: new Date(item.filedAt).toISOString(),
      payload: JSON.stringify(item),
    };
    return db
      .insert(insiderTrades)
      .values(values)
      .onConflictDoUpdate({
        target: [insiderTrades.accession, insiderTrades.transactionIndex],
        set: values,
      });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function putCalendar(
  binding: D1Database,
  items: { event: CalendarEvent; sourceKey: string }[],
): Promise<void> {
  const db = database(binding);
  const statements = items.map(({ event, sourceKey }) => {
    const values = {
      kind: event.kind,
      date: event.date,
      sourceKey,
      payload: JSON.stringify(event),
    };
    return db
      .insert(calendarEvents)
      .values(values)
      .onConflictDoUpdate({
        target: [calendarEvents.kind, calendarEvents.date, calendarEvents.sourceKey],
        set: values,
      });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function listCalendar(
  binding: D1Database,
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  const rows = await database(binding)
    .select({ payload: calendarEvents.payload })
    .from(calendarEvents)
    .leftJoin(watchItems, eq(calendarEvents.sourceKey, watchItems.symbol))
    .where(
      and(
        gte(calendarEvents.date, from),
        lte(calendarEvents.date, to),
        or(
          sql`${calendarEvents.kind} != 'earnings'`,
          and(eq(watchItems.active, true), eq(watchItems.kind, "stock")),
        ),
      ),
    )
    .orderBy(asc(calendarEvents.date), asc(calendarEvents.sourceKey));
  return rows.map((row) => JSON.parse(row.payload) as CalendarEvent);
}
export async function putEarnings(
  binding: D1Database,
  items: { card: EarningsCard; sourceKey: string }[],
): Promise<void> {
  const db = database(binding);
  const statements = items.map(({ card, sourceKey }) => {
    const values = {
      symbol: card.symbol,
      sourceKey,
      period: card.period,
      publishedAt: new Date(card.publishedAt).toISOString(),
      payload: JSON.stringify(card),
    };
    return db
      .insert(earningsCards)
      .values(values)
      .onConflictDoUpdate({ target: [earningsCards.symbol, earningsCards.sourceKey], set: values });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function putSource(binding: D1Database, source: NewsSourceHealth): Promise<void> {
  const values = { ...source, checkedAt: new Date(source.checkedAt).toISOString() };
  await database(binding)
    .insert(newsSources)
    .values(values)
    .onConflictDoUpdate({ target: newsSources.id, set: values });
}
export async function listSources(binding: D1Database): Promise<NewsSourceHealth[]> {
  const rows = await database(binding).select().from(newsSources).orderBy(newsSources.id);
  return rows.map((row) => ({ ...row, status: row.status as NewsSourceHealth["status"] }));
}
export async function pruneArticles(binding: D1Database, before: string): Promise<void> {
  await database(binding).delete(articles).where(lt(articles.publishedAt, before));
}
/** 用户搜索词全部作为FTS短语，不把引号、减号或冒号当查询语法。 */
export async function search(
  binding: D1Database,
  q: string,
  from: string,
  to: string,
  ticker?: string,
): Promise<Article[]> {
  const phrase = `"${q.replaceAll('"', '""')}"`;
  const statement = binding.prepare(
    `SELECT a.payload FROM articles a JOIN articles_fts f ON f.rowid=a.rowid WHERE articles_fts MATCH ? AND a.published_at>=? AND a.published_at<=? ${ticker === undefined ? "" : "AND EXISTS (SELECT 1 FROM json_each(a.tickers) WHERE value=?)"} ORDER BY a.published_at DESC,a.id DESC`,
  );
  const result = await statement
    .bind(phrase, from, to, ...(ticker === undefined ? [] : [ticker]))
    .all<{ payload: string }>();
  return result.results.map((row) => JSON.parse(row.payload) as Article);
}
export async function timeline(
  binding: D1Database,
  symbol: string,
  from: string,
  to: string,
  full: boolean,
): Promise<{ kind: string; at: string; payload: string }[]> {
  const branches = [
    "SELECT 'article' kind,published_at at,payload,id stable FROM articles WHERE published_at>=? AND published_at<=? AND EXISTS (SELECT 1 FROM json_each(tickers) WHERE value=?)",
    "SELECT 'filing' kind,filed_at at,payload,accession stable FROM filings WHERE filed_at>=? AND filed_at<=? AND ticker=?",
    "SELECT 'earnings' kind,published_at at,payload,source_key stable FROM earnings_cards WHERE published_at>=? AND published_at<=? AND symbol=?",
    ...(full
      ? [
          "SELECT 'insider' kind,filed_at at,payload,accession || ':' || transaction_index stable FROM insider_trades WHERE filed_at>=? AND filed_at<=? AND ticker=?",
        ]
      : []),
  ];
  const result = await binding
    .prepare(
      `SELECT kind,at,payload FROM (${branches.join(" UNION ALL ")}) ORDER BY at DESC,kind,stable`,
    )
    .bind(...branches.flatMap(() => [from, to, symbol]))
    .all<{ kind: string; at: string; payload: string }>();
  return result.results;
}
