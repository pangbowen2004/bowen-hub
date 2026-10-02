// 真实Workers/D1覆盖17接口；样例只验证存取，不把手写指标当计算真值。
import { env } from "cloudflare:workers";
import type { Hypothesis, MarketDay, MarketDaySummary, MarketEvent } from "@bowen-hub/contracts";
import * as z from "@bowen-hub/contracts/zod";
import { beforeEach, expect, it } from "vitest";
import ledgerFixture from "../../../../fixtures/samples/markets/Hypothesis.ledger.json";
import barFixture from "../../../../fixtures/samples/markets/IndexBar.000001.sh.json";
import dayFixture from "../../../../fixtures/samples/markets/MarketDay.2026-08-28.json";
import summaryFixture from "../../../../fixtures/samples/markets/MarketDaySummary.2026-08-28.json";
import eventFixture from "../../../../fixtures/samples/markets/MarketEvent.calendar.json";
import referenceFixture from "../../../../fixtures/samples/markets/MarketReference.config.json";
import weeklyFixture from "../../../../fixtures/samples/markets/WeeklyReport.2026-08-28.json";
import { app } from "../../src/app";
import { tools } from "../../src/modules/markets/mcp";
import { handlers } from "../../src/modules/markets/routes";
import * as service from "../../src/modules/markets/service";
import { authenticatedCookie } from "../auth/fixture";

const dateAt = (n: number) => new Date(Date.UTC(2026, 7, n)).toISOString().slice(0, 10);
const day = (date = "2026-08-28"): MarketDay => ({ ...z.MarketDay.parse(dayFixture), date });
const summary = (date = "2026-08-28"): MarketDaySummary => ({
  ...z.MarketDaySummary.parse(summaryFixture),
  date,
});
const hypothesis = (id = "test", changes: Partial<Hypothesis> = {}): Hypothesis => ({
  ...z.Hypothesis.parse(ledgerFixture[0]),
  id,
  ...changes,
});
const event = (id = "evt"): MarketEvent => ({
  ...z.MarketEvent.parse(eventFixture[0]),
  id,
  startDate: "2026-08-01",
  endDate: "2026-09-30",
});
async function request(
  path: string,
  method = "GET",
  value?: unknown,
  privateWrite = false,
  token = true,
): Promise<Response> {
  return app.request(
    `http://localhost${path}`,
    {
      method,
      headers: {
        ...(value === undefined ? {} : { "Content-Type": "application/json" }),
        ...(privateWrite
          ? { Cookie: await authenticatedCookie(), Origin: "http://localhost" }
          : token
            ? { Authorization: "Bearer test-service-token" }
            : {}),
      },
      body: value === undefined ? undefined : JSON.stringify(value),
    },
    env,
  );
}
beforeEach(async () => {
  await env.DB.batch(
    [
      "market_days",
      "market_hypotheses",
      "market_weeklies",
      "market_events",
      "index_history",
      "documents",
    ].map((table) => env.DB.prepare(`DELETE FROM ${table}`)),
  );
});

