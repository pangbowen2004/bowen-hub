// 由 contracts 生成，勿手改（mise run gen）
import type { Hono } from "hono";
import type { AppEnv } from "./lib/env";
import { unimplemented } from "./lib/problem";
import { handlers as platform } from "./modules/platform/routes";
import { handlers as news } from "./modules/news/routes";
import { handlers as watchlist } from "./modules/watchlist/routes";
import { handlers as markets } from "./modules/markets/routes";
import { handlers as papers } from "./modules/papers/routes";
export const ROUTES = [
  {
    "method": "GET",
    "path": "/v1/ai/usage",
    "operationId": "PrivatePlatform_getAiUsage",
    "task": "T02"
  },
  {
    "method": "GET",
    "path": "/v1/capabilities",
    "operationId": "PrivatePlatform_listCapabilities",
    "task": "T41"
  },
  {
    "method": "GET",
    "path": "/v1/evals",
    "operationId": "PrivatePlatform_listEvals",
    "task": "T02"
  },
  {
    "method": "GET",
    "path": "/v1/health",
    "operationId": "HealthCheck_get",
    "task": "T02"
  },
  {
    "method": "POST",
    "path": "/v1/internal/ai-calls/batch",
    "operationId": "InternalPlatform_batchAiCalls",
    "task": "T02"
  },
  {
    "method": "POST",
    "path": "/v1/internal/evals/results/batch",
    "operationId": "InternalPlatform_batchEvalResults",
    "task": "T02"
  },
  {
    "method": "POST",
    "path": "/v1/internal/markets/events/batch",
    "operationId": "InternalMarkets_putEvents",
    "task": "T23"
  },
  {
    "method": "POST",
    "path": "/v1/internal/markets/hypotheses/batch",
    "operationId": "InternalMarkets_putHypotheses",
    "task": "T23"
  },
  {
    "method": "POST",
    "path": "/v1/internal/news/articles/batch",
    "operationId": "InternalNews_putArticles",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/internal/news/articles/prune",
    "operationId": "InternalNews_pruneArticles",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/internal/news/calendar/batch",
    "operationId": "InternalNews_putCalendar",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/internal/news/earnings-cards/batch",
    "operationId": "InternalNews_putEarningsCards",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/internal/news/filings/batch",
    "operationId": "InternalNews_putFilings",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/internal/news/insider-trades/batch",
    "operationId": "InternalNews_putInsiderTrades",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/internal/watchlist/batch",
    "operationId": "InternalWatchlist_batch",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/markets/events",
    "operationId": "PrivateMarkets_createEvent",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/news/articles/search",
    "operationId": "PrivateNews_searchArticles",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/news/editions",
    "operationId": "PrivateNews_listEditions",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/news/feedback",
    "operationId": "PrivateNews_listFeedback",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/news/feedback/items",
    "operationId": "PrivateNews_flagItem",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/news/sources",
    "operationId": "PrivateNews_listSources",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/papers",
    "operationId": "PrivatePapers_listPapers",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/papers/catalog",
    "operationId": "PrivatePapers_getCatalog",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/papers/graph",
    "operationId": "PrivatePapers_getGraph",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/papers/uploads",
    "operationId": "PrivatePapers_listUploads",
    "task": "T32"
  },
  {
    "method": "POST",
    "path": "/v1/papers/uploads/arxiv",
    "operationId": "PrivatePapers_uploadArxiv",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/days",
    "operationId": "PublicMarkets_listDays",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/days/latest",
    "operationId": "PublicMarkets_getLatestDay",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/events",
    "operationId": "PublicMarkets_listEvents",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/hypotheses",
    "operationId": "PublicMarkets_listHypotheses",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/reference",
    "operationId": "PublicMarkets_getReference",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/weeklies",
    "operationId": "PublicMarkets_listWeeklies",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/papers/catalog",
    "operationId": "PublicPapers_getCatalog",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/public/papers/graph",
    "operationId": "PublicPapers_getGraph",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/public/papers/search-index",
    "operationId": "PublicPapers_getSearchIndex",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/runs",
    "operationId": "PrivatePlatform_listRuns",
    "task": "T02"
  },
  {
    "method": "GET",
    "path": "/v1/watchlist",
    "operationId": "PrivateWatchlist_list",
    "task": "T14"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/documents/:key",
    "operationId": "InternalPlatform_putDocument",
    "task": "T02"
  },
  {
    "method": "GET",
    "path": "/v1/internal/export/:table",
    "operationId": "InternalPlatform_exportTable",
    "task": "T42"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/markets/days/:date",
    "operationId": "InternalMarkets_putDay",
    "task": "T23"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/markets/indices/:code/bars",
    "operationId": "InternalMarkets_putIndexBars",
    "task": "T23"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/markets/weeklies/:date",
    "operationId": "InternalMarkets_putWeekly",
    "task": "T23"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/news/editions/:id",
    "operationId": "InternalNews_putEdition",
    "task": "T14"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/news/editions/:id/html",
    "operationId": "InternalNews_putEditionHtml",
    "task": "T14"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/news/sources/:id/health",
    "operationId": "InternalNews_putSourceHealth",
    "task": "T14"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/papers/:id",
    "operationId": "InternalPapers_putPaper",
    "task": "T32"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/papers/:id/private",
    "operationId": "InternalPapers_putPrivate",
    "task": "T32"
  },
  {
    "method": "POST",
    "path": "/v1/internal/papers/:id/reviews",
    "operationId": "InternalPapers_createReview",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/internal/papers/uploads/:uploadId",
    "operationId": "InternalPapers_getUpload",
    "task": "T32"
  },
  {
    "method": "PATCH",
    "path": "/v1/internal/papers/uploads/:uploadId",
    "operationId": "InternalPapers_patchUpload",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/internal/papers/uploads/:uploadId/file",
    "operationId": "InternalPapers_getUploadFile",
    "task": "T32"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/runs/:runId",
    "operationId": "InternalPlatform_putRun",
    "task": "T02"
  },
  {
    "method": "DELETE",
    "path": "/v1/markets/events/:id",
    "operationId": "PrivateMarkets_deleteEvent",
    "task": "T23"
  },
  {
    "method": "PUT",
    "path": "/v1/markets/events/:id",
    "operationId": "PrivateMarkets_putEvent",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/news/editions/:id",
    "operationId": "PrivateNews_getEdition",
    "task": "T14"
  },
  {
    "method": "POST",
    "path": "/v1/news/editions/:id/feedback",
    "operationId": "PrivateNews_rateEdition",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/news/editions/:id/html",
    "operationId": "PrivateNews_getEditionHtml",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/news/tickers/:symbol/timeline",
    "operationId": "PrivateNews_getTimeline",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/papers/:id",
    "operationId": "PrivatePapers_getPaper",
    "task": "T32"
  },
  {
    "method": "PATCH",
    "path": "/v1/papers/:id",
    "operationId": "PrivatePapers_patchPaper",
    "task": "T32"
  },
  {
    "method": "POST",
    "path": "/v1/papers/:id/ask",
    "operationId": "PrivatePapers_ask",
    "task": "T32"
  },
  {
    "method": "POST",
    "path": "/v1/papers/:id/explanations",
    "operationId": "PrivatePapers_createExplanation",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/papers/:id/private",
    "operationId": "PrivatePapers_getPrivate",
    "task": "T32"
  },
  {
    "method": "PUT",
    "path": "/v1/papers/:id/private",
    "operationId": "PrivatePapers_putPrivate",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/papers/:id/reviews",
    "operationId": "PrivatePapers_listReviews",
    "task": "T32"
  },
  {
    "method": "POST",
    "path": "/v1/papers/:id/revise",
    "operationId": "PrivatePapers_revise",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/papers/:id/source.pdf",
    "operationId": "PrivatePapers_getPdf",
    "task": "T32"
  },
  {
    "method": "PUT",
    "path": "/v1/papers/uploads/:filename",
    "operationId": "PrivatePapers_uploadPdf",
    "task": "T32"
  },
  {
    "method": "POST",
    "path": "/v1/papers/uploads/:uploadId/retry",
    "operationId": "PrivatePapers_retryUpload",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/days/:date",
    "operationId": "PublicMarkets_getDay",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/indices/:code/bars",
    "operationId": "PublicMarkets_listIndexBars",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/markets/weeklies/:date",
    "operationId": "PublicMarkets_getWeekly",
    "task": "T23"
  },
  {
    "method": "GET",
    "path": "/v1/public/papers/:id",
    "operationId": "PublicPapers_getPaper",
    "task": "T32"
  },
  {
    "method": "DELETE",
    "path": "/v1/watchlist/:symbol",
    "operationId": "PrivateWatchlist_remove",
    "task": "T14"
  },
  {
    "method": "PUT",
    "path": "/v1/watchlist/:symbol",
    "operationId": "PrivateWatchlist_put",
    "task": "T14"
  },
  {
    "method": "GET",
    "path": "/v1/internal/papers/:id/files/:name",
    "operationId": "InternalPapers_getFile",
    "task": "T32"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/papers/:id/files/:name",
    "operationId": "InternalPapers_putFile",
    "task": "T32"
  },
  {
    "method": "PUT",
    "path": "/v1/internal/papers/:id/pages/:n",
    "operationId": "InternalPapers_putPage",
    "task": "T32"
  },
  {
    "method": "PATCH",
    "path": "/v1/papers/:id/explanations/:eid",
    "operationId": "PrivatePapers_patchExplanation",
    "task": "T32"
  },
  {
    "method": "GET",
    "path": "/v1/papers/:id/pages/:n",
    "operationId": "PrivatePapers_getPage",
    "task": "T32"
  }
] as const;
const handlers = { ...platform, ...news, ...watchlist, ...markets, ...papers };
export function registerRoutes(app: Hono<AppEnv>): void {
  for (const route of ROUTES) app.on(route.method,route.path,handlers[route.operationId] ?? unimplemented(route.task));
}
