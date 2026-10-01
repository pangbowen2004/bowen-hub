import { Buffer } from "node:buffer";
import type { AiCall, EvalResult, Run } from "@bowen-hub/contracts";
import { AiUsageSummary } from "@bowen-hub/contracts/zod";
import { MONTHLY_BUDGET_USD } from "../../lib/config.gen";
import { ApiError } from "../../lib/problem";
import * as repo from "./repo";
export const putDocument = repo.putDocument;
export const getDocument = repo.getDocument;
export const batchAiCalls = (binding: D1Database, calls: AiCall[]) =>
  repo.batchAiCalls(binding, calls);
export const batchEvalResults = (binding: D1Database, results: EvalResult[]) =>
  repo.batchEvalResults(binding, results);
export const listEvals = repo.listEvals;
export async function putRun(binding: D1Database, runId: string, run: Run): Promise<void> {
  if (run.id !== runId) throw new ApiError(400, "运行ID与路径不一致");
  await repo.putRun(binding, run);
}
function decodeCursor(cursor: string): { startedAt: string; id: string } {
  try {
    const value: unknown = JSON.parse(Buffer.from(cursor, "base64url").toString("utf8"));
    if (
      typeof value !== "object" ||
      value === null ||
      !("id" in value) ||
      !("startedAt" in value) ||
      typeof value.id !== "string" ||
      typeof value.startedAt !== "string"
    )
      throw new Error();
    return { id: value.id, startedAt: value.startedAt };
  } catch {
    throw new ApiError(400, "分页游标无效");
  }
}
export async function listRuns(binding: D1Database, limit: number, job?: string, cursor?: string) {
  const rows = await repo.listRuns(
    binding,
    limit + 1,
    job,
    cursor === undefined ? undefined : decodeCursor(cursor),
  );
  const items = rows.slice(0, limit);
  const last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > limit && last
        ? Buffer.from(JSON.stringify({ startedAt: last.startedAt, id: last.id }), "utf8").toString(
            "base64url",
          )
        : null,
  };
}
export async function getAiUsage(
  binding: D1Database,
  days: number,
  now = new Date().toISOString(),
) {
  const result = AiUsageSummary.safeParse({
    days,
    ...(await repo.getAiUsage(binding, days, now)),
    monthlyBudgetUsd: MONTHLY_BUDGET_USD,
  });
  // 有限输入的SQL求和仍可能溢出；明确失败，避免JSON把Infinity悄悄转成null。
  if (!result.success) throw new ApiError(422, "用量聚合结果超出契约可表示的数值范围");
  return result.data;
}
