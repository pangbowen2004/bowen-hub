// 运维页的 MSW 样例：运行记录、AI 用量、数据源健康、能力清单与评测。
// 数据是确定的合成数据（不随当前时间变化），只用于页面预览与 Playwright 验收，不是线上运行结果。
import type {
  AiUsageDay,
  AiUsageSummary,
  CapabilityInfo,
  EvalResult,
  NewsSourceHealth,
  Run,
} from "@bowen-hub/contracts";
import { CapabilityInfo as CapabilitySchema } from "@bowen-hub/contracts/zod";
import { HttpResponse, http } from "msw";
import capabilityRaw from "../../../../../fixtures/samples/platform/CapabilityInfo.registry.json";

/** 样例场景：normal 正常；over-budget 本月费用超过预算；empty 什么记录都还没有。 */
type Scenario = "normal" | "over-budget" | "empty";
let scenario: Scenario = "normal";
// 地址参数 ?mock-fail=/v1/evals 让接口从页面加载起就失败（可重复）；运行中用 hub-mock-failure 事件开关。
const failedPaths = new Set<string>(new URLSearchParams(location.search).getAll("mock-fail"));
window.addEventListener("hub-mock-ops", (event) => {
  scenario = (event as CustomEvent<{ scenario: Scenario }>).detail.scenario;
});
// 与新闻样例相同的约定：按路径让接口返回失败，用来验收失败提示与重试。
window.addEventListener("hub-mock-failure", (event) => {
  const detail = (event as CustomEvent<{ path: string; enabled: boolean }>).detail;
  if (detail.enabled) failedPaths.add(detail.path);
  else failedPaths.delete(detail.path);
});
const problem = (detail: string, status = 500) =>
  HttpResponse.json({ type: "about:blank", title: detail, status, detail }, { status });
const failing = (request: Request) => failedPaths.has(new URL(request.url).pathname);

// ───────────── 运行记录 ─────────────

const addMinutes = (iso: string, minutes: number) =>
  new Date(Date.parse(iso) + minutes * 60_000).toISOString().replace(".000Z", "Z");
// 运行 ID 末尾是 GitHub 运行号；样例里按生成顺序递增即可。
let runNumber = 1287;
function run(
  job: string,
  date: string,
  startedAt: string,
  minutes: number | null,
  status: Run["status"],
  stats: Run["stats"],
  error: string | null = null,
): Run {
  return {
    id: `${job}-${date}-${runNumber++}`,
    job,
    date,
    status,
    startedAt,
    finishedAt: minutes === null ? null : addMinutes(startedAt, minutes),
    stats,
    error,
  };
}
const days = ["2026-10-03", "2026-10-02", "2026-10-01", "2026-09-30", "2026-09-29"] as const;
const previous = {
  "2026-10-03": "2026-10-02",
  "2026-10-02": "2026-10-01",
  "2026-10-01": "2026-09-30",
  "2026-09-30": "2026-09-29",
  "2026-09-29": "2026-09-28",
} as const;
const allRuns: Run[] = [
  run("papers-ingest", "2026-10-03", "2026-10-03T02:41:09Z", null, "running", {
    uploadId: "up_2026100302405871",
  }),
  ...days.flatMap((day, index): Run[] => [
    run("news-morning", day, `${previous[day]}T23:10:42Z`, 7, "succeeded", {
      articles: 186 - index * 3,
      filings: 9,
      insiderTrades: 3,
      calendarEvents: 7,
      aiCalls: 9,
      emailSent: true,
    }),
    run(
      "market-eod",
      day,
      `${day}T09:05:31Z`,
      day === "2026-09-30" ? 1 : 12,
      day === "2026-09-30" ? "failed" : "succeeded",
      day === "2026-09-30" ? {} : { sourcesChecked: 14, hypothesesSettled: 5, published: true },
      day === "2026-09-30"
        ? "核心表未就绪：已过 22:00 截止时间，daily 仍没有 2026-09-30 的数据"
        : null,
    ),
    run("data-export", day, `${day}T19:30:05Z`, 3, "succeeded", {
      tables: 22,
      rows: 14820 + index * 40,
    }),
    run("news-premarket", day, `${day}T12:40:12Z`, 5, "succeeded", {
      articles: 64,
      aiCalls: 6,
      emailSent: true,
    }),
  ]),
  run("news-weekly", "2026-09-26", "2026-09-26T01:10:03Z", 9, "succeeded", {
    articles: 640,
    aiCalls: 11,
    emailSent: true,
  }),
  run("evals-weekly", "2026-09-27", "2026-09-26T19:00:44Z", 18, "succeeded", {
    capabilities: 9,
    passed: 8,
    failed: 1,
    costUsd: 0.46,
  }),
  run("budget-alert", "2026-09-30", "2026-09-30T19:31:00Z", 0, "succeeded", {
    month: "2026-09",
    costUsd: 20.41,
    budgetUsd: 20,
  }),
  run(
    "papers-revise",
    "2026-09-28",
    "2026-09-28T04:02:19Z",
    2,
    "failed",
    { paperId: "arxiv-2505.07078", rounds: 2 },
    "修订后仍有 2 处证据页码越界，已保留上一版草稿",
  ),
].sort((a, b) => b.startedAt.localeCompare(a.startedAt) || b.id.localeCompare(a.id));

