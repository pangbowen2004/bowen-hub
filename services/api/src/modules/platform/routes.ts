import * as schemas from "@bowen-hub/contracts/zod";
import type { Context, Handler } from "hono";
import type { z } from "zod";
import type { AppEnv } from "../../lib/env";
import { ApiError } from "../../lib/problem";
import { capabilitiesHandler } from "./capabilities";
import { exportHandler } from "./export";
import * as service from "./service";

function parse<T extends z.ZodType>(schema: T, value: unknown): z.output<T> {
  const result = schema.safeParse(value);
  if (!result.success) throw new ApiError(400, "请求参数或正文不符合契约");
  return result.data;
}
async function body<T extends z.ZodType>(c: Context<AppEnv>, schema: T): Promise<z.output<T>> {
  if (!c.req.header("Content-Type")?.split(";", 1)[0]?.trim().toLowerCase().endsWith("/json"))
    throw new ApiError(415, "请求正文必须为JSON");
  try {
    return parse(schema, await c.req.json());
  } catch (error) {
    if (error instanceof ApiError) throw error;
    throw new ApiError(400, "请求正文不是有效JSON");
  }
}
export const handlers: Record<string, Handler<AppEnv>> = {
  HealthCheck_get: (c) => c.json({ status: "ok" }),
  InternalPlatform_putDocument: async (c) => {
    const { key } = parse(schemas.InternalPlatformPutDocumentParams, c.req.param());
    const payload = await body(c, schemas.InternalPlatformPutDocumentBody);
    await service.putDocument(c.env.DB, key, JSON.stringify(payload));
    return c.body(null, 204);
  },
  InternalPlatform_putRun: async (c) => {
    const { runId } = parse(schemas.InternalPlatformPutRunParams, c.req.param());
    await service.putRun(c.env.DB, runId, await body(c, schemas.InternalPlatformPutRunBody));
    return c.body(null, 204);
  },
  InternalPlatform_batchAiCalls: async (c) => {
    await service.batchAiCalls(c.env.DB, await body(c, schemas.InternalPlatformBatchAiCallsBody));
    return c.body(null, 204);
  },
  InternalPlatform_batchEvalResults: async (c) => {
    await service.batchEvalResults(
      c.env.DB,
      await body(c, schemas.InternalPlatformBatchEvalResultsBody),
    );
    return c.body(null, 204);
  },
  PrivatePlatform_listRuns: async (c) => {
    const q = parse(schemas.PrivatePlatformListRunsQueryParams, c.req.query());
    return c.json(await service.listRuns(c.env.DB, q.limit ?? 20, q.job, q.cursor));
  },
  PrivatePlatform_getAiUsage: async (c) => {
    const q = parse(schemas.PrivatePlatformGetAiUsageQueryParams, c.req.query());
    return c.json(await service.getAiUsage(c.env.DB, q.days ?? 30));
  },
  PrivatePlatform_listEvals: async (c) => {
    const q = parse(schemas.PrivatePlatformListEvalsQueryParams, c.req.query());
    return c.json(await service.listEvals(c.env.DB, q.capability));
  },
  PrivatePlatform_listCapabilities: capabilitiesHandler,
  InternalPlatform_exportTable: exportHandler,
};
