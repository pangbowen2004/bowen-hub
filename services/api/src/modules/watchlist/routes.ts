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
  PrivateWatchlist_list: async (c) => c.json(await service.list(c.env.DB)),
  PrivateWatchlist_put: async (c) => {
    const { symbol } = parse(schemas.PrivateWatchlistPutParams, c.req.param());
    return c.json(
      await service.put(c.env.DB, symbol, await body(c, schemas.PrivateWatchlistPutBody)),
    );
  },
  PrivateWatchlist_remove: async (c) => {
    const { symbol } = parse(schemas.PrivateWatchlistRemoveParams, c.req.param());
    await service.remove(c.env.DB, symbol);
    return c.body(null, 204);
  },
  InternalWatchlist_batch: async (c) => {
    await service.batch(c.env.DB, await body(c, schemas.InternalWatchlistBatchBody));
    return c.body(null, 204);
  },
};
