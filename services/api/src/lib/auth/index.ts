// T40替换此固定入口。服务令牌分流在app中；会话占位只在显式本地模式放行。
import { Hono, type MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { problem, unimplemented } from "../problem";
export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (c.env.APP_MODE !== "local") return problem(c, 401, "需要登录");
  await next();
};
export const authRoutes = new Hono<AppEnv>();
authRoutes.all("*", unimplemented("T40"));
