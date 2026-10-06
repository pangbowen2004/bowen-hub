import { env } from "cloudflare:workers";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { checkClock, dueJobs, observeProduction } from "../src/lib/cloud-clock";
import type { Bindings } from "../src/lib/env";

const bindings = {
  ...env,
  GITHUB_REPO: "test/hub",
  GH_AUTOMATION_TOKEN: "offline-token",
} as unknown as Bindings;
const now = (time: string) => new Date(`2026-10-06T${time}:00+08:00`);
beforeEach(async () => {
  await env.DB.prepare(
    "DELETE FROM documents WHERE key LIKE 'clock:%' OR key LIKE 'clock-daily:%' OR key LIKE 'production-observation:%'",
  ).run();
  await env.DB.prepare("DELETE FROM editions WHERE date='2026-10-06'").run();
  await env.DB.prepare("DELETE FROM runs WHERE id='clock-test-export'").run();
  await env.DB.prepare(
    "INSERT INTO runs(id,job,date,status,started_at,stats) VALUES('clock-test-export','data-export','2026-10-06','succeeded','2026-10-05T19:30:00Z','{}')",
  ).run();
});
it("派发前恢复被停用的业务工作流并通知，不触碰评测任务", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ state: "disabled_inactivity" }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }))
    .mockResolvedValueOnce(Response.json({ workflow_runs: [] }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  const notify = vi.fn();
  await checkClock(bindings, now("07:10"), notify);
  expect(fetch.mock.calls[1]?.[1]?.method).toBe("PUT");
  expect(fetch.mock.calls[1]?.[0]).toContain("news-morning.yml/enable");
  expect(notify).toHaveBeenCalledTimes(1);
  expect(fetch.mock.calls.flat().join(" ")).not.toContain("evals-weekly");
});
it("真实上线观察一天内失败只通知一次，恢复不抹去故障记录", async () => {
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 503 })));
  const notify = vi.fn();
  const live = { ...bindings, OBSERVATION_STARTED_ON: "2026-10-06" };
  await observeProduction(live, now("09:00"), notify);
  vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response(null, { status: 200 })));
  await observeProduction(live, now("10:00"), notify);
  expect(notify).toHaveBeenCalledTimes(1);
  const row = await env.DB.prepare(
    "SELECT payload FROM documents WHERE key='production-observation:2026-10-06'",
  ).first<{ payload: string }>();
  expect(JSON.parse(row?.payload || "{}").problems).toHaveLength(2);
});
afterEach(() => vi.unstubAllGlobals());
it("依据真实交易日与夏令时选择任务，不把A股休市当工作日", () => {
  expect(dueJobs(now("07:09")).some((x) => x.name === "news-morning")).toBe(false);
  expect(dueJobs(now("20:44")).some((x) => x.name === "news-premarket")).toBe(false);
  expect(dueJobs(now("20:45")).some((x) => x.name === "news-premarket")).toBe(true);
  expect(dueJobs(now("18:00")).some((x) => x.name === "market-eod")).toBe(false);
  expect(dueJobs(new Date("2026-10-08T17:10:00+08:00")).some((x) => x.name === "market-eod")).toBe(
    true,
  );
  expect(
    dueJobs(new Date("2026-11-03T21:40:00+08:00")).some((x) => x.name === "news-premarket"),
  ).toBe(false);
});
it("缺产出派发一次，无force，10分钟后的检查不重复派发", async () => {
  const fetch = vi
    .fn()
    .mockResolvedValueOnce(Response.json({ state: "active" }))
    .mockResolvedValueOnce(Response.json({ workflow_runs: [] }))
    .mockResolvedValueOnce(new Response(null, { status: 204 }));
  vi.stubGlobal("fetch", fetch);
  const notify = vi.fn();
  await checkClock(bindings, now("07:10"), notify);
  await checkClock(bindings, now("07:20"), notify);
  expect(fetch).toHaveBeenCalledTimes(3);
  expect(JSON.parse(fetch.mock.calls[2]?.[1]?.body)).toEqual({
    ref: "main",
    inputs: { date: "2026-10-06", force: "false" },
  });
  expect(notify).not.toHaveBeenCalled();
});
it("已发送就跳过，不把仅生成无邮件的版次当成功", async () => {
  await env.DB.prepare(
    "INSERT INTO editions(id,kind,date,payload,email_sent_at) VALUES('clock-test','morning','2026-10-06','{}','2026-10-05T23:20:00Z')",
  ).run();
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  await checkClock(bindings, now("07:30"), vi.fn());
  expect(fetch).not.toHaveBeenCalled();
});
it("超时只告警一次，不强制派发；晚成功保留超时记录", async () => {
  const fetch = vi.fn();
  vi.stubGlobal("fetch", fetch);
  const notify = vi.fn().mockResolvedValue(undefined);
  await checkClock(bindings, now("08:00"), notify);
  await checkClock(bindings, now("08:10"), notify);
  expect(notify).toHaveBeenCalledTimes(1);
  expect(fetch).not.toHaveBeenCalled();
  await env.DB.prepare(
    "INSERT INTO editions(id,kind,date,payload,email_sent_at) VALUES('clock-test','morning','2026-10-06','{}','2026-10-06T00:15:00Z')",
  ).run();
  await checkClock(bindings, now("08:20"), notify);
  const row = await env.DB.prepare(
    "SELECT payload FROM documents WHERE key='clock:news-morning:2026-10-06'",
  ).first<{ payload: string }>();
  expect(JSON.parse(row?.payload || "{}").failedAt).toBeTruthy();
  expect(notify).toHaveBeenCalledTimes(1);
});
