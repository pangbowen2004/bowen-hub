import { env } from "cloudflare:workers";
import type {
  Article,
  CalendarEvent,
  EarningsCard,
  Edition,
  Filing,
  InsiderTrade,
} from "@bowen-hub/contracts";
import * as schemas from "@bowen-hub/contracts/zod";
import { beforeEach, expect, it } from "vitest";
import { app } from "../../src/app";
import { tools } from "../../src/modules/news/mcp";
import * as service from "../../src/modules/news/service";
import * as watchlistRepo from "../../src/modules/watchlist/repo";
import { authenticatedCookie } from "../auth/fixture";

const now = new Date().toISOString();
const day = now.slice(0, 10);
const edition = (id = "morning-1", kind: Edition["kind"] = "morning", date = day): Edition => ({
  id,
  kind,
  date,
  window: { fromAt: null, toAt: null },
  generatedAt: now,
  lede: null,
  sections: [],
  sources: [],
  aiUsage: null,
  email: null,
});
const article = (id = "a", overrides: Partial<Article> = {}): Article => ({
  id,
  sourceId: "rss",
  kind: "news",
  title: "Nvidia earnings report",
  summary: "chips sales",
  url: `https://news.example/${id}`,
  publishedAt: now,
  lang: "en",
  tickers: ["NVDA"],
  topics: [],
  paywall: "none",
  clusterId: null,
  ...overrides,
});
const filing: Filing = {
  accession: "0001-26-001",
  cik: "0001",
  ticker: "NVDA",
  form: "8-K",
  filedAt: now,
  items: ["2.02"],
  url: "https://sec.example/filing",
  exhibits: [],
};
const insider: InsiderTrade = {
  accession: "0001-26-002",
  transactionIndex: 0,
  ticker: "NVDA",
  insider: "Fixture Person",
  role: "director",
  code: "S",
  shares: 10,
  priceUsd: 20,
  valueUsd: 200,
  filedAt: now,
  url: "https://sec.example/insider",
};
const earnings: EarningsCard = {
  symbol: "NVDA",
  period: "2026Q3",
  figures: [],
  guidance: null,
  takeaway: "fixture",
  sourceUrl: "https://sec.example/earnings",
  sourceAccession: "0001-26-003",
  publishedAt: now,
  generatedBy: null,
};
const request = async (path: string, method = "GET", data?: unknown, token?: string) =>
  app.request(
    `http://localhost${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        Origin: env.AUTH_BASE_URL,
        ...(!token ? { Cookie: await authenticatedCookie() } : {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    },
    env,
  );
const internal = (path: string, method: string, data: unknown) =>
  request(`/v1/internal/news/${path}`, method, data, "test-service-token");
beforeEach(async () => {
  for (const table of [
    "edition_feedback",
    "editions",
    "articles",
    "filings",
    "insider_trades",
    "calendar_events",
    "earnings_cards",
    "news_sources",
  ])
    await env.DB.prepare(`DELETE FROM ${table}`).run();
});

it("私有月历按日期读，不公开名单，隐藏停用股票与ETF的财报", async () => {
  await env.DB.prepare("DELETE FROM watch_items").run();
  await watchlistRepo.putMany(env.DB, [
    {
      symbol: "NVDA",
      name: "英伟达",
      kind: "stock",
      group: "测试",
      active: true,
      aliases: [],
      underlying: null,
      sectorEtf: null,
    },
    {
      symbol: "AAPL",
      name: "苹果",
      kind: "stock",
      group: "测试",
      active: false,
      aliases: [],
      underlying: null,
      sectorEtf: null,
    },
    {
      symbol: "SOXX",
      name: "半导体ETF",
      kind: "etf",
      group: "测试",
      active: true,
      aliases: [],
      underlying: null,
      sectorEtf: null,
    },
  ]);
  const calendar: CalendarEvent[] = [
    ...["NVDA", "AAPL", "SOXX"].map(
      (symbol): CalendarEvent => ({
        kind: "earnings",
        date: "2026-10-29",
        title: symbol,
        tickers: [symbol],
        fredReleaseId: null,
        at: null,
        timing: null,
        importance: "unspecified",
      }),
    ),
    {
      kind: "macro",
      date: "2026-10-14",
      title: "美国 CPI",
      tickers: [],
      fredReleaseId: 10,
      at: "2026-10-14T12:30:00Z",
      timing: "08:30",
      importance: "high",
    },
    {
      kind: "macro",
      date: "2026-11-10",
      title: "美国 CPI",
      tickers: [],
      fredReleaseId: 10,
      at: "2026-11-10T13:30:00Z",
      timing: "08:30",
      importance: "high",
    },
  ];
  expect((await internal("calendar/batch", "POST", calendar)).status).toBe(204);
  const path = "/v1/calendar/events?from=2026-10-01&to=2026-10-31";
  const response = schemas.CalendarEvent.array().parse(await (await request(path)).json());
  expect(response.map((event) => event.title)).toEqual(["美国 CPI", "NVDA"]);
  expect((await request("/v1/calendar/events?from=2026-11-01&to=2026-10-01")).status).toBe(400);
  expect((await request("/v1/calendar/events?from=bad&to=2026-10-01")).status).toBe(400);
  expect((await app.request(`http://localhost${path}`, {}, env)).status).toBe(401);
});

