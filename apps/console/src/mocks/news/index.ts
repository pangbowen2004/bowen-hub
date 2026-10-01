import type { Article, Edition, Feedback, NewsFullTimelineItem } from "@bowen-hub/contracts";
import {
  EditionFeedbackRequest,
  Edition as EditionSchema,
  ItemFeedbackRequest,
  WatchItem as WatchSchema,
} from "@bowen-hub/contracts/zod";
import { HttpResponse, http } from "msw";
import articleRaw from "../../../../../fixtures/samples/news/Article.synthetic.json";
import earningsRaw from "../../../../../fixtures/samples/news/EarningsTimelineItem.synthetic.json";
import legacyRaw from "../../../../../fixtures/samples/news/Edition.legacy-2026-09-29.json";
import morningRaw from "../../../../../fixtures/samples/news/Edition.morning-2026-09-30.json";
import filingRaw from "../../../../../fixtures/samples/news/FilingTimelineItem.synthetic.json";
import insiderRaw from "../../../../../fixtures/samples/news/InsiderTrade.synthetic.json";
import watchRaw from "../../../../../fixtures/samples/watchlist/WatchItem.initial.json";

const morning = EditionSchema.parse(morningRaw);
const legacy = EditionSchema.parse(legacyRaw);
const editions: Edition[] = [
  morning,
  { ...morning, id: "premarket-2026-09-30", kind: "premarket" },
  legacy,
  ...Array.from({ length: 24 }, (_, index) => ({
    ...legacy,
    id: `legacy-2026-09-${String(28 - index).padStart(2, "0")}`,
    date: `2026-09-${String(28 - index).padStart(2, "0")}`,
  })),
];
let watch = WatchSchema.array().parse(watchRaw);
let feedback: Feedback[] = [];
const article = articleRaw as Article;
const fullTimeline: NewsFullTimelineItem[] = [
  { kind: "article", at: article.publishedAt, article },
  filingRaw as NewsFullTimelineItem,
  earningsRaw as NewsFullTimelineItem,
  { kind: "insider", at: insiderRaw.filedAt, insiderTrade: insiderRaw },
];
const problem = (detail: string, status = 400) =>
  HttpResponse.json({ type: "about:blank", title: detail, status, detail }, { status });
const failedPaths = new Set<string>();
// 仅显式MSW样例模式加载，用于验收失败与回滚；不在生产加载。
window.addEventListener("hub-mock-failure", (event) => {
  const detail = (event as CustomEvent<{ path: string; enabled: boolean }>).detail;
  if (detail.enabled) failedPaths.add(detail.path);
  else failedPaths.delete(detail.path);
});
window.addEventListener("hub-mock-publish-edition", () => {
  for (const kind of ["morning", "premarket"] as const) {
    editions.unshift({ ...morning, id: `${kind}-2026-10-02`, kind, date: "2026-10-02" });
  }
});
export const newsHandlers = [
  http.get("/v1/news/editions", ({ request }) => {
    const search = new URL(request.url).searchParams;
    const kind = search.get("kind");
    const filtered = editions.filter((row) => !kind || row.kind === kind);
    const offset = Number(search.get("cursor") ?? 0);
    const limit = Number(search.get("limit") ?? 20);
    return HttpResponse.json({
      items: filtered
        .slice(offset, offset + limit)
        .map(({ id, kind, date, generatedAt }) => ({ id, kind, date, generatedAt })),
      nextCursor: offset + limit < filtered.length ? String(offset + limit) : null,
    });
  }),
  http.get("/v1/news/editions/:id", ({ params }) => {
    const edition = editions.find((row) => row.id === params.id);
    return edition ? HttpResponse.json(edition) : problem("期次不存在", 404);
  }),
  http.get("/v1/news/feedback", () => HttpResponse.json(feedback)),
  http.post("/v1/news/editions/:id/feedback", async ({ request, params }) => {
    if (failedPaths.has(new URL(request.url).pathname)) return problem("模拟写入失败", 500);
    const parsed = EditionFeedbackRequest.safeParse(await request.json());
    if (!parsed.success) return problem("评分无效");
    const row: Feedback = {
      kind: "edition",
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      editionId: String(params.id),
      score: parsed.data.score,
    };
    feedback = [
      row,
      ...feedback.filter((item) => item.kind !== "edition" || item.editionId !== row.editionId),
    ];
    return HttpResponse.json(row);
  }),
  http.post("/v1/news/feedback/items", async ({ request }) => {
    const parsed = ItemFeedbackRequest.safeParse(await request.json());
    if (!parsed.success) return problem("反馈无效");
    const row: Feedback = {
      kind: "item",
      id: crypto.randomUUID(),
      createdAt: new Date().toISOString(),
      ...parsed.data,
    };
    feedback = [row, ...feedback];
    return HttpResponse.json(row);
  }),
  http.get("/v1/news/articles/search", ({ request }) => {
    const search = new URL(request.url).searchParams;
    const q = search.get("q")?.toLowerCase() ?? "";
    const ticker = search.get("ticker");
    return HttpResponse.json(
      [article].filter(
        (row) =>
          (row.title + row.summary).toLowerCase().includes(q) &&
          (!ticker || row.tickers.includes(ticker)),
      ),
    );
  }),
  http.get("/v1/news/tickers/:symbol/timeline/full", ({ params }) =>
    HttpResponse.json(
      fullTimeline.filter((row) =>
        (row.kind === "article"
          ? row.article.tickers
          : [
              row.kind === "filing"
                ? row.filing.ticker
                : row.kind === "earnings"
                  ? row.earnings.symbol
                  : row.insiderTrade.ticker,
            ]
        ).includes(String(params.symbol)),
      ),
    ),
  ),
  http.get("/v1/watchlist", () => HttpResponse.json(watch)),
  http.put("/v1/watchlist/:symbol", async ({ request, params }) => {
    if (failedPaths.has(new URL(request.url).pathname)) return problem("模拟写入失败", 500);
    const parsed = WatchSchema.safeParse(await request.json());
    if (!parsed.success || parsed.data.symbol !== params.symbol) return problem("自选股资料无效");
    watch = [...watch.filter((row) => row.symbol !== params.symbol), parsed.data];
    return HttpResponse.json(parsed.data);
  }),
  http.delete("/v1/watchlist/:symbol", ({ params }) => {
    watch = watch.filter((row) => row.symbol !== params.symbol);
    return new HttpResponse(null, { status: 204 });
  }),
];
