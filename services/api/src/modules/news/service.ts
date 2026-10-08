import { Buffer } from "node:buffer";
import type {
  Article,
  CalendarEvent,
  EarningsCard,
  Edition,
  EditionFeedback,
  EditionKind,
  EditionPage,
  Filing,
  InsiderTrade,
  ItemFeedback,
  ItemFeedbackRequest,
  NewsFullTimelineItem,
  NewsSourceHealth,
  NewsTimelineItem,
} from "@bowen-hub/contracts";
import { ApiError } from "../../lib/problem";
import { readFile, writeFile } from "../../lib/r2";
import * as repo from "./repo";

/** 与docs/02的链接规范化口径一致；保留非跟踪查询参数的原有顺序。 */
export function canonicalUrl(raw: string): string {
  let url: URL;
  try {
    url = new URL(raw);
  } catch {
    throw new ApiError(400, "来源链接无效");
  }
  if (url.protocol !== "http:" && url.protocol !== "https:")
    throw new ApiError(400, "来源链接必须为HTTP或HTTPS");
  url.protocol = "https:";
  url.hostname = url.hostname.toLowerCase();
  url.hash = "";
  for (const key of [...url.searchParams.keys()])
    if (key.startsWith("utm_") || key === "fbclid" || key === "gclid") url.searchParams.delete(key);
  return `${url.origin}${url.pathname.replace(/\/+$/, "")}${url.search}`;
}
function decodeCursor(cursor: string): { date: string; id: string } {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof value !== "object" ||
      value === null ||
      !("date" in value) ||
      !("id" in value) ||
      typeof value.date !== "string" ||
      typeof value.id !== "string" ||
      !/^\d{4}-\d{2}-\d{2}$/.test(value.date)
    )
      throw new Error();
    return { date: value.date, id: value.id };
  } catch {
    throw new ApiError(400, "分页游标无效");
  }
}
export async function listEditions(
  binding: D1Database,
  limit = 20,
  kind?: EditionKind,
  cursor?: string,
): Promise<EditionPage> {
  const rows = await repo.listEditions(
    binding,
    limit + 1,
    kind,
    cursor === undefined ? undefined : decodeCursor(cursor),
  );
  const items = rows.slice(0, limit).map((row) => ({ ...row, kind: row.kind as EditionKind }));
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > limit && last
        ? Buffer.from(JSON.stringify({ date: last.date, id: last.id })).toString("base64url")
        : null,
  };
}

export async function listCalendar(
  binding: D1Database,
  from: string,
  to: string,
): Promise<CalendarEvent[]> {
  if (from > to) throw new ApiError(400, "开始日期不能晚于结束日期");
  return repo.listCalendar(binding, from, to);
}
export async function getEdition(binding: D1Database, id: string): Promise<string> {
  const payload = await repo.getEdition(binding, id);
  if (payload === null) throw new ApiError(404, "期次不存在");
  return payload;
}
export async function putEdition(binding: D1Database, id: string, edition: Edition): Promise<void> {
  if (id !== edition.id) throw new ApiError(400, "期次ID与路径不一致");
  await repo.putEdition(binding, edition);
}
const htmlKey = (id: string) => `editions/${encodeURIComponent(id)}.html`;
export async function getHtml(
  binding: D1Database,
  bucket: R2Bucket,
  id: string,
): Promise<Response> {
  await getEdition(binding, id);
  const response = await readFile(bucket, htmlKey(id));
  response.headers.set("Content-Type", "text/html; charset=utf-8");
  return response;
}
export async function putHtml(
  binding: D1Database,
  bucket: R2Bucket,
  id: string,
  stream: ReadableStream | null,
  length?: number,
): Promise<void> {
  await getEdition(binding, id);
  await writeFile(bucket, htmlKey(id), stream, "text/html; charset=utf-8", length);
}
export async function rateEdition(
  binding: D1Database,
  id: string,
  score: number,
  now = new Date().toISOString(),
): Promise<EditionFeedback> {
  await getEdition(binding, id);
  const result: EditionFeedback = {
    kind: "edition",
    id: crypto.randomUUID(),
    editionId: id,
    score,
    createdAt: now,
  };
  await repo.saveFeedback(binding, result);
  return result;
}
export async function flagItem(
  binding: D1Database,
  input: ItemFeedbackRequest,
  now = new Date().toISOString(),
): Promise<ItemFeedback> {
  await getEdition(binding, input.editionId);
  const result: ItemFeedback = { kind: "item", id: crypto.randomUUID(), ...input, createdAt: now };
  await repo.saveFeedback(binding, result);
  return result;
}
export const listFeedback = (binding: D1Database, since?: string) =>
  repo.listFeedback(binding, since === undefined ? undefined : new Date(since).toISOString());
