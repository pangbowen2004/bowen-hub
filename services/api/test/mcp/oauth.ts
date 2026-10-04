// 在Workers测试环境里走完真实的Better Auth OAuth流程（登记客户端、授权、确认、换令牌），不伪造JWT。

import { env } from "cloudflare:workers";
import { createHash } from "node:crypto";
import { Client, StreamableHTTPClientTransport } from "@modelcontextprotocol/client";
import type { GenericEndpointContext } from "better-auth";
import { signJWT } from "better-auth/plugins";
import { app } from "../../src/app";
import { OWNER_ID } from "../../src/lib/auth/bootstrap";
import { mcpResource } from "../../src/lib/auth/mcp-access";
import { getAuth } from "../../src/lib/auth/runtime";
import type { Bindings } from "../../src/lib/env";
import { authenticatedCookie } from "../auth/fixture";

export interface IssuedGrant {
  clientId: string;
  accessToken: string;
  refreshToken: string | null;
  scope: string;
  consentId: string | null;
}

const base = (bindings: Bindings) => bindings.AUTH_BASE_URL;
export const mcpUrl = (bindings: Bindings = env) => `${base(bindings)}/mcp`;

async function call(
  path: string,
  init: RequestInit & { cookie?: string },
  bindings: Bindings,
): Promise<Response> {
  const { cookie, ...rest } = init;
  return app.request(
    `${base(bindings)}${path}`,
    {
      ...rest,
      headers: {
        Origin: base(bindings),
        ...(cookie ? { Cookie: cookie } : {}),
        ...(rest.headers as Record<string, string> | undefined),
      },
    },
    bindings,
  );
}

/** 动态登记一个公共客户端；与T40的真实浏览器验收使用同一组登记字段。 */
export async function registerClient(
  bindings: Bindings = env,
  scope = "mcp offline_access",
  name = "测试客户端",
): Promise<string> {
  const response = await call(
    "/auth/oauth2/register",
    {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        client_name: name,
        application_type: "native",
        redirect_uris: ["http://localhost/oauth-return"],
        token_endpoint_auth_method: "none",
        grant_types: ["authorization_code", "refresh_token"],
        response_types: ["code"],
        scope,
      }),
    },
    bindings,
  );
  if (!response.ok) throw new Error(`客户端登记失败：${response.status}`);
  return ((await response.json()) as { client_id: string }).client_id;
}

/** 授权 → 确认 → 换取令牌；cookie必须属于已完成登记的固定使用者。 */
export async function issueGrant(
  options: {
    cookie?: string;
    clientId?: string;
    scope?: string;
    resource?: string | null;
    bindings?: Bindings;
  } = {},
): Promise<IssuedGrant> {
  const bindings = options.bindings ?? env;
  const cookie = options.cookie ?? (await authenticatedCookie());
  const scope = options.scope ?? "mcp offline_access";
  const clientId = options.clientId ?? (await registerClient(bindings, scope));
  const verifier = btoa(String.fromCharCode(...crypto.getRandomValues(new Uint8Array(48))))
    .replaceAll("+", "-")
    .replaceAll("/", "_")
    .replaceAll("=", "");
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const resource = options.resource === undefined ? mcpUrl(bindings) : options.resource;
  const authorize = await call(
    `/auth/oauth2/authorize?${new URLSearchParams({
      client_id: clientId,
      redirect_uri: "http://localhost/oauth-return",
      response_type: "code",
      scope,
      ...(resource === null ? {} : { resource }),
      code_challenge: challenge,
      code_challenge_method: "S256",
      state: "test-state",
    })}`,
    { cookie, redirect: "manual" },
    bindings,
  );
  let location = authorize.headers.get("location");
  if (!location) throw new Error(`授权没有跳转：${authorize.status}`);
  let redirected = new URL(location, base(bindings));
  if (redirected.pathname === "/consent") {
    const consent = await call(
      "/auth/oauth2/consent",
      {
        method: "POST",
        cookie,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ accept: true, oauth_query: redirected.search.slice(1) }),
      },
      bindings,
    );
    if (!consent.ok) throw new Error(`确认失败：${consent.status}`);
    location = ((await consent.json()) as { url: string }).url;
    redirected = new URL(location, base(bindings));
  }
  const code = redirected.searchParams.get("code");
  if (!code) throw new Error(`没有授权码：${location}`);
  const token = await call(
    "/auth/oauth2/token",
    {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: new URLSearchParams({
        grant_type: "authorization_code",
        client_id: clientId,
        code,
        redirect_uri: "http://localhost/oauth-return",
        code_verifier: verifier,
        ...(resource === null ? {} : { resource }),
      }),
    },
    bindings,
  );
  if (!token.ok) throw new Error(`换取令牌失败：${token.status}`);
  const data = (await token.json()) as {
    access_token: string;
    refresh_token?: string;
    scope?: string;
  };
  const consentRow = await bindings.DB.prepare(
    "SELECT id FROM oauth_consent WHERE client_id=? ORDER BY created_at DESC LIMIT 1",
  )
    .bind(clientId)
    .first<{ id: string }>();
  return {
    clientId,
    accessToken: data.access_token,
    refreshToken: data.refresh_token ?? null,
    scope: data.scope ?? scope,
    consentId: consentRow?.id ?? null,
  };
}

