import { SELF } from "cloudflare:test";
import { env } from "cloudflare:workers";
import * as z from "@bowen-hub/contracts/zod";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import type { Bindings } from "../../src/lib/env";
import { getAiUsage, getDocument } from "../../src/modules/platform/service";
import { ROUTES } from "../../src/routes.gen";

beforeEach(async () => {
  await env.DB.batch(
    ["runs", "ai_calls", "eval_results", "documents"].map((table) =>
      env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});
const headers = { "Content-Type": "application/json", Authorization: "Bearer test-service-token" };
const request = (
  path: string,
  method = "GET",
  body?: unknown,
  bindings: Bindings = env,
  authorization = "Bearer test-service-token",
) =>
  app.request(
    `http://localhost${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(authorization ? { Authorization: authorization } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    bindings,
  );
const run = (id: string, startedAt = "2026-09-30T15:30:00Z", job = "news-morning") => ({
  id,
  job,
  date: "2026-09-30",
  status: "running",
  startedAt,
  finishedAt: null,
  stats: { articles: 2 },
  error: null,
});
const call = (at: string, costUsd: number, capability = "papers.qa", ok = true) => ({
  capability,
  version: 1,
  model: "fixture/fake",
  inputTokens: 10,
  outputTokens: 5,
  costUsd,
  durationMs: 20,
  ok,
  runId: null,
  at,
});
const evaluation = {
  capability: "papers.qa",
  model: "fixture/fake",
  datasetVersion: "v1",
  scores: { schema_valid: 1 },
  passed: true,
  at: "2026-09-30T10:00:00+08:00",
};

describe("平台接口与Worker入口", () => {
  it("实际Worker健康检查和请求ID", async () => {
    const response = await SELF.fetch("http://localhost/v1/health");
    expect(response.status).toBe(200);
    expect(z.Health.parse(await response.json())).toEqual({ status: "ok" });
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });
  it("运行记录PUT幂等，默认20条、分页与任务筛选", async () => {
    for (let i = 0; i < 23; i++)
      expect(
        (
          await request(
            `/v1/internal/runs/run-${String(i).padStart(2, "0")}`,
            "PUT",
            run(`run-${String(i).padStart(2, "0")}`),
          )
        ).status,
      ).toBe(204);
    expect(
      (
        await request("/v1/internal/runs/run-00", "PUT", {
          ...run("run-00"),
          status: "succeeded",
          finishedAt: "2026-09-30T16:00:00Z",
        })
      ).status,
    ).toBe(204);
    expect((await request("/v1/internal/runs/中文", "PUT", run("中文"))).status).toBe(204);
    const page = z.RunPage.parse(await (await request("/v1/runs")).json());
    expect(page.items).toHaveLength(20);
    expect(page.nextCursor).not.toBeNull();
    const one = z.RunPage.parse(await (await request("/v1/runs?limit=1")).json());
    expect(one.items[0]?.id).toBe("中文");
    expect(
      (await request(`/v1/runs?cursor=${encodeURIComponent(one.nextCursor ?? "")}`)).status,
    ).toBe(200);
    const next = z.RunPage.parse(
      await (await request(`/v1/runs?cursor=${encodeURIComponent(page.nextCursor ?? "")}`)).json(),
    );
    expect(next.items).toHaveLength(4);
    expect(next.nextCursor).toBeNull();
    expect(next.items.at(-1)?.status).toBe("succeeded");
    expect(z.RunPage.parse(await (await request("/v1/runs?job=absent")).json()).items).toEqual([]);
    for (const q of ["limit=0", "limit=101", "limit=1.5", "cursor=invalid"])
      expect((await request(`/v1/runs?${q}`)).status).toBe(400);
  });
  it("ID不一致、错误JSON和媒体类型返回problem", async () => {
    const response = await request("/v1/internal/runs/other", "PUT", run("wrong"));
    expect(response.status).toBe(400);
    expect(response.headers.get("content-type")).toContain("application/problem+json");
    expect(z.Problem.parse(await response.json()).status).toBe(400);
    expect(
      (
        await app.request(
          "http://localhost/v1/internal/runs/a",
          { method: "PUT", headers, body: "{" },
          env,
        )
      ).status,
    ).toBe(400);
    expect(
      (
        await app.request(
          "http://localhost/v1/internal/runs/a",
          {
            method: "PUT",
            headers: { Authorization: headers.Authorization, "Content-Type": "text/plain" },
            body: "{}",
          },
          env,
        )
      ).status,
    ).toBe(415);
  });
  it("通用文档原字段完整保留且覆盖写入", async () => {
    const doc = { schemaVersion: 1, stats: { paperCount: 2 }, unknownNested: { text: "中文" } };
    expect((await request("/v1/internal/documents/papers.catalog.public", "PUT", doc)).status).toBe(
      204,
    );
    expect(JSON.parse((await getDocument(env.DB, "papers.catalog.public")) ?? "null")).toEqual(doc);
    expect(
      (
        await request("/v1/internal/documents/papers.catalog.public", "PUT", {
          stats: { paperCount: 1 },
        })
      ).status,
    ).toBe(204);
    expect(JSON.parse((await getDocument(env.DB, "papers.catalog.public")) ?? "null")).toEqual({
      stats: { paperCount: 1 },
    });
    expect((await request("/v1/internal/documents/unknown", "PUT", doc)).status).toBe(400);
  });
  it("AI用量SQL聚合，UTC+8日/月边界和窗口外本月费用", async () => {
    const calls = [
      call("2026-09-30T15:59:59Z", 1),
      call("2026-09-30T16:00:00Z", 2, "news.us_rank", false),
      call("2026-10-02T15:00:00Z", 3),
      call("2026-10-01T00:00:00Z", 4),
    ];
    expect((await request("/v1/internal/ai-calls/batch", "POST", calls)).status).toBe(204);
    const data = z.AiUsageSummary.parse(await getAiUsage(env.DB, 1, "2026-10-02T16:00:00Z"));
    expect(data.days).toBe(1);
    expect(data.total.calls).toBe(0);
    expect(data.total.costUsd).toBe(0);
    expect(data.monthCostUsd).toBe(9);
    expect(data.monthlyBudgetUsd).toBe(20);
    const window = z.AiUsageSummary.parse(await getAiUsage(env.DB, 4, "2026-10-02T16:00:00Z"));
    expect(window.total.calls).toBe(4);
    expect(window.total.failedCalls).toBe(1);
    expect(window.total.inputTokens).toBe(40);
    expect(window.total.outputTokens).toBe(20);
    expect(window.byDay.map((x) => x.date)).toEqual(["2026-09-30", "2026-10-01", "2026-10-02"]);
    expect(window.byCapability).toHaveLength(2);
    const response = await request("/v1/ai/usage");
    expect(z.AiUsageSummary.parse(await response.json()).days).toBe(30);
    expect((await request("/v1/ai/usage?days=0")).status).toBe(400);
  });
  it("合法有限数值求和溢出时明确返回problem，不输出null成本", async () => {
    const at = new Date().toISOString();
    expect(
      (
        await request("/v1/internal/ai-calls/batch", "POST", [
          call(at, Number.MAX_VALUE),
          call(at, Number.MAX_VALUE),
        ])
      ).status,
    ).toBe(204);
    const response = await request("/v1/ai/usage");
    expect(response.status).toBe(422);
    expect(z.Problem.parse(await response.json()).detail).toContain("数值范围");
  });
  it("批量调用超过单次绑定变量数仍可写，空数组成功", async () => {
    expect(
      (
        await request(
          "/v1/internal/ai-calls/batch",
          "POST",
          Array.from({ length: 25 }, () => call("2026-09-30T00:00:00Z", 0)),
        )
      ).status,
    ).toBe(204);
    expect(
      (await env.DB.prepare("SELECT count(*) AS n FROM ai_calls").first<{ n: number }>())?.n,
    ).toBe(25);
    expect((await request("/v1/internal/ai-calls/batch", "POST", [])).status).toBe(204);
  });
  it("评测写入读取、按能力筛选和时间排序", async () => {
    expect(
      (
        await request("/v1/internal/evals/results/batch", "POST", [
          { ...evaluation, scores: { schema_valid: "1" } },
        ])
      ).status,
    ).toBe(400);
    expect(
      (
        await request("/v1/internal/evals/results/batch", "POST", [
          evaluation,
          {
            ...evaluation,
            capability: "news.brief",
            at: "2026-10-01T00:00:00Z",
            passed: false,
            costUsd: 0.1,
            durationMs: 50,
          },
        ])
      ).status,
    ).toBe(204);
    const list = z.PrivatePlatformListEvalsResponse.parse(
      await (await request("/v1/evals")).json(),
    );
    expect(list).toHaveLength(2);
    expect(list[0]?.capability).toBe("news.brief");
    expect(
      z.PrivatePlatformListEvalsResponse.parse(
        await (await request("/v1/evals?capability=papers.qa")).json(),
      ),
    ).toHaveLength(1);
  });
});

describe("鉴权分流", () => {
  it("错误/缺失令牌401，正确内部写和GET读，私有写403", async () => {
    expect(
      (await request("/v1/internal/runs/a", "PUT", run("a"), env, "Bearer wrong")).status,
    ).toBe(401);
    expect((await request("/v1/internal/runs/a", "PUT", run("a"), env, "")).status).toBe(401);
    expect((await request("/v1/internal/runs/a", "PUT", run("a"))).status).toBe(204);
    expect((await request("/v1/runs")).status).toBe(200);
    expect((await request("/v1/watchlist/AAPL", "PUT", {})).status).toBe(403);
  });
  it("线上会话占位始终401；服务令牌只可读GET，本地无令牌会话放行", async () => {
    const online = { ...env, APP_MODE: "production" };
    for (const route of ROUTES.filter(
      (r) =>
        !r.path.startsWith("/v1/internal/") &&
        !r.path.startsWith("/v1/public/") &&
        r.path !== "/v1/health",
    )) {
      const path = route.path.replace(/:[^/]+/g, "sample");
      expect(
        (await request(path, route.method, route.method === "GET" ? undefined : {}, online, ""))
          .status,
      ).toBe(401);
    }
    expect((await request("/v1/runs", "GET", undefined, online)).status).toBe(200);
    expect((await request("/v1/runs", "GET", undefined, env, "")).status).toBe(200);
    expect((await request("/v1/news/editions", "GET", undefined, env, "Bearer wrong")).status).toBe(
      401,
    );
  });
});

it("遍历完整OpenAPI，路由存在；未实现按x-task返回501", async () => {
  let count = 0;
  for (const [path, methods] of Object.entries(env.TEST_OPENAPI.paths))
    for (const [method, op] of Object.entries(methods)) {
      if (!["get", "post", "put", "patch", "delete"].includes(method)) continue;
      count++;
      const url = path.replace(/\{([^}]+)\}/g, (_m, key: string) => {
        const parameter = op.parameters?.find((p) => p.in === "path" && p.name === key);
        return key === "key"
          ? (z.DocumentKey.options[0] ?? "sample")
          : (parameter?.schema?.enum?.[0] ?? "sample");
      });
      let payload: unknown = {};
      if (op.operationId === "InternalPlatform_putRun") payload = run("sample");
      if (
        op.operationId === "InternalPlatform_batchAiCalls" ||
        op.operationId === "InternalPlatform_batchEvalResults"
      )
        payload = [];
      const response = await request(
        url,
        method.toUpperCase(),
        method === "get" ? undefined : payload,
        env,
        url.startsWith("/v1/internal/") || method === "get" ? "Bearer test-service-token" : "",
      );
      if (response.status === 501) {
        expect(op["x-task"], op.operationId).not.toBe("T02");
        expect(z.Problem.parse(await response.json()).detail).toBe(
          `未实现（任务 ${op["x-task"]}）`,
        );
      } else if (op["x-task"] === "T02") {
        expect([200, 204], op.operationId).toContain(response.status);
      } else {
        // 领域逐步接入后，空数据库或{}请求可以被明确拒绝；不能是漏接路由或内部错误。
        expect(response.status, op.operationId).toBeLessThan(500);
        expect(response.status, op.operationId).toBeGreaterThanOrEqual(200);
        if (response.status >= 400) {
          const error = z.Problem.parse(await response.json());
          expect(error.status).toBe(response.status);
          expect(error.detail, op.operationId).not.toBe("接口不存在");
        }
      }
    }
  expect(count).toBe(ROUTES.length);
});
