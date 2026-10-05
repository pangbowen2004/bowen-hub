// GET /v1/capabilities：构建时编进来的注册表 + 每个能力最近一次评测，响应满足生成契约。
import { env } from "cloudflare:workers";
import { registry } from "@bowen-hub/ai";
import type { EvalResult } from "@bowen-hub/contracts";
import * as z from "@bowen-hub/contracts/zod";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { listCapabilities, staticCapabilities } from "../../src/modules/platform/capabilities";
import { batchEvalResults } from "../../src/modules/platform/service";
import { authenticatedCookie } from "../auth/fixture";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM eval_results").run();
});
const get = (init: RequestInit = {}) =>
  app.request(`${env.AUTH_BASE_URL}/v1/capabilities`, init, env);
const evalResult = (changes: Partial<EvalResult> = {}): EvalResult => ({
  capability: "papers.qa",
  model: "openai/gpt-6-luna",
  datasetVersion: "fc03b2dccc161c41",
  scores: { schema_valid: 1, judge_faithful: 0.9936 },
  passed: true,
  at: "2026-10-02T12:00:00.000Z",
  ...changes,
});

describe("能力清单", () => {
  it("docs/10 第 3 节的 11 个能力全部在清单里，字段取自清单文件与模型登记表", () => {
    const list = staticCapabilities();
    expect(list.map((item) => item.id)).toEqual(
      [
        "news.brief",
        "news.classify",
        "news.curate",
        "news.earnings_card",
        "news.edition_lede",
        "news.filing_digest",
        "news.ticker_digest",
        "news.us_rank",
        "papers.author",
        "papers.qa",
        "papers.review",
      ].sort(),
    );
    expect(list).toHaveLength(Object.keys(registry.capabilities).length);
    for (const item of list) {
      const tier = registry.llm.tiers[item.tier];
      expect(item.model, item.id).toBe(tier?.model);
      expect(item.reasoning, item.id).toBe(tier?.reasoning);
      expect(item.evals.thresholds, item.id).toEqual(
        registry.capabilities[item.id]?.evals.thresholds,
      );
      expect(["weekly", "on-change"], item.id).toContain(item.evals.schedule);
    }
    // docs/10：papers.author、papers.review 单次评测较贵，只在改动时跑；其余参加每周评测。
    const schedule = Object.fromEntries(list.map((item) => [item.id, item.evals.schedule]));
    expect(schedule["papers.author"]).toBe("on-change");
    expect(schedule["papers.review"]).toBe("on-change");
    expect(schedule["papers.qa"]).toBe("weekly");
    // 只有 papers.qa 在 TypeScript 一端运行。
    expect(list.filter((item) => item.runtime === "typescript").map((item) => item.id)).toEqual([
      "papers.qa",
    ]);
  });
  it("还没有评测时 latestEval 为 null，响应逐项满足生成契约", async () => {
    const response = await get({ headers: { Authorization: "Bearer test-service-token" } });
    expect(response.status).toBe(200);
    const body = z.CapabilityInfo.array().parse(await response.json());
    expect(body).toHaveLength(11);
    expect(body.every((item) => item.latestEval === null)).toBe(true);
  });
  it("每个能力只带最近一次评测：按评测时间，同一时间取后写入的；缺费用和耗时时不出现该字段", async () => {
    await batchEvalResults(env.DB, [
      evalResult({ at: "2026-09-20T12:00:00.000Z", passed: false, scores: { schema_valid: 0.5 } }),
      evalResult({ at: "2026-10-02T12:00:00.000Z", costUsd: 0.188, durationMs: 496106 }),
      evalResult({ at: "2026-10-02T12:00:00.000Z", scores: { schema_valid: 0.97 } }),
      // 补写进来的旧结果不会盖过更新的评测。
      evalResult({ at: "2026-08-01T12:00:00.000Z", scores: { schema_valid: 0.1 } }),
      evalResult({ capability: "news.brief", model: "openai/gpt-6-luna", passed: false }),
      // 清单里已经没有的能力不出现在响应里。
      evalResult({ capability: "news.removed" }),
    ]);
    const list = await listCapabilities(env.DB);
    const qa = list.find((item) => item.id === "papers.qa")?.latestEval;
    expect(qa).toEqual(evalResult({ scores: { schema_valid: 0.97 } }));
    expect(qa).not.toHaveProperty("costUsd");
    expect(list.find((item) => item.id === "news.brief")?.latestEval?.passed).toBe(false);
    expect(list.find((item) => item.id === "news.classify")?.latestEval).toBeNull();
    expect(list.some((item) => item.id === "news.removed")).toBe(false);
    // 费用与耗时存在时原样带出。
    await batchEvalResults(env.DB, [
      evalResult({ at: "2026-10-03T12:00:00.000Z", costUsd: 0.188, durationMs: 496106 }),
    ]);
    expect(
      (await listCapabilities(env.DB)).find((item) => item.id === "papers.qa")?.latestEval,
    ).toMatchObject({ costUsd: 0.188, durationMs: 496106 });
  });
});

describe("鉴权", () => {
  it("未登录 401；服务令牌和已登录会话都可以读", async () => {
    expect((await get()).status).toBe(401);
    expect((await get({ headers: { Authorization: "Bearer wrong" } })).status).toBe(401);
    expect((await get({ headers: { Authorization: "Bearer test-service-token" } })).status).toBe(
      200,
    );
    expect((await get({ headers: { Cookie: await authenticatedCookie() } })).status).toBe(200);
  });
});
