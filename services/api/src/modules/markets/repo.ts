// 整块市场文档的持久化；不在Worker计算指标或结算规则。
import type {
  Hypothesis,
  IndexBar,
  MarketDayWrite,
  MarketEvent,
  WeeklyReport,
} from "@bowen-hub/contracts";
import { and, asc, desc, eq, gte, isNotNull, lt, lte, or, sql } from "drizzle-orm";
import {
  documents,
  marketDays,
  marketEvents,
  marketHypotheses,
  marketWeeklies,
} from "../../db/schema/domain";
import { database } from "../../lib/db";

export interface Cursor {
  date: string;
  id: string;
}
export interface HypothesisFilter {
  result?: Hypothesis["result"];
  from?: string;
  to?: string;
  dateField?: "created" | "due" | "settled";
}
export async function day(binding: D1Database, date?: string): Promise<string | null> {
  const [row] = await database(binding)
    .select({ payload: marketDays.payload })
    .from(marketDays)
    .where(date === undefined ? undefined : eq(marketDays.date, date))
    .orderBy(desc(marketDays.date))
    .limit(1);
  return row?.payload ?? null;
}
export async function days(binding: D1Database, limit: number, before?: string, cursor?: Cursor) {
  return database(binding)
    .select({ date: marketDays.date, summary: marketDays.summary })
    .from(marketDays)
    .where(
      and(
        before === undefined ? undefined : lt(marketDays.date, before),
        cursor === undefined ? undefined : lt(marketDays.date, cursor.date),
      ),
    )
    .orderBy(desc(marketDays.date))
    .limit(limit);
}
export async function putDay(binding: D1Database, value: MarketDayWrite): Promise<void> {
  const values = {
    date: value.day.date,
    complete: value.day.dataStatus.complete,
    summary: JSON.stringify(value.summary),
    payload: JSON.stringify(value.day),
  };
  await database(binding)
    .insert(marketDays)
    .values(values)
    .onConflictDoUpdate({ target: marketDays.date, set: values });
}
export async function hypotheses(
  binding: D1Database,
  limit: number,
  filter: HypothesisFilter,
  cursor?: Cursor,
) {
  const field =
    filter.dateField === "due"
      ? sql<string>`${marketHypotheses.dueOn}`
      : filter.dateField === "settled"
        ? sql<string>`json_extract(${marketHypotheses.payload}, '$.settledOn')`
        : sql<string>`${marketHypotheses.createdOn}`;
  return database(binding)
    .select({ date: field, id: marketHypotheses.id, payload: marketHypotheses.payload })
    .from(marketHypotheses)
    .where(
      and(
        filter.dateField === "settled" ? isNotNull(field) : undefined,
        filter.result === undefined ? undefined : eq(marketHypotheses.result, filter.result),
        filter.from === undefined ? undefined : gte(field, filter.from),
        filter.to === undefined ? undefined : lte(field, filter.to),
        cursor === undefined
          ? undefined
          : or(
              lt(field, cursor.date),
              and(eq(field, cursor.date), lt(marketHypotheses.id, cursor.id)),
            ),
      ),
    )
    .orderBy(desc(field), desc(marketHypotheses.id))
    .limit(limit);
}
export async function putHypotheses(binding: D1Database, items: Hypothesis[]): Promise<void> {
  const db = database(binding);
  for (let start = 0; start < items.length; start += 40) {
    const statements = items.slice(start, start + 40).map((item) => {
      const values = {
        id: item.id,
        createdOn: item.createdOn,
        dueOn: item.dueOn,
        result: item.result,
        mode: item.mode,
        payload: JSON.stringify(item),
      };
      return db
        .insert(marketHypotheses)
        .values(values)
        .onConflictDoUpdate({
          target: marketHypotheses.id,
          set: values,
          setWhere: eq(marketHypotheses.result, "PENDING"),
        });
    });
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);
  }
}
export async function weekly(binding: D1Database, date: string): Promise<string | null> {
  const [row] = await database(binding)
    .select({ payload: marketWeeklies.payload })
    .from(marketWeeklies)
    .where(eq(marketWeeklies.date, date));
  return row?.payload ?? null;
}
export async function weeklies(binding: D1Database): Promise<string[]> {
  const rows = await database(binding)
    .select({ payload: marketWeeklies.payload })
    .from(marketWeeklies)
    .orderBy(desc(marketWeeklies.date));
  return rows.map((row) => row.payload);
}
export async function putWeekly(binding: D1Database, value: WeeklyReport): Promise<void> {
  const values = { date: value.date, payload: JSON.stringify(value) };
  await database(binding)
    .insert(marketWeeklies)
    .values(values)
    .onConflictDoUpdate({ target: marketWeeklies.date, set: values });
}
export async function events(binding: D1Database, from: string, to: string): Promise<string[]> {
  const rows = await database(binding)
    .select({ payload: marketEvents.payload })
    .from(marketEvents)
    .where(and(gte(marketEvents.endDate, from), lte(marketEvents.startDate, to)))
    .orderBy(asc(marketEvents.startDate), asc(marketEvents.id));
  return rows.map((row) => row.payload);
}
export async function putEvents(binding: D1Database, items: MarketEvent[]): Promise<void> {
  const db = database(binding);
  for (let start = 0; start < items.length; start += 40) {
    const statements = items.slice(start, start + 40).map((item) => {
      const values = {
        id: item.id,
        startDate: item.startDate,
        endDate: item.endDate,
        payload: JSON.stringify(item),
      };
      return db
        .insert(marketEvents)
        .values(values)
        .onConflictDoUpdate({ target: marketEvents.id, set: values });
    });
    const [first, ...rest] = statements;
    if (first) await db.batch([first, ...rest]);
  }
}
export async function removeEvent(binding: D1Database, id: string): Promise<void> {
  await database(binding).delete(marketEvents).where(eq(marketEvents.id, id));
}
export async function reference(binding: D1Database): Promise<string | null> {
  const [row] = await database(binding)
    .select({ payload: documents.payload })
    .from(documents)
    .where(eq(documents.key, "markets.reference"));
  return row?.payload ?? null;
}
// pre_close/return1d 的预建表缺口由编排者提供独立迁移；保存原值，绝不从相邻bar猜造。
export async function indexBars(
  binding: D1Database,
  code: string,
  limit: number,
): Promise<
  Array<
    Omit<IndexBar, "preClose" | "return1d" | "amountCny"> & {
      preClose: number | null;
      return1d: number | null;
      amountCny: number | null;
    }
  >
