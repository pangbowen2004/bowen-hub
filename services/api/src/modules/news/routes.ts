// T14实现；以OpenAPI operationId登记处理器，生成路由会自动接入。

import * as schemas from "@bowen-hub/contracts/zod";
import type { Context, Handler } from "hono";
import type { z } from "zod";
import type { AppEnv } from "../../lib/env";
import { ApiError } from "../../lib/problem";
import * as service from "./service";

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, "请求参数或正文不符合契约");
  return result.data;
}
async function body<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.output<T>> {
  if (c.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json")
    throw new ApiError(415, "请求正文必须为JSON");
  try {
    return parse(schema, await c.req.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "请求正文不是有效JSON");
  }
}
export const handlers: Record<string, Handler<AppEnv>> = {
  PrivateNews_listEditions: async (c) => {
    const query = parse(schemas.PrivateNewsListEditionsQueryParams, c.req.query());
    return c.json(await service.listEditions(c.env.DB, query.limit, query.kind, query.cursor));
  },
  PrivateNews_getEdition: async (c) => {
    const { id } = parse(schemas.PrivateNewsGetEditionParams, c.req.param());
    return new Response(await service.getEdition(c.env.DB, id), {
      headers: { "Content-Type": "application/json" },
    });
  },
  PrivateNews_getEditionHtml: async (c) => {
    const { id } = parse(schemas.PrivateNewsGetEditionHtmlParams, c.req.param());
    return service.getHtml(c.env.DB, c.env.FILES, id);
  },
  PrivateNews_rateEdition: async (c) => {
    const { id } = parse(schemas.PrivateNewsRateEditionParams, c.req.param());
    const { score } = await body(c, schemas.PrivateNewsRateEditionBody);
    return c.json(await service.rateEdition(c.env.DB, id, score));
  },
  PrivateNews_flagItem: async (c) =>
    c.json(await service.flagItem(c.env.DB, await body(c, schemas.PrivateNewsFlagItemBody))),
  PrivateNews_listFeedback: async (c) => {
    const { since } = parse(schemas.PrivateNewsListFeedbackQueryParams, c.req.query());
    return c.json(await service.listFeedback(c.env.DB, since));
  },
  PrivateNews_searchArticles: async (c) => {
    const { q, ticker, days } = parse(schemas.PrivateNewsSearchArticlesQueryParams, c.req.query());
    return c.json(await service.search(c.env.DB, q, ticker, days));
  },
  PrivateNews_getTimeline: async (c) => {
    const { symbol } = parse(schemas.PrivateNewsGetTimelineParams, c.req.param());
    const { days } = parse(schemas.PrivateNewsGetTimelineQueryParams, c.req.query());
    return c.json(await service.timeline(c.env.DB, symbol, days));
  },
  PrivateNews_getFullTimeline: async (c) => {
    const { symbol } = parse(schemas.PrivateNewsGetFullTimelineParams, c.req.param());
    const { days } = parse(schemas.PrivateNewsGetFullTimelineQueryParams, c.req.query());
    return c.json(await service.fullTimeline(c.env.DB, symbol, days));
  },
  PrivateNews_listSources: async (c) => c.json(await service.listSources(c.env.DB)),
  InternalNews_putEdition: async (c) => {
    const { id } = parse(schemas.InternalNewsPutEditionParams, c.req.param());
    await service.putEdition(c.env.DB, id, await body(c, schemas.InternalNewsPutEditionBody));
    return c.body(null, 204);
  },
  InternalNews_putEditionHtml: async (c) => {
    const { id } = parse(schemas.InternalNewsPutEditionHtmlParams, c.req.param());
    if (c.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "text/html")
      throw new ApiError(415, "归档正文必须为HTML");
    const rawLength = c.req.header("Content-Length");
    const length = rawLength === undefined ? undefined : Number(rawLength);
    if (length !== undefined && (!Number.isSafeInteger(length) || length < 0))
      throw new ApiError(400, "正文长度无效");
    await service.putHtml(c.env.DB, c.env.FILES, id, c.req.raw.body, length);
    return c.body(null, 204);
  },
  InternalNews_putArticles: async (c) => {
    await service.putArticles(c.env.DB, await body(c, schemas.InternalNewsPutArticlesBody));
    return c.body(null, 204);
  },
  InternalNews_putFilings: async (c) => {
    await service.putFilings(c.env.DB, await body(c, schemas.InternalNewsPutFilingsBody));
    return c.body(null, 204);
  },
  InternalNews_putInsiderTrades: async (c) => {
    await service.putInsiders(c.env.DB, await body(c, schemas.InternalNewsPutInsiderTradesBody));
    return c.body(null, 204);
  },
  InternalNews_putCalendar: async (c) => {
    await service.putCalendar(c.env.DB, await body(c, schemas.InternalNewsPutCalendarBody));
    return c.body(null, 204);
  },
  InternalNews_putEarningsCards: async (c) => {
    await service.putEarnings(c.env.DB, await body(c, schemas.InternalNewsPutEarningsCardsBody));
    return c.body(null, 204);
  },
  InternalNews_putSourceHealth: async (c) => {
    const { id } = parse(schemas.InternalNewsPutSourceHealthParams, c.req.param());
    await service.putSource(c.env.DB, id, await body(c, schemas.InternalNewsPutSourceHealthBody));
    return c.body(null, 204);
  },
  InternalNews_pruneArticles: async (c) => {
    const { before } = parse(schemas.InternalNewsPruneArticlesQueryParams, c.req.query());
    await service.pruneArticles(c.env.DB, before);
    return c.body(null, 204);
  },
};
