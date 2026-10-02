import * as schemas from "@bowen-hub/contracts/zod";
import type { Handler } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../lib/env";
import { ApiError } from "../../lib/problem";

// 只允许契约中的业务表，列名来自固定自然键；不接受调用方提供 SQL 标识符。
const keys = {
  news_sources: ["id"],
  articles: ["id"],
  filings: ["accession"],
  insider_trades: ["accession", "transaction_index"],
  calendar_events: ["kind", "date", "source_key"],
  earnings_cards: ["symbol", "source_key"],
  editions: ["id"],
  edition_feedback: ["id"],
  watch_items: ["symbol"],
  market_days: ["date"],
  market_hypotheses: ["id"],
  market_weeklies: ["date"],
  market_events: ["id"],
  index_history: ["code", "date"],
  papers: ["id"],
  paper_private: ["id"],
  paper_reviews: ["id"],
  paper_uploads: ["id"],
  documents: ["key"],
  runs: ["id"],
  ai_calls: ["id"],
  eval_results: ["id"],
} as const satisfies Record<schemas.ExportTable, readonly string[]>;
const cursorSchema = z.object({
  table: schemas.ExportTable,
  values: z.array(z.union([z.string(), z.number().int().safe()])),
});
function decode(cursor: string, table: schemas.ExportTable): (string | number)[] {
  try {
    const value = cursorSchema.parse(JSON.parse(decodeURIComponent(atob(cursor))));
    const columns = keys[table];
    if (value.table !== table || value.values.length !== columns.length) throw new Error();
    if (
      value.values.some(
        (item, index) =>
          typeof item !==
          (columns[index] === "transaction_index" ||
          table === "ai_calls" ||
          table === "eval_results"
            ? "number"
            : "string"),
      )
    )
      throw new Error();
    return value.values;
  } catch {
    throw new ApiError(400, "导出游标无效或不属于当前表");
  }
}
export const exportHandler: Handler<AppEnv> = async (c) => {
  const params = schemas.InternalPlatformExportTableParams.safeParse(c.req.param());
  const query = schemas.InternalPlatformExportTableQueryParams.safeParse(c.req.query());
  if (!params.success || !query.success) throw new ApiError(400, "导出参数不符合契约");
  const { table } = params.data;
  const { limit, cursor } = query.data;
  const columns = keys[table];
  const values = cursor === undefined ? [] : decode(cursor, table);
  const names = columns.map((column) => `"${column}"`).join(",");
  const where =
    cursor === undefined ? "" : ` WHERE (${names}) > (${values.map(() => "?").join(",")})`;
  const result = await c.env.DB.prepare(
    `SELECT * FROM "${table}"${where} ORDER BY ${names} LIMIT ?`,
  )
    .bind(...values, limit + 1)
    .all<Record<string, unknown>>();
  const items = result.results.slice(0, limit);
  const last = items.at(-1);
  const nextCursor =
    result.results.length > limit && last
      ? btoa(
          encodeURIComponent(
            JSON.stringify({ table, values: columns.map((column) => last[column]) }),
          ),
        )
      : null;
  return c.json({ table, items, nextCursor });
};