it("期次覆盖写入、同日稳定游标分页、版次筛选及旧存档null时间", async () => {
  for (const e of [
    edition("a"),
    edition("b"),
    edition("c", "weekly"),
    { ...edition("legacy", "legacy", "2026-08-31"), generatedAt: null },
  ])
    expect((await internal(`editions/${e.id}`, "PUT", e)).status).toBe(204);
  const page = schemas.EditionPage.parse(await (await request("/v1/news/editions?limit=2")).json());
  expect(page.items.map((x) => x.id)).toEqual(["c", "b"]);
  expect(page.nextCursor).not.toBeNull();
  const next = schemas.EditionPage.parse(
    await (
      await request(`/v1/news/editions?limit=2&cursor=${encodeURIComponent(page.nextCursor!)}`)
    ).json(),
  );
  expect(next.items.map((x) => x.id)).toEqual(["a", "legacy"]);
  expect(next.nextCursor).toBeNull();
  expect(next.items[1]?.generatedAt).toBeNull();
  const changed = { ...edition("a"), email: { sentAt: now } };
  expect((await internal("editions/a", "PUT", changed)).status).toBe(204);
  expect(schemas.Edition.parse(await (await request("/v1/news/editions/a")).json())).toEqual(
    changed,
  );
  expect(
    schemas.EditionPage.parse(
      await (await request("/v1/news/editions?kind=morning")).json(),
    ).items.map((x) => x.id),
  ).toEqual(["b", "a"]);
  for (const query of ["limit=0", "limit=101", "cursor=invalid", "kind=bad"])
    expect((await request(`/v1/news/editions?${query}`)).status).toBe(400);
  expect((await request("/v1/news/editions/missing")).status).toBe(404);
  expect((await internal("editions/wrong", "PUT", edition())).status).toBe(400);
});

it("HTML存档R2流读取和404，并且内容保持原样", async () => {
  await internal("editions/a", "PUT", edition("a"));
  expect((await request("/v1/news/editions/a/html")).status).toBe(404);
  const html = "<!doctype html><p>中文 &amp; archival</p>";
  const put = await app.request(
    "http://localhost/v1/internal/news/editions/a/html",
    {
      method: "PUT",
      headers: {
        Authorization: "Bearer test-service-token",
        "Content-Type": "text/html",
        "Content-Length": String(new TextEncoder().encode(html).length),
      },
      body: html,
    },
    env,
  );
  expect(put.status).toBe(204);
  const response = await request("/v1/news/editions/a/html");
  expect(response.status).toBe(200);
  expect(response.headers.get("content-type")).toBe("text/html; charset=utf-8");
  expect(response.headers.get("etag")).toBeTruthy();
  expect(await response.text()).toBe(html);
  expect((await request("/v1/news/editions/missing/html")).status).toBe(404);
});