// ───────────── AI 用量 ─────────────

const capabilityWeights: [string, number][] = [
  ["news.ticker_digest", 0.24],
  ["news.us_rank", 0.14],
  ["news.edition_lede", 0.2],
  ["news.brief", 0.1],
  ["news.classify", 0.06],
  ["news.curate", 0.08],
  ["news.earnings_card", 0.06],
  ["news.filing_digest", 0.04],
  ["papers.qa", 0.08],
];
function usage(windowDays: number): AiUsageSummary {
  if (scenario === "empty")
    return {
      days: windowDays,
      total: { calls: 0, failedCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
      byDay: [],
      byCapability: [],
      monthCostUsd: 0,
      monthlyBudgetUsd: 20,
    };
  const byDay: AiUsageDay[] = [];
  for (let offset = windowDays - 1; offset >= 0; offset--) {
    // 每 6 天有一天没有调用：没有调用的日子不出现。
    if (offset % 6 === 5) continue;
    const date = new Date(Date.UTC(2026, 9, 3) - offset * 86_400_000).toISOString().slice(0, 10);
    const calls = 6 + ((offset * 7) % 9);
    byDay.push({
      date,
      calls,
      failedCalls: offset % 11 === 4 ? 1 : 0,
      inputTokens: calls * 5200,
      outputTokens: calls * 880,
      costUsd: Number((0.03 + ((offset * 37) % 17) / 400).toFixed(6)),
    });
  }
  const total = byDay.reduce(
    (sum, day) => ({
      calls: sum.calls + day.calls,
      failedCalls: sum.failedCalls + day.failedCalls,
      inputTokens: sum.inputTokens + day.inputTokens,
      outputTokens: sum.outputTokens + day.outputTokens,
      costUsd: sum.costUsd + day.costUsd,
    }),
    { calls: 0, failedCalls: 0, inputTokens: 0, outputTokens: 0, costUsd: 0 },
  );
  return {
    days: windowDays,
    total: { ...total, costUsd: Number(total.costUsd.toFixed(6)) },
    byDay,
    byCapability: capabilityWeights.map(([capability, weight]) => ({
      capability,
      calls: Math.round(total.calls * weight),
      failedCalls: capability === "news.us_rank" ? Math.min(total.failedCalls, 1) : 0,
      inputTokens: Math.round(total.inputTokens * weight),
      outputTokens: Math.round(total.outputTokens * weight),
      costUsd: Number((total.costUsd * weight).toFixed(6)),
    })),
    monthCostUsd: scenario === "over-budget" ? 21.3704 : 3.8412,
    monthlyBudgetUsd: 20,
  };
}

// ───────────── 数据源健康 ─────────────

const sources = (): NewsSourceHealth[] =>
  scenario === "empty"
    ? []
    : [
        { id: "rss-reuters", checkedAt: "2026-10-03T23:11:02Z", status: "ok", error: null },
        {
          id: "rss-ft",
          checkedAt: "2026-10-03T23:11:04Z",
          status: "failed",
          error: "HTTP 403：来源拒绝了请求（订阅墙或反爬）",
        },
        { id: "rss-techcrunch", checkedAt: "2026-10-03T23:11:05Z", status: "ok", error: null },
        { id: "rss-36kr", checkedAt: "2026-10-03T23:11:09Z", status: "ok", error: null },
        { id: "alpaca-news", checkedAt: "2026-10-03T23:11:12Z", status: "ok", error: null },
        { id: "sec-edgar", checkedAt: "2026-10-03T23:11:20Z", status: "ok", error: null },
        {
          id: "fred-calendar",
          checkedAt: "2026-10-03T23:11:21Z",
          status: "failed",
          error: "没有配置 FRED_API_KEY，宏观日程暂时缺失",
        },
        {
          id: "finnhub-earnings",
          checkedAt: "2026-10-03T23:11:22Z",
          status: "failed",
          error: "没有配置 FINNHUB_API_KEY，财报日历暂时缺失",
        },
      ];

// ───────────── 能力与评测 ─────────────

const baseCapabilities = CapabilitySchema.array().parse(capabilityRaw);
const weeks = ["2026-09-12", "2026-09-19", "2026-09-26", "2026-10-03"];
function evals(): EvalResult[] {
  if (scenario === "empty") return [];
  return baseCapabilities.flatMap((capability, index) => {
    // news.curate 还没评测过；两个“仅改动时评测”的能力各有一次。
    if (capability.id === "news.curate") return [];
    const dates = capability.evals.schedule === "on-change" ? [weeks[2] ?? ""] : weeks;
    return dates.map((date, step): EvalResult => {
      const failing = capability.id === "news.us_rank" && step === dates.length - 1;
      const scores = Object.fromEntries(
        Object.entries(capability.evals.thresholds).map(([name, threshold], position) => {
          const wobble = ((index + step + position) % 4) * 0.012;
          const value =
            failing && position === 0 ? threshold - 0.06 : Math.min(1, threshold + 0.03 + wobble);
          return [name, Number(value.toFixed(4))];
        }),
      );
      const withCost = capability.id !== "papers.review";
      return {
        capability: capability.id,
        model: capability.model,
        datasetVersion: capability.id === "papers.qa" ? "fc03b2dccc161c41" : "1",
        scores,
        passed: Object.entries(capability.evals.thresholds).every(
          ([name, threshold]) => (scores[name] ?? 0) >= threshold,
        ),
        at: `${date}T19:0${step}:12Z`,
        ...(withCost
          ? {
              costUsd: Number((0.02 + index * 0.005 + step * 0.002).toFixed(4)),
              durationMs: 120_000 + index * 9_000 + step * 4_000,
            }
          : {}),
      };
    });
  });
}
function capabilities(): CapabilityInfo[] {
  const all = evals();
  return baseCapabilities.map((capability) => ({
    ...capability,
    latestEval:
      all
        .filter((result) => result.capability === capability.id)
        .sort((a, b) => b.at.localeCompare(a.at))[0] ?? null,
  }));
}

export const opsHandlers = [
  http.get("/v1/runs", ({ request }) => {
    if (failing(request)) return problem("模拟读取失败");
    const search = new URL(request.url).searchParams;
    const job = search.get("job");
    const limit = Number(search.get("limit") ?? 20);
    const offset = Number(search.get("cursor") ?? 0);
    const rows = scenario === "empty" ? [] : allRuns.filter((row) => !job || row.job === job);
    return HttpResponse.json({
      items: rows.slice(offset, offset + limit),
      nextCursor: offset + limit < rows.length ? String(offset + limit) : null,
    });
  }),
  http.get("/v1/ai/usage", ({ request }) => {
    if (failing(request)) return problem("模拟读取失败");
    return HttpResponse.json(usage(Number(new URL(request.url).searchParams.get("days") ?? 30)));
  }),
  http.get("/v1/news/sources", ({ request }) =>
    failing(request) ? problem("模拟读取失败") : HttpResponse.json(sources()),
  ),
  http.get("/v1/capabilities", ({ request }) =>
    failing(request) ? problem("模拟读取失败") : HttpResponse.json(capabilities()),
  ),
  http.get("/v1/evals", ({ request }) => {
    if (failing(request)) return problem("模拟读取失败");
    const capability = new URL(request.url).searchParams.get("capability");
    return HttpResponse.json(
      evals()
        .filter((result) => !capability || result.capability === capability)
        .sort((a, b) => b.at.localeCompare(a.at)),
    );
  }),
];