> {
  const rows = await binding
    .prepare(
      `SELECT date,open,high,low,close,pre_close AS preClose,return1d,amount_cny AS amountCny FROM index_history WHERE code=? ORDER BY date DESC LIMIT ?`,
    )
    .bind(code, limit)
    .all<
      Omit<IndexBar, "preClose" | "return1d" | "amountCny"> & {
        preClose: number | null;
        return1d: number | null;
        amountCny: number | null;
      }
    >();
  return rows.results.reverse();
}
export async function putIndexBars(
  binding: D1Database,
  code: string,
  items: IndexBar[],
): Promise<void> {
  for (let start = 0; start < items.length; start += 40) {
    const statements = items
      .slice(start, start + 40)
      .map((item) =>
        binding
          .prepare(
            `INSERT INTO index_history (code,date,open,high,low,close,pre_close,return1d,amount_cny) VALUES (?,?,?,?,?,?,?,?,?) ON CONFLICT(code,date) DO UPDATE SET open=excluded.open,high=excluded.high,low=excluded.low,close=excluded.close,pre_close=excluded.pre_close,return1d=excluded.return1d,amount_cny=excluded.amount_cny`,
          )
          .bind(
            code,
            item.date,
            item.open,
            item.high,
            item.low,
            item.close,
            item.preClose,
            item.return1d,
            item.amountCny,
          ),
      );
    if (statements.length) await binding.batch(statements);
  }
}