it("评分与条目反馈契约、范围过滤，服务令牌不能执行私有写", async () => {
  await internal("editions/a", "PUT", edition("a"));
  const rated = await request("/v1/news/editions/a/feedback", "POST", { score: 5 });
  expect(rated.status).toBe(200);
  expect(schemas.EditionFeedback.parse(await rated.json()).score).toBe(5);
  const flagged = await request("/v1/news/feedback/items", "POST", {
    editionId: "a",
    itemId: "article-a",
    reason: "incorrect",
  });
  expect(flagged.status).toBe(200);
  expect(schemas.ItemFeedback.parse(await flagged.json()).reason).toBe("incorrect");
  for (const score of [0, 6, 1.5])
    expect((await request("/v1/news/editions/a/feedback", "POST", { score })).status).toBe(400);
  expect(
    (await request("/v1/news/editions/a/feedback", "POST", { score: 3 }, "test-service-token"))
      .status,
  ).toBe(403);
  expect((await request("/v1/news/editions/missing/feedback", "POST", { score: 3 })).status).toBe(
    404,
  );
  const feedback = await (await request("/v1/news/feedback")).json();
  expect(schemas.Feedback.array().parse(feedback)).toHaveLength(2);
  expect(await (await request("/v1/news/feedback?since=2099-01-01T00%3A00%3A00Z")).json()).toEqual(
    [],
  );
});

it("批量文章自然键规范化、Alpaca ID去重、FTS更新和精确ticker筛选", async () => {
  const items = Array.from({ length: 40 }, (_, i) => article(`a${i}`));
  expect((await internal("articles/batch", "POST", items)).status).toBe(204);
  await internal("articles/batch", "POST", [
    article("replacement", {
      url: "http://NEWS.EXAMPLE/a0/?utm_source=mail#top",
      title: "Revised dividend announcement",
    }),
  ]);
  expect((await env.DB.prepare("SELECT count(*) n FROM articles").first<{ n: number }>())?.n).toBe(
    40,
  );
  expect((await service.search(env.DB, "Nvidia", "NVDA", 30)).length).toBe(39);
  expect((await service.search(env.DB, "Revised", "NVDA", 30))[0]?.id).toBe("replacement");
  await internal("articles/batch", "POST", [
    article("alpaca-1", { sourceId: "alpaca-news", url: "https://same.example/path" }),
    article("alpaca-2", {
      sourceId: "alpaca-news",
      url: "https://same.example/path",
      tickers: ["NVDAX"],
    }),
  ]);
  expect((await service.search(env.DB, "Nvidia", "NVDA", 30)).length).toBe(40);
  expect((await service.search(env.DB, "Nvidia", "NVDAX", 30)).length).toBe(1);
  expect(await service.search(env.DB, '" OR *', "NVDA", 30)).toEqual([]);
  expect((await request("/v1/news/articles/search?q=%00")).status).toBe(400);
  const response = await request("/v1/news/articles/search?q=Nvidia&ticker=NVDA&days=30");
  expect(schemas.Article.array().parse(await response.json())).toHaveLength(40);
  expect((await request("/v1/news/articles/search?q=Nvidia&days=1e20")).status).toBe(400);
});

it("按UTC日界清理文章，同时清理FTS且保留边界", async () => {
  await internal("articles/batch", "POST", [
    article("old", { publishedAt: "2026-08-30T23:59:59Z" }),
    article("keep", { publishedAt: "2026-08-31T00:00:00Z" }),
  ]);
  expect((await internal("articles/prune?before=2026-08-31", "POST", undefined)).status).toBe(204);
  expect(
    (await env.DB.prepare("SELECT id FROM articles").all<{ id: string }>()).results.map(
      (x) => x.id,
    ),
  ).toEqual(["keep"]);
  expect(await service.search(env.DB, "Nvidia", undefined, 60, "2026-09-01T00:00:00Z")).toEqual([
    article("keep", { publishedAt: "2026-08-31T00:00:00Z" }),
  ]);
});

