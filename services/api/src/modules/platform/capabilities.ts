// GET /v1/capabilities：能力清单（packages/ai 构建时编进来的注册表，Worker 不读文件）
// + 每个能力最近一次评测结果（eval_results）。docs/08 第 5.1 节、docs/10 第 3、7 节。
import { registry } from "@bowen-hub/ai";
import type { CapabilityInfo, EvalResult } from "@bowen-hub/contracts";
import { CapabilityInfo as CapabilityInfoSchema } from "@bowen-hub/contracts/zod";
import type { Handler } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../lib/env";
import { ApiError } from "../../lib/problem";

type StaticInfo = Omit<CapabilityInfo, "latestEval">;

/** 清单与档位映射在构建时就定了，每个实例只整理一次。 */
let cached: StaticInfo[] | undefined;
export function staticCapabilities(): StaticInfo[] {
  cached ??= Object.values(registry.capabilities)
    .map((capability): StaticInfo => {
      const tier = registry.llm.tiers[capability.tier];
      if (!tier) throw new Error(`能力 ${capability.id} 的档位 ${capability.tier} 没有登记模型`);
      return {
        id: capability.id,
        version: capability.version,
        summary: capability.summary,
        owner: capability.owner,
        runtime: capability.runtime,
        tier: capability.tier,
        model: tier.model,
        reasoning: tier.reasoning as StaticInfo["reasoning"],
        autonomy: capability.autonomy,
        prompt: capability.prompt,
        io: capability.io,
        limits: capability.limits,
        checks: capability.checks,
        fallback: capability.fallback,
        params: capability.params ?? {},
        evals: {
          dataset: capability.evals.dataset,
          // 清单没写时为 weekly（docs/10 第 3 节）。
          schedule: capability.evals.schedule === "on-change" ? "on-change" : "weekly",
          thresholds: capability.evals.thresholds,
        },
      };
    })
    .sort((a, b) => a.id.localeCompare(b.id, "en"));
  return cached;
}

interface EvalRow {
  capability: string;
  model: string;
  datasetVersion: string;
  scores: string;
  passed: number;
  at: string;
  costUsd: number | null;
  durationMs: number | null;
}

/** 每个能力按评测时间（再按写入顺序）取最近一条；窗口函数在 D1 内完成，不把全部历史读进 Worker。 */
export async function latestEvals(db: D1Database): Promise<Map<string, EvalResult>> {
  const { results } = await db
    .prepare(
      `SELECT capability, model, dataset_version AS datasetVersion, scores, passed, at,
              cost_usd AS costUsd, duration_ms AS durationMs
       FROM (
         SELECT *, row_number() OVER (PARTITION BY capability ORDER BY at DESC, id DESC) AS rank
         FROM eval_results
       )
       WHERE rank = 1`,
    )
    .all<EvalRow>();
  return new Map(
    results.map((row) => [
      row.capability,
      {
        capability: row.capability,
        model: row.model,
        datasetVersion: row.datasetVersion,
        scores: JSON.parse(row.scores) as EvalResult["scores"],
        passed: Boolean(row.passed),
        at: row.at,
        ...(row.costUsd === null ? {} : { costUsd: row.costUsd }),
        ...(row.durationMs === null ? {} : { durationMs: row.durationMs }),
      },
    ]),
  );
}

export async function listCapabilities(db: D1Database): Promise<CapabilityInfo[]> {
  const latest = await latestEvals(db);
  const result = z.array(CapabilityInfoSchema).safeParse(
    staticCapabilities().map((capability) => ({
      ...capability,
      latestEval: latest.get(capability.id) ?? null,
    })),
  );
  // 注册表来自构建、评测结果来自已校验的写入；仍对不上契约就明确失败，不拼凑一份看似正常的清单。
  if (!result.success) throw new ApiError(500, "能力清单不符合契约");
  return result.data;
}

export const capabilitiesHandler: Handler<AppEnv> = async (c) =>
  c.json(await listCapabilities(c.env.DB));
