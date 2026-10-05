// /mcp：官方 SDK 的 Streamable HTTP 传输 + OAuth 保护。鉴权与授权核对在 lib/auth/mcp-access.ts，
// 工具来自各模块 mcp.ts（registry.ts 汇总），这里只负责把它们接到传输上。
import {
  createMcpHandler,
  getOAuthProtectedResourceMetadataUrl,
  McpServer,
  OAuthError,
  OAuthErrorCode,
  type OAuthTokenVerifier,
  readRequestBody,
  requireBearerAuth,
} from "@modelcontextprotocol/server";
import type { Handler } from "hono";
import { MCP_SCOPE, McpAccessError, mcpResource, verifyMcpAccess } from "../../lib/auth/mcp-access";
import type { AppEnv, Bindings } from "../../lib/env";
import { registerTools } from "./adapter";
import { exposedTools } from "./registry";

const SERVER_INFO = { name: "research-console", title: "研究控制台", version: "1.0.0" } as const;
const INSTRUCTIONS = [
  "这是使用者本人的研究控制台：美股新闻与公告、自选股、A 股收盘复盘、论文阅读。",
  "查询类工具可以直接调用；watchlist_add、watchlist_remove 会修改自选股，调用前先和使用者确认，",
  "新增时须先问清名称、类型、分组、标的、对照 ETF、别名和是否启用，不要猜。",
  "papers_ask 会调用模型作答并产生费用；papers_ingest_url 只接受 arXiv 链接并启动入库流程。",
  "这里没有买卖建议、目标价或仓位建议。",
].join("");
/** 请求体上限：工具入参都很小，256 KiB 足够。 */
const MAX_BODY_BYTES = 256 * 1024;

function createServer(env: Bindings): McpServer {
  const server = new McpServer(SERVER_INFO, { instructions: INSTRUCTIONS });
  registerTools(server, env, exposedTools());
  return server;
}

const handlers = new WeakMap<Bindings, ReturnType<typeof createMcpHandler>>();
function handlerFor(env: Bindings) {
  let handler = handlers.get(env);
  if (!handler) {
    handler = createMcpHandler(() => createServer(env), {
      maxRequestBodySize: MAX_BODY_BYTES,
      onerror: () => console.error(JSON.stringify({ mcp: "传输层报告了一个错误" })),
    });
    handlers.set(env, handler);
  }
  return handler;
}

/** 把本实例的令牌核对接成 SDK 的校验器：被拒的原因映射为 401 / 403，基础设施故障原样抛出成 500。 */
function verifierFor(env: Bindings): OAuthTokenVerifier {
  return {
    async verifyAccessToken(token) {
      try {
        const access = await verifyMcpAccess(env, token);
        return {
          token,
          clientId: access.clientId,
          scopes: access.scopes,
          expiresAt: access.expiresAt,
          resource: new URL(mcpResource(env)),
        };
      } catch (error) {
        if (error instanceof McpAccessError)
          throw new OAuthError(
            error.code === "invalid_token"
              ? OAuthErrorCode.InvalidToken
              : OAuthErrorCode.InsufficientScope,
            error.message,
          );
        console.error(JSON.stringify({ mcp: "令牌核对遇到服务端故障" }));
        throw error;
      }
    },
  };
}

function jsonRpcError(status: number, message: string): Response {
  return Response.json({ jsonrpc: "2.0", error: { code: -32000, message }, id: null }, { status });
}

/**
 * 防止浏览器里的第三方页面借用户的浏览器访问 MCP（DNS 重绑定、跨站请求）：
 * 没有 Origin 头的是命令行与服务端客户端，直接放行；带 Origin 的必须是控制台自己的来源。
 */
function originAllowed(request: Request, env: Bindings): boolean {
  const origin = request.headers.get("Origin");
  if (origin === null) return true;
  return env.AUTH_TRUSTED_ORIGINS.split(",")
    .map((value) => value.trim())
    .includes(origin);
}

/** 转交 Durable Object 时加上这个头，对象里的应用据此直接执行，不再转交一次。 */
const IN_OBJECT_HEADER = "x-hub-in-object";

/**
 * 请求里是否有 papers_ask 的调用（含批量请求）。
 * 论文问答要解析整篇原文和模型的流式输出，普通免费 Worker 每次请求 10 ms 的 CPU 上限装不下
 * （ADR-0014 实测 100 ms 以上）；经 /mcp 调用时和 HTTP 接口一样转交 Durable Object 执行（ADR-0015）。
 */
async function callsPaperQa(request: Request): Promise<boolean> {
  if (request.method !== "POST") return false;
  try {
    // 克隆后限量读取：原请求体留给后面的处理者；超限的交给传输层回 413。
    const body = await readRequestBody(request.clone(), MAX_BODY_BYTES);
    if (body.tooLarge) return false;
    const parsed: unknown = JSON.parse(body.text);
    return (Array.isArray(parsed) ? parsed : [parsed]).some(
      (message) =>
        typeof message === "object" &&
        message !== null &&
        "method" in message &&
        message.method === "tools/call" &&
        "params" in message &&
        typeof message.params === "object" &&
        message.params !== null &&
        "name" in message.params &&
        message.params.name === "papers_ask",
    );
  } catch {
    return false;
  }
}

export const mcpHandler: Handler<AppEnv> = async (c) => {
  const request = c.req.raw;
  if (!originAllowed(request, c.env)) return jsonRpcError(403, "请求来源不被允许");
  const gate = requireBearerAuth({
    verifier: verifierFor(c.env),
    requiredScopes: [MCP_SCOPE],
    resourceMetadataUrl: getOAuthProtectedResourceMetadataUrl(new URL(mcpResource(c.env))),
  });
  const authorized = await gate(request);
  if (authorized instanceof Response) return authorized;
  const objects = c.env.PAPER_QA_RUNTIME;
  if (objects && !request.headers.has(IN_OBJECT_HEADER) && (await callsPaperQa(request))) {
    // 令牌已在这里核对过；对象里的应用会用同一份令牌再核对一次，每次问答一个独立对象，不保存状态。
    const headers = new Headers(request.headers);
    headers.set(IN_OBJECT_HEADER, "1");
    return objects
      .get(objects.idFromName(crypto.randomUUID()))
      .fetch(new Request(request, { headers }));
  }
  return handlerFor(c.env).fetch(request, { authInfo: authorized });
};