export function decodeClaims(token: string): Record<string, unknown> {
  const part = token.split(".")[1];
  if (!part) throw new Error("不是JWT");
  return JSON.parse(atob(part.replace(/-/g, "+").replace(/_/g, "/")));
}

/**
 * 用授权服务器自己的签名密钥签一个声明可控的JWT，只用来构造“签名有效、其余不对”的反例；
 * 默认声明与真实令牌一致，参数覆盖其中一项即可得到只错一处的令牌。
 */
export async function forgeToken(
  claims: Record<string, unknown> = {},
  header: { typ?: string } = { typ: "at+jwt" },
  bindings: Bindings = env,
): Promise<string> {
  const context = await getAuth(bindings).$context;
  const now = Math.floor(Date.now() / 1000);
  return signJWT({ context } as unknown as GenericEndpointContext, {
    payload: {
      sub: OWNER_ID,
      aud: mcpResource(bindings),
      iss: context.baseURL,
      azp: "forged-client",
      client_id: "forged-client",
      scope: "mcp",
      iat: now,
      exp: now + 3600,
      jti: crypto.randomUUID(),
      ...claims,
    },
    header,
  });
}

/** 直接发一条 JSON-RPC 请求，返回原始响应；token 为 null 时不带 Authorization。 */
export function rpc(
  token: string | null,
  body: unknown,
  extra: { headers?: Record<string, string>; method?: string; bindings?: Bindings } = {},
): Promise<Response> {
  const bindings = extra.bindings ?? env;
  const method = extra.method ?? "POST";
  return Promise.resolve(
    app.request(
      mcpUrl(bindings),
      {
        method,
        headers: {
          "Content-Type": "application/json",
          Accept: "application/json, text/event-stream",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
          ...extra.headers,
        },
        ...(method === "GET" || method === "DELETE" ? {} : { body: JSON.stringify(body) }),
      },
      bindings,
    ),
  );
}

/** 用官方 SDK 客户端连接 /mcp；era 选择旧版握手（legacy）还是先探测新版协议（auto）。 */
export async function connect(
  token: string,
  era: "legacy" | "auto" = "legacy",
  bindings: Bindings = env,
): Promise<Client> {
  const client = new Client(
    { name: "测试客户端", version: "1.0.0" },
    { versionNegotiation: { mode: era } },
  );
  await client.connect(
    new StreamableHTTPClientTransport(new URL(mcpUrl(bindings)), {
      fetch: (url, init) => Promise.resolve(app.request(String(url), init, bindings)),
      requestInit: { headers: { Authorization: `Bearer ${token}` } },
    }),
  );
  return client;
}

/** 设置页“撤销授权”调用的同一个接口（T40）：删除授权记录并撤销该客户端的刷新令牌。 */
export function revokeConsent(
  cookie: string,
  consentId: string | null,
  bindings: Bindings = env,
): Promise<Response> {
  return call(
    "/auth/oauth2/delete-consent",
    {
      method: "POST",
      cookie,
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ id: consentId }),
    },
    bindings,
  );
}

/** 取一个公开的元数据地址（可以是绝对地址）。 */
export function getMetadata(url: string, bindings: Bindings = env): Promise<Response> {
  return Promise.resolve(app.request(url, {}, bindings));
}