export async function putArticles(binding: D1Database, items: Article[]): Promise<void> {
  await repo.putArticles(
    binding,
    items.map((article) => ({
      article,
      dedupeKey: article.sourceId === "alpaca-news" ? article.id : canonicalUrl(article.url),
    })),
  );
}
export const putFilings = (binding: D1Database, items: Filing[]) => repo.putFilings(binding, items);
export const putInsiders = (binding: D1Database, items: InsiderTrade[]) =>
  repo.putInsiders(binding, items);
export async function putCalendar(binding: D1Database, items: CalendarEvent[]): Promise<void> {
  const entries = items.flatMap((event) => {
    if (event.kind === "macro") {
      if (event.fredReleaseId === null) throw new ApiError(400, "宏观日程缺少FRED发布ID");
      return [{ event, sourceKey: String(event.fredReleaseId) }];
    }
    if (event.kind === "fomc") return [{ event, sourceKey: "" }];
    if (!event.tickers.length) throw new ApiError(400, "财报日程缺少股票代码");
    return [...new Set(event.tickers)].map((symbol) => ({ event, sourceKey: symbol }));
  });
  await repo.putCalendar(binding, entries);
}
export const putEarnings = (binding: D1Database, items: EarningsCard[]) =>
  repo.putEarnings(
    binding,
    items.map((card) => ({
      card,
      sourceKey: card.sourceAccession ?? canonicalUrl(card.sourceUrl),
    })),
  );
export const listSources = repo.listSources;
export async function putSource(
  binding: D1Database,
  id: string,
  source: NewsSourceHealth,
): Promise<void> {
  if (id !== source.id) throw new ApiError(400, "来源ID与路径不一致");
  await repo.putSource(binding, source);
}
export const pruneArticles = (binding: D1Database, before: string) =>
  repo.pruneArticles(binding, `${before}T00:00:00.000Z`);
function window(days: number, now: string) {
  const to = new Date(now);
  const from = new Date(to.getTime() - days * 86400000);
  if (!Number.isFinite(from.getTime())) throw new ApiError(400, "查询时间范围无法表示");
  return { from: from.toISOString(), to: to.toISOString() };
}
export async function search(
  binding: D1Database,
  q: string,
  ticker?: string,
  days = 30,
  now = new Date().toISOString(),
): Promise<Article[]> {
  if (q.includes("\0")) throw new ApiError(400, "搜索词包含无法检索的空字符");
  if (!q.trim()) return [];
  const bounds = window(days, now);
  return repo.search(binding, q.trim(), bounds.from, bounds.to, ticker);
}
export async function timeline(
  binding: D1Database,
  symbol: string,
  days = 30,
  now = new Date().toISOString(),
): Promise<NewsTimelineItem[]> {
  const bounds = window(days, now);
  const rows = await repo.timeline(binding, symbol, bounds.from, bounds.to, false);
  return rows.map(
    (row) =>
      ({
        kind: row.kind,
        at: row.at,
        [row.kind === "earnings" ? "earnings" : row.kind]: JSON.parse(row.payload),
      }) as NewsTimelineItem,
  );
}
export async function fullTimeline(
  binding: D1Database,
  symbol: string,
  days = 30,
  now = new Date().toISOString(),
): Promise<NewsFullTimelineItem[]> {
  const bounds = window(days, now);
  const rows = await repo.timeline(binding, symbol, bounds.from, bounds.to, true);
  return rows.map(
    (row) =>
      ({
        kind: row.kind,
        at: row.at,
        [row.kind === "insider" ? "insiderTrade" : row.kind]: JSON.parse(row.payload),
      }) as NewsFullTimelineItem,
  );
}
export async function latestEdition(binding: D1Database, kind: EditionKind): Promise<Edition> {
  const latest = (await listEditions(binding, 1, kind)).items[0];
  if (!latest) throw new ApiError(404, "该版次暂无期次");
  return JSON.parse(await getEdition(binding, latest.id)) as Edition;
}