it("17处理器全部登记，公开缺资源404且无私人鉴权要求", async () => {
  expect(Object.keys(handlers)).toHaveLength(17);
  for (const path of ["days/latest", "days/2026-08-28", "weeklies/2026-08-28", "reference"]) {
    const r = await request(`/v1/public/markets/${path}`, "GET", undefined, false, false);
    expect(r.status).toBe(404);
    expect(z.Problem.parse(await r.json()).status).toBe(404);
  }
  expect((await request("/v1/public/markets/days")).status).toBe(200);
});
it("day和summary一起覆盖、partial补齐、最新与稳定分页", async () => {
  for (let n = 1; n <= 21; n++)
    await service.putDay(env.DB, dateAt(n), { day: day(dateAt(n)), summary: summary(dateAt(n)) });
  let r = await request("/v1/public/markets/days");
  let page = z.MarketDaySummaryPage.parse(await r.json());
  expect(page.items).toHaveLength(20);
  expect(page.items[0]?.date).toBe(dateAt(21));
  expect(page.nextCursor).not.toBeNull();
  const second = z.MarketDaySummaryPage.parse(
    await (await request(`/v1/public/markets/days?cursor=${page.nextCursor}`)).json(),
  );
  expect(second.items.map((row) => row.date)).toEqual([dateAt(1)]);
  page = z.MarketDaySummaryPage.parse(
    await (await request(`/v1/public/markets/days?before=${dateAt(3)}&limit=100`)).json(),
  );
  expect(page.items.map((row) => row.date)).toEqual([dateAt(2), dateAt(1)]);
  const value = day();
  value.dataStatus = { complete: false, missing: ["moneyflow"] };
  value.moneyflow = null;
  expect(
    (
      await request("/v1/internal/markets/days/2026-08-28", "PUT", {
        day: value,
        summary: summary(),
      })
    ).status,
  ).toBe(204);
  r = await request("/v1/public/markets/days/latest");
  expect(z.MarketDay.parse(await r.json()).moneyflow).toBeNull();
  expect(
    (
      await request("/v1/internal/markets/days/2026-08-28", "PUT", {
        day: day(),
        summary: summary(),
      })
    ).status,
  ).toBe(204);
  expect(
    z.MarketDay.parse(await (await request("/v1/public/markets/days/2026-08-28")).json()),
  ).toEqual(day());
  expect(
    (
      await env.DB.prepare("SELECT count(*) AS n FROM market_days WHERE date='2026-08-28'").first<{
        n: number;
      }>()
    )?.n,
  ).toBe(1);
});
it("主键、版本、日期、媒体类型和游标错误安全拒绝", async () => {
  for (const body of [
    { day: day(), summary: summary("2026-08-27") },
    { day: { ...day(), schemaVersion: 2 }, summary: summary() },
  ])
    expect((await request("/v1/internal/markets/days/2026-08-28", "PUT", body)).status).toBe(400);
  for (const path of [
    "days?limit=101",
    "days?cursor=bad",
    "days/2026-02-30",
    "indices/a/bars?limit=251",
    "hypotheses?dateField=bad",
    "hypotheses?from=2026-08-28&to=2026-08-27",
  ]) {
    const r = await request(`/v1/public/markets/${path}`);
    expect(r.status).toBe(400);
    expect(z.Problem.parse(await r.json()).detail).not.toContain("Zod");
  }
  expect(
    (
      await app.request(
        "http://localhost/v1/internal/markets/hypotheses/batch",
        {
          method: "POST",
          headers: { Authorization: "Bearer test-service-token", "Content-Type": "text/plain" },
          body: "[]",
        },
        env,
      )
    ).status,
  ).toBe(415);
  expect(
    (
      await app.request(
        "http://localhost/v1/internal/markets/hypotheses/batch",
        {
          method: "POST",
          headers: {
            Authorization: "Bearer test-service-token",
            "Content-Type": "application/json",
          },
          body: "{",
        },
        env,
      )
    ).status,
  ).toBe(400);
});
it("账本批量超过单次D1查询容量、同日ID游标不丢记录、结果过滤", async () => {
  const rows = Array.from({ length: 121 }, (_, n) =>
    hypothesis(`h-${String(n).padStart(3, "0")}`, {
      result: "PENDING",
      settledOn: null,
      actual: null,
      createdOn: "2026-08-28",
      dueOn: "2026-08-31",
    }),
  );
  expect((await request("/v1/internal/markets/hypotheses/batch", "POST", rows)).status).toBe(204);
  const first = z.HypothesisPage.parse(
    await (await request("/v1/public/markets/hypotheses?limit=100&result=PENDING")).json(),
  );
  const second = z.HypothesisPage.parse(
    await (
      await request(
        `/v1/public/markets/hypotheses?limit=100&result=PENDING&cursor=${first.nextCursor}`,
      )
    ).json(),
  );
  expect(new Set([...first.items, ...second.items].map((row) => row.id)).size).toBe(121);
  expect(second.nextCursor).toBeNull();
  expect(
    z.HypothesisPage.parse(
      await (
        await request("/v1/public/markets/hypotheses?dateField=due&from=2026-08-31&to=2026-08-31")
      ).json(),
    ).items,
  ).toHaveLength(20);
  expect(
    z.HypothesisPage.parse(
      await (await request("/v1/public/markets/hypotheses?dateField=settled")).json(),
    ).items,
  ).toHaveLength(0);
});
it("结算原子保留：重跑PENDING或其他结论都不能改既有结算", async () => {
  const pending = hypothesis("same", { result: "PENDING", settledOn: null, actual: null });
  await service.putHypotheses(env.DB, [pending]);
  const settled = {
    ...pending,
    result: "NOT_CONFIRMED" as const,
    settledOn: "2026-08-28",
    resultNote: "保存的实际结算",
  };
  await service.putHypotheses(env.DB, [settled]);
  await service.putHypotheses(env.DB, [pending, { ...settled, result: "CONFIRMED" }]);
  expect((await service.hypotheses(env.DB, 20, {})).items).toEqual([settled]);
  expect(
    (
      await service.hypotheses(env.DB, 20, {
        dateField: "settled",
        from: "2026-08-28",
        to: "2026-08-28",
      })
    ).items,
  ).toEqual([settled]);
});
it("指数真实字段覆盖、最新250条按正向日期返回、旧不完整行422", async () => {
  const base = z.IndexBar.parse(barFixture[0]);
  const values = Array.from({ length: 260 }, (_, n) => ({
    ...base,
    date: new Date(Date.UTC(2025, 0, n + 1)).toISOString().slice(0, 10),
  }));
  expect((await request("/v1/internal/markets/indices/000001.SH/bars", "PUT", values)).status).toBe(
    204,
  );
  const rows = z.PublicMarketsListIndexBarsResponse.parse(
    await (await request("/v1/public/markets/indices/000001.SH/bars")).json(),
  );
  expect(rows).toEqual(values.slice(-250));
  await service.putIndexBars(env.DB, "000001.SH", [
    { ...z.IndexBar.parse(values.at(-1)), preClose: 123, return1d: -0.1 },
  ]);
  expect((await service.indexBars(env.DB, "000001.SH", 1))[0]).toMatchObject({
    preClose: 123,
    return1d: -0.1,
  });
  await env.DB.prepare(
    "INSERT INTO index_history(code,date,open,high,low,close) VALUES('old','2026-08-28',1,1,1,1)",
  ).run();
  const r = await request("/v1/public/markets/indices/old/bars");
  expect(r.status).toBe(422);
  expect(z.Problem.parse(await r.json()).detail).toContain("回补");
});
it("私有事件仅真实签名Cookie与Origin写，服务令牌不能替代会话", async () => {
  expect((await request("/v1/markets/events", "POST", event())).status).toBe(403);
  expect((await request("/v1/markets/events", "POST", event(), false, false)).status).toBe(401);
  expect(
    (await request("/v1/internal/markets/events/batch", "POST", [event()], false, false)).status,
  ).toBe(401);
  expect((await request("/v1/markets/events", "POST", event(), true)).status).toBe(200);
  const cookie = await authenticatedCookie();
  expect(
    (
      await app.request(
        "http://localhost/v1/markets/events/evt",
        { method: "DELETE", headers: { Cookie: cookie, Origin: "https://evil.test" } },
        env,
      )
    ).status,
  ).toBe(403);
  const modified = { ...event(), title: "修改标题" };
  expect(
    z.MarketEvent.parse(
      await (await request("/v1/markets/events/evt", "PUT", modified, true)).json(),
    ),
  ).toEqual(modified);
  expect((await request("/v1/markets/events/wrong", "PUT", event(), true)).status).toBe(400);
  expect((await request("/v1/markets/events/evt", "DELETE", undefined, true)).status).toBe(204);
  expect(await service.events(env.DB, "2026-08-01", "2026-08-31")).toEqual([]);
});
it("事件范围取重叠区间，批量覆盖不重复，不接受反向日期", async () => {
  expect(
    (
      await request("/v1/internal/markets/events/batch", "POST", [
        event(),
        { ...event("other"), startDate: "2026-10-01", endDate: "2026-10-02" },
      ])
    ).status,
  ).toBe(204);
  expect(
    z.PublicMarketsListEventsResponse.parse(
      await (await request("/v1/public/markets/events?from=2026-08-28&to=2026-08-28")).json(),
    ).map((row) => row.id),
  ).toEqual(["evt"]);
  await service.putEvents(env.DB, [event()]);
  expect(await service.events(env.DB, "2026-08-01", "2026-08-31")).toHaveLength(1);
  expect(
    (
      await request("/v1/internal/markets/events/batch", "POST", [
        { ...event(), endDate: "2026-07-31" },
      ])
    ).status,
  ).toBe(400);
});
it("周报与参考资料公开整块，摘要保持Research Error原口径", async () => {
  const report = z.WeeklyReport.parse(weeklyFixture);
  expect(
    (await request(`/v1/internal/markets/weeklies/${report.date}`, "PUT", report)).status,
  ).toBe(204);
  expect(
    z.WeeklyReport.parse(
      await (await request(`/v1/public/markets/weeklies/${report.date}`)).json(),
    ),
  ).toEqual(report);
  const summaries = z.PublicMarketsListWeekliesResponse.parse(
    await (await request("/v1/public/markets/weeklies")).json(),
  );
  expect(summaries[0]).toMatchObject({
    settledCount: report.settledCount,
    researchErrorCount: report.researchErrorCount,
    inconclusiveCount: report.inconclusiveCount,
  });
  expect((await request("/v1/internal/markets/weeklies/2026-08-27", "PUT", report)).status).toBe(
    400,
  );
  expect(
    (await request("/v1/internal/documents/markets.reference", "PUT", referenceFixture)).status,
  ).toBe(204);
  expect(
    z.MarketReference.parse(await (await request("/v1/public/markets/reference")).json()),
  ).toEqual(referenceFixture);
});
it("MCP工具与REST共用服务并保留账本分页", async () => {
  await service.putDay(env.DB, "2026-08-28", { day: day(), summary: summary() });
  expect(await tools[0]?.handler({ date: "2026-08-28" }, env)).toEqual(day());
  const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
  await service.putHypotheses(env.DB, [
    hypothesis("mcp", { createdOn: today, result: "PENDING", settledOn: null, actual: null }),
  ]);
  expect(await tools[1]?.handler({ status: "PENDING", days: 1 }, env)).toEqual(
    await service.hypotheses(env.DB, 100, { result: "PENDING", from: today }),
  );
});
