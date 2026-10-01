import { timingSafeEqual } from "node:crypto";
import { Hono } from "hono";
import { authMetadataRoutes, authRoutes, sessionMiddleware } from "./lib/auth";
import type { AppEnv } from "./lib/env";
import { ApiError, problem } from "./lib/problem";
import { mcpHandler } from "./modules/mcp/server";
import { registerRoutes } from "./routes.gen";
export const app = new Hono<AppEnv>();
app.use("*", async (c, next) => {
  // 由服务器生成，避免把用户可控头内容直接写入日志。
  const requestId = crypto.randomUUID();
  c.set("requestId", requestId);
  const start = performance.now();
  await next();
  c.header("X-Request-Id", requestId);
  console.log(
    JSON.stringify({
      requestId,
      method: c.req.method,
      path: c.req.path,
      status: c.res.status,
      durationMs: Math.round(performance.now() - start),
    }),
  );
});
app.onError((error, c) => {
  if (error instanceof ApiError) return problem(c, error.status, error.message);
  console.error(JSON.stringify({ requestId: c.get("requestId"), error: "内部服务错误" }));
  return problem(c, 500, "内部服务错误");
});
app.use("/v1/*", async (c, next) => {
  const path = c.req.path;
  if (path === "/v1/health" || path.startsWith("/v1/public/")) return next();
  const authorization = c.req.header("Authorization");
  if (authorization !== undefined) {
    const expected = c.env.HUB_SERVICE_TOKEN;
    const provided = authorization.startsWith("Bearer ") ? authorization.slice(7) : "";
    const a = new TextEncoder().encode(provided);
    const b = new TextEncoder().encode(expected ?? "");
    if (!expected || !provided || a.length !== b.length || !timingSafeEqual(a, b))
      return problem(c, 401, "服务令牌无效");
    if (path.startsWith("/v1/internal/") || c.req.method === "GET") return next();
    return problem(c, 403, "服务令牌不能调用私有写接口");
  }
  if (path.startsWith("/v1/internal/")) return problem(c, 401, "需要服务令牌");
  return sessionMiddleware(c, next);
});
app.route("/auth", authRoutes);
app.route("/.well-known", authMetadataRoutes);
app.all("/mcp", mcpHandler);
registerRoutes(app);
app.notFound((c) => problem(c, 404, "接口不存在"));