it("公告、内部人和财报幂等自然键，完整时间线向前兼容旧接口", async () => {
  await internal("articles/batch", "POST", [article()]);
  for (let i = 0; i < 2; i++) {
    expect((await internal("filings/batch", "POST", [filing])).status).toBe(204);
    expect(
      (
        await internal("insider-trades/batch", "POST", [
          insider,
          { ...insider, transactionIndex: 1 },
        ])
      ).status,
    ).toBe(204);
    expect((await internal("earnings-cards/batch", "POST", [earnings])).status).toBe(204);
  }
  const old = schemas.NewsTimelineItem.array().parse(
    await (await request("/v1/news/tickers/NVDA/timeline")).json(),
  );
  expect(old.map((x) => x.kind).sort()).toEqual(["article", "earnings", "filing"]);
  const full = schemas.NewsFullTimelineItem.array().parse(
    await (await request("/v1/news/tickers/NVDA/timeline/full")).json(),
  );
  expect(full).toHaveLength(5);
  expect(full.filter((x) => x.kind === "insider")).toHaveLength(2);
  expect(await (await request("/v1/news/tickers/NVDAX/timeline/full")).json()).toEqual([]);
  await service.putArticles(env.DB, [
    article("outside", { publishedAt: "2026-01-01T00:00:00Z" }),
    article("future", { publishedAt: "2099-01-01T00:00:00Z" }),
  ]);
  expect(await service.fullTimeline(env.DB, "NVDA", 30)).toHaveLength(5);
});

it("日程使用三种自然键，来源健康覆盖写入且路径ID严格一致", async () => {
  const base: CalendarEvent = {
    kind: "macro",
    date: day,
    fredReleaseId: 10,
    at: null,
    title: "CPI",
    tickers: [],
    timing: null,
    importance: "high",
  };
  const calendar = [
    base,
    { ...base, kind: "fomc" as const, fredReleaseId: null },
    { ...base, kind: "earnings" as const, fredReleaseId: null, tickers: ["NVDA", "AAPL", "NVDA"] },
  ];
  for (let i = 0; i < 2; i++)
    expect((await internal("calendar/batch", "POST", calendar)).status).toBe(204);
  expect(
    (await env.DB.prepare("SELECT count(*) n FROM calendar_events").first<{ n: number }>())?.n,
  ).toBe(4);
  expect(
    (await internal("calendar/batch", "POST", [{ ...base, fredReleaseId: null }])).status,
  ).toBe(400);
  expect(
    (await internal("calendar/batch", "POST", [{ ...base, kind: "earnings", fredReleaseId: null }]))
      .status,
  ).toBe(400);
  const health = { id: "rss", checkedAt: now, status: "ok", error: null };
  expect((await internal("sources/wrong/health", "PUT", health)).status).toBe(400);
  expect((await internal("sources/rss/health", "PUT", health)).status).toBe(204);
  expect(
    (
      await internal("sources/rss/health", "PUT", {
        ...health,
        status: "failed",
        error: "HTTP 503",
      })
    ).status,
  ).toBe(204);
  const sources = schemas.NewsSourceHealth.array().parse(
    await (await request("/v1/news/sources")).json(),
  );
  expect(sources).toHaveLength(1);
  expect(sources[0]?.status).toBe("failed");
});

it("内部写权限、坏JSON和媒体类型问题响应符合契约", async () => {
  expect((await request("/v1/internal/news/articles/batch", "POST", [])).status).toBe(401);
  for (const [contentType, body, status] of [
    ["text/plain", "[]", 415],
    ["application/json", "{", 400],
  ] as const) {
    const response = await app.request(
      "http://localhost/v1/internal/news/articles/batch",
      {
        method: "POST",
        headers: { Authorization: "Bearer test-service-token", "Content-Type": contentType },
        body,
      },
      env,
    );
    expect(response.status).toBe(status);
    expect(schemas.Problem.parse(await response.json()).status).toBe(status);
  }
  expect(
    (await internal("articles/batch", "POST", [article("bad", { url: "file:///tmp/a" })])).status,
  ).toBe(400);
});

it("三个MCP工具共用HTTP数据与完整时间线，缺期次明确404", async () => {
  const tool = (name: string) => tools.find((x) => x.name === name)!;
  await expect(tool("news_latest_edition").handler({ kind: "morning" }, env)).rejects.toMatchObject(
    { status: 404 },
  );
  const e = edition();
  await service.putEdition(env.DB, e.id, e);
  await service.putArticles(env.DB, [article()]);
  await service.putInsiders(env.DB, [insider]);
  expect(await tool("news_latest_edition").handler({ kind: "morning" }, env)).toEqual(e);
  expect(await tool("news_search").handler({ query: "Nvidia", ticker: "NVDA" }, env)).toEqual([
    article(),
  ]);
  const result = await tool("news_ticker_timeline").handler({ symbol: "NVDA" }, env);
  expect(schemas.NewsFullTimelineItem.array().parse(result)).toHaveLength(2);
});
