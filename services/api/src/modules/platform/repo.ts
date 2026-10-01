import type { AiCall, AiUsageStats, EvalResult, Run } from "@bowen-hub/contracts";
import { and, desc, eq, lt, or } from "drizzle-orm";
import { aiCalls, documents, evalResults, runs } from "../../db/schema/domain";
import { database } from "../../lib/db";

export async function putDocument(
  binding: D1Database,
  key: string,
  payload: string,
): Promise<void> {
  const values = { key, payload, updatedAt: new Date().toISOString() };
  await database(binding)
    .insert(documents)
    .values(values)
    .onConflictDoUpdate({ target: documents.key, set: values });
}
export async function getDocument(binding: D1Database, key: string): Promise<string | null> {
  const [row] = await database(binding)
    .select({ payload: documents.payload })
    .from(documents)
    .where(eq(documents.key, key));
  return row?.payload ?? null;
}
export async function putRun(binding: D1Database, run: Run): Promise<void> {
  const values = {
    ...run,
    stats: JSON.stringify(run.stats),
    startedAt: new Date(run.startedAt).toISOString(),
    finishedAt: run.finishedAt === null ? null : new Date(run.finishedAt).toISOString(),
  };
  await database(binding)
    .insert(runs)
    .values(values)
    .onConflictDoUpdate({ target: runs.id, set: values });
}
export async function listRuns(
  binding: D1Database,
  limit: number,
  job?: string,
  cursor?: { startedAt: string; id: string },
): Promise<Run[]> {
  const filters = and(
    job === undefined ? undefined : eq(runs.job, job),
    cursor === undefined
      ? undefined
      : or(
          lt(runs.startedAt, cursor.startedAt),
          and(eq(runs.startedAt, cursor.startedAt), lt(runs.id, cursor.id)),
        ),
  );
  const rows = await database(binding)
    .select()
    .from(runs)
    .where(filters)
    .orderBy(desc(runs.startedAt), desc(runs.id))
    .limit(limit);
  return rows.map((row) => ({
    ...row,
    status: row.status as Run["status"],
    stats: JSON.parse(row.stats) as Run["stats"],
  }));
}
export async function batchAiCalls(binding: D1Database, calls: AiCall[]): Promise<void> {
  const db = database(binding);
  // 每条INSERT不超过D1的100个绑定变量；一次batch仍由D1事务提交。
  const statements = [];
  for (let offset = 0; offset < calls.length; offset += 10)
    statements.push(
      db
        .insert(aiCalls)
        .values(
          calls
            .slice(offset, offset + 10)
            .map((call) => ({ ...call, at: new Date(call.at).toISOString() })),
        ),
    );
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function batchEvalResults(binding: D1Database, results: EvalResult[]): Promise<void> {
  const db = database(binding);
  const statements = [];
  for (let offset = 0; offset < results.length; offset += 10)
    statements.push(
      db.insert(evalResults).values(
        results.slice(offset, offset + 10).map((result) => ({
          ...result,
          scores: JSON.stringify(result.scores),
          at: new Date(result.at).toISOString(),
        })),
      ),
    );
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function listEvals(binding: D1Database, capability?: string): Promise<EvalResult[]> {
  const rows = await database(binding)
    .select()
    .from(evalResults)
    .where(capability === undefined ? undefined : eq(evalResults.capability, capability))
    .orderBy(desc(evalResults.at), desc(evalResults.id));
  return rows.map(({ id: _id, costUsd, durationMs, ...row }) => ({
    ...row,
    scores: JSON.parse(row.scores) as EvalResult["scores"],
    ...(costUsd === null ? {} : { costUsd }),
    ...(durationMs === null ? {} : { durationMs }),
  }));
}
const STATS = `count(*) AS calls, coalesce(sum(CASE WHEN ok=0 THEN 1 ELSE 0 END),0) AS failedCalls, coalesce(sum(input_tokens),0) AS inputTokens, coalesce(sum(output_tokens),0) AS outputTokens, coalesce(sum(cost_usd),0) AS costUsd`;
/** 聚合在SQL内完成；按UTC+8分日，当前月费用独立于窗口。 */
export async function getAiUsage(binding: D1Database, days: number, now: string) {
  const where = "date(at, '+8 hours') BETWEEN date(?, '+8 hours', ?) AND date(?, '+8 hours')";
  const values = [now, `-${days - 1} days`, now];
  const results = await binding.batch([
    binding.prepare(`SELECT ${STATS} FROM ai_calls WHERE ${where}`).bind(...values),
    binding
      .prepare(
        `SELECT date(at, '+8 hours') AS date, ${STATS} FROM ai_calls WHERE ${where} GROUP BY date ORDER BY date`,
      )
      .bind(...values),
    binding
      .prepare(
        `SELECT capability, ${STATS} FROM ai_calls WHERE ${where} GROUP BY capability ORDER BY capability`,
      )
      .bind(...values),
    binding
      .prepare(
        "SELECT coalesce(sum(cost_usd),0) AS costUsd FROM ai_calls WHERE strftime('%Y-%m',at,'+8 hours')=strftime('%Y-%m',?,'+8 hours')",
      )
      .bind(now),
  ]);
  return {
    total: results[0]?.results[0] as unknown as AiUsageStats,
    byDay: results[1]?.results ?? [],
    byCapability: results[2]?.results ?? [],
    monthCostUsd: Number(
      (results[3]?.results[0] as { costUsd?: number } | undefined)?.costUsd ?? 0,
    ),
  };
}
