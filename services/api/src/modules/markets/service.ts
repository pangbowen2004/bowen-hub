// REST和MCP共同使用的市场存取服务。
import { Buffer } from "node:buffer";
import type {
  Hypothesis,
  HypothesisPage,
  MarketDaySummary,
  MarketDaySummaryPage,
  MarketDayWrite,
  MarketEvent,
  WeeklyReport,
  WeeklySummary,
} from "@bowen-hub/contracts";
import {
  IndexBar as indexBarSchema,
  MarketReference as referenceSchema,
} from "@bowen-hub/contracts/zod";
import { z } from "zod";
import { ApiError } from "../../lib/problem";
import * as repo from "./repo";

const cursorSchema = z.object({ date: z.iso.date(), id: z.string() });
function cursor(raw?: string): repo.Cursor | undefined {
  if (raw === undefined) return undefined;
  try {
    return cursorSchema.parse(JSON.parse(Buffer.from(raw, "base64url").toString("utf8")));
  } catch {
    throw new ApiError(400, "分页游标无效");
  }
}
function encode(date: string, id: string): string {
  return Buffer.from(JSON.stringify({ date, id })).toString("base64url");
}
function required(payload: string | null, label: string): string {
  if (payload === null) throw new ApiError(404, `${label}不存在`);
  return payload;
}
export async function day(binding: D1Database, date?: string): Promise<string> {
  return required(await repo.day(binding, date), "交易日");
}
export async function days(
  binding: D1Database,
  limit = 20,
  before?: string,
  rawCursor?: string,
): Promise<MarketDaySummaryPage> {
  const rows = await repo.days(binding, limit + 1, before, cursor(rawCursor));
  const items = rows.slice(0, limit).map((row) => JSON.parse(row.summary) as MarketDaySummary);
  const last = items.at(-1);
  return { items, nextCursor: rows.length > limit && last ? encode(last.date, last.date) : null };
}
export async function hypotheses(
  binding: D1Database,
  limit = 20,
  filter: repo.HypothesisFilter = {},
  rawCursor?: string,
): Promise<HypothesisPage> {
  range(filter.from, filter.to);
  const rows = await repo.hypotheses(binding, limit + 1, filter, cursor(rawCursor));
  const items = rows.slice(0, limit).map((row) => JSON.parse(row.payload) as Hypothesis);
  const last = rows.slice(0, limit).at(-1);
  return { items, nextCursor: rows.length > limit && last ? encode(last.date, last.id) : null };
}
export function range(from?: string, to?: string): void {
  if (from && to && from > to) throw new ApiError(400, "起止日期顺序无效");
}
export async function putDay(
  binding: D1Database,
  date: string,
  value: MarketDayWrite,
): Promise<void> {
  if (value.day.date !== date || value.summary.date !== date)
    throw new ApiError(400, "交易日与路径不一致");
  if (value.day.schemaVersion !== 1) throw new ApiError(400, "市场文档版本不支持");
  await repo.putDay(binding, value);
}
export const putHypotheses = repo.putHypotheses;
export async function indexBars(binding: D1Database, code: string, limit: number) {
  return (await repo.indexBars(binding, code, limit)).map((row) => {
    const value = indexBarSchema.safeParse(row);
    if (!value.success) throw new ApiError(422, "历史指数行不完整，需用真实来源回补");
    return value.data;
  });
}
export const putIndexBars = repo.putIndexBars;
export async function weekly(binding: D1Database, date: string): Promise<string> {
  return required(await repo.weekly(binding, date), "周报");
}
export async function weeklies(binding: D1Database): Promise<WeeklySummary[]> {
  return (await repo.weeklies(binding)).map((payload) => {
    const row = JSON.parse(payload) as WeeklyReport;
    return {
      date: row.date,
      title: row.title,
      sentence: row.sentence,
      settledCount: row.settledCount,
      researchErrorCount: row.researchErrorCount,
      inconclusiveCount: row.inconclusiveCount,
    };
  });
}
export async function putWeekly(
  binding: D1Database,
  date: string,
  value: WeeklyReport,
): Promise<void> {
  if (value.date !== date) throw new ApiError(400, "周报日期与路径不一致");
  await repo.putWeekly(binding, value);
}
const beijingDate = (offset: number) =>
  new Date(Date.now() + 8 * 3600 * 1000 + offset * 86400 * 1000).toISOString().slice(0, 10);
export async function events(
  binding: D1Database,
  from = beijingDate(-7),
  to = beijingDate(30),
): Promise<MarketEvent[]> {
  range(from, to);
  return (await repo.events(binding, from, to)).map(
    (payload) => JSON.parse(payload) as MarketEvent,
  );
}
export async function putEvents(binding: D1Database, items: MarketEvent[]): Promise<void> {
  for (const item of items) range(item.startDate, item.endDate);
  await repo.putEvents(binding, items);
}
export async function putEvent(
  binding: D1Database,
  id: string,
  value: MarketEvent,
): Promise<MarketEvent> {
  if (value.id !== id) throw new ApiError(400, "事件ID与路径不一致");
  await putEvents(binding, [value]);
  return value;
}
export const removeEvent = repo.removeEvent;
export async function reference(binding: D1Database): Promise<string> {
  const raw = required(await repo.reference(binding), "市场参考资料");
  // 通用documents可写任意JSON，领域读取不能把坏资料作为有效参考返回。
  let value: unknown;
  try {
    value = JSON.parse(raw);
  } catch {
    throw new ApiError(404, "市场参考资料格式无效");
  }
  if (!referenceSchema.safeParse(value).success) throw new ApiError(404, "市场参考资料格式无效");
  return raw;
}
