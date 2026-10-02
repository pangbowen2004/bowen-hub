// 17个契约operationId；通用鉴权由app处理。
import type { MarketDayWrite } from "@bowen-hub/contracts";
import * as schemas from "@bowen-hub/contracts/zod";
import type { Context, Handler } from "hono";
import { z } from "zod";
import type { AppEnv } from "../../lib/env";
import { ApiError } from "../../lib/problem";
import * as service from "./service";

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, "请求参数或正文不符合契约");
  return result.data;
}
async function json(c: Context<AppEnv>): Promise<unknown> {
  if (c.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase() !== "application/json")
    throw new ApiError(415, "请求正文必须为JSON");
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, "请求正文不是有效JSON");
  }
}
async function body<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.output<T>> {
  return parse(schema, await json(c));
}
const document = (value: string) =>
  new Response(value, { headers: { "Content-Type": "application/json" } });
// 大JSON仅校验版本、路径主键与小摘要，避免重新遍历全市场数据。
const lightDay = z.object({
  day: z
    .object({
      schemaVersion: z.literal(1),
      date: z.iso.date(),
      dataStatus: schemas.MarketDataStatus,
    })
    .passthrough(),
  summary: schemas.MarketDaySummary,
});
export const handlers: Record<string, Handler<AppEnv>> = {
  PublicMarkets_listDays: async (c) => {
    const q = parse(schemas.PublicMarketsListDaysQueryParams, c.req.query());
    return c.json(await service.days(c.env.DB, q.limit, q.before, q.cursor));
  },
  PublicMarkets_getLatestDay: async (c) => document(await service.day(c.env.DB)),
  PublicMarkets_getDay: async (c) => {
    const p = parse(schemas.PublicMarketsGetDayParams, c.req.param());
    return document(await service.day(c.env.DB, p.date));
  },
  PublicMarkets_listIndexBars: async (c) => {
    const p = parse(schemas.PublicMarketsListIndexBarsParams, c.req.param());
    const q = parse(schemas.PublicMarketsListIndexBarsQueryParams, c.req.query());
    return c.json(await service.indexBars(c.env.DB, p.code, q.limit));
  },
  PublicMarkets_listHypotheses: async (c) => {
    const q = parse(schemas.PublicMarketsListHypothesesQueryParams, c.req.query());
    return c.json(await service.hypotheses(c.env.DB, q.limit, q, q.cursor));
  },
  PublicMarkets_listWeeklies: async (c) => c.json(await service.weeklies(c.env.DB)),
  PublicMarkets_getWeekly: async (c) => {
    const p = parse(schemas.PublicMarketsGetWeeklyParams, c.req.param());
    return document(await service.weekly(c.env.DB, p.date));
  },
  PublicMarkets_listEvents: async (c) => {
    const q = parse(schemas.PublicMarketsListEventsQueryParams, c.req.query());
    return c.json(await service.events(c.env.DB, q.from, q.to));
  },
  PublicMarkets_getReference: async (c) => document(await service.reference(c.env.DB)),
  PrivateMarkets_createEvent: async (c) => {
    const value = await body(c, schemas.PrivateMarketsCreateEventBody);
    return c.json(await service.putEvent(c.env.DB, value.id, value));
  },
  PrivateMarkets_putEvent: async (c) => {
    const p = parse(schemas.PrivateMarketsPutEventParams, c.req.param());
    return c.json(
      await service.putEvent(c.env.DB, p.id, await body(c, schemas.PrivateMarketsPutEventBody)),
    );
  },
  PrivateMarkets_deleteEvent: async (c) => {
    const p = parse(schemas.PrivateMarketsDeleteEventParams, c.req.param());
    await service.removeEvent(c.env.DB, p.id);
    return c.body(null, 204);
  },
  InternalMarkets_putDay: async (c) => {
    const p = parse(schemas.InternalMarketsPutDayParams, c.req.param());
    const value = parse(lightDay, await json(c)) as unknown as MarketDayWrite;
    await service.putDay(c.env.DB, p.date, value);
    return c.body(null, 204);
  },
  InternalMarkets_putHypotheses: async (c) => {
    await service.putHypotheses(c.env.DB, await body(c, schemas.InternalMarketsPutHypothesesBody));
    return c.body(null, 204);
  },
  InternalMarkets_putWeekly: async (c) => {
    const p = parse(schemas.InternalMarketsPutWeeklyParams, c.req.param());
    await service.putWeekly(c.env.DB, p.date, await body(c, schemas.InternalMarketsPutWeeklyBody));
    return c.body(null, 204);
  },
  InternalMarkets_putEvents: async (c) => {
    await service.putEvents(c.env.DB, await body(c, schemas.InternalMarketsPutEventsBody));
    return c.body(null, 204);
  },
  InternalMarkets_putIndexBars: async (c) => {
    const p = parse(schemas.InternalMarketsPutIndexBarsParams, c.req.param());
    await service.putIndexBars(
      c.env.DB,
      p.code,
      await body(c, schemas.InternalMarketsPutIndexBarsBody),
    );
    return c.body(null, 204);
  },
};
