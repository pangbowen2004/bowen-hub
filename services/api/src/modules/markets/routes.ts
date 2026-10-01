// T23实现；以OpenAPI operationId登记处理器，生成路由会自动接入。
import type { Handler } from "hono";
import type { AppEnv } from "../../lib/env";
export const handlers: Record<string, Handler<AppEnv>> = {};
