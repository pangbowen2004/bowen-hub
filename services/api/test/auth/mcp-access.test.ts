// MCP当前授权检查：令牌是自包含JWT，撤销授权后签名仍然有效，所以必须逐次核对授权。
// 令牌来自Better Auth真实走完授权、确认、换令牌；反例只改一处声明、用真实签名密钥重签。
import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import {
  hasCurrentMcpGrant,
  MCP_SCOPE,
  McpAccessError,
  mcpResource,
  parseScopes,
  verifyMcpAccess,
} from "../../src/lib/auth/mcp-access";
import { getAuth } from "../../src/lib/auth/runtime";
import { forgeToken, issueGrant, revokeConsent } from "../mcp/oauth";
import { authenticatedCookie } from "./fixture";

beforeEach(async () => {
  await env.DB.batch(
    ["oauth_consent", "oauth_refresh_token", "oauth_access_token", "oauth_client", "user"].map(
      (table) => env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});
const now = () => Math.floor(Date.now() / 1000);
describe("令牌核对", () => {
  it("真实授权流程签发的令牌通过，返回客户端、范围与有效期", async () => {
    const grant = await issueGrant();
    const access = await verifyMcpAccess(env, grant.accessToken);
    expect(access.clientId).toBe(grant.clientId);
    expect(access.scopes).toEqual(expect.arrayContaining([MCP_SCOPE, "offline_access"]));
    expect(access.expiresAt).toBeGreaterThan(now());
    expect(access.issuedAt).toBeLessThanOrEqual(now());
    // 受众与授权服务器签发时绑定的资源逐字一致。
    expect(mcpResource(env)).toBe(`${env.AUTH_BASE_URL}/mcp`);
  });
  it("签名有效但只有一处不对的令牌都被拒绝，对照令牌正常通过", async () => {
    const grant = await issueGrant();
    const client = { azp: grant.clientId, client_id: grant.clientId };
    await expect(verifyMcpAccess(env, await forgeToken(client))).resolves.toMatchObject({
      clientId: grant.clientId,
    });
    const rejected: [string, Record<string, unknown>, { typ?: string }?][] = [
      ["受众不是本服务", { ...client, aud: "http://localhost/other" }],
      ["签发者不是本授权服务器", { ...client, iss: "http://localhost/elsewhere" }],
      ["不是固定使用者", { ...client, sub: "someone-else" }],
      ["已过期", { ...client, iat: now() - 7200, exp: now() - 60 }],
      ["绑定了发送者（DPoP）", { ...client, cnf: { jkt: "thumbprint" } }],
      ["没有客户端", { azp: undefined, client_id: undefined }],
      ["不是访问令牌类型", client, { typ: "JWT" }],
    ];
    for (const [reason, claims, header] of rejected) {
      const error = await verifyMcpAccess(env, await forgeToken(claims, header)).catch((e) => e);
      expect(error, reason).toBeInstanceOf(McpAccessError);
      expect(error.code, reason).toBe("invalid_token");
    }
    const noScope = await verifyMcpAccess(
      env,
      await forgeToken({ ...client, scope: "openid profile" }),
    ).catch((e) => e);
    expect(noScope).toBeInstanceOf(McpAccessError);
    expect(noScope.code).toBe("insufficient_scope");
  });
  it("乱写、未签名和空令牌被拒绝", async () => {
    await issueGrant();
    const unsigned = `${btoa('{"alg":"none"}').replaceAll("=", "")}.${btoa(
      JSON.stringify({ sub: "owner", aud: mcpResource(env), scope: "mcp" }),
    ).replaceAll("=", "")}.`;
    for (const token of ["", "abc", "a.b.c", unsigned]) {
      const error = await verifyMcpAccess(env, token).catch((e) => e);
      expect(error, token).toBeInstanceOf(McpAccessError);
      expect(error.code, token).toBe("invalid_token");
    }
  });
  it("没有授权记录、客户端被停用、授权里没有 mcp 范围的都拒绝", async () => {
    const grant = await issueGrant();
    const stranger = await forgeToken({ azp: "unknown-client", client_id: "unknown-client" });
    await expect(verifyMcpAccess(env, stranger)).rejects.toMatchObject({ code: "invalid_token" });
    await env.DB.prepare("UPDATE oauth_client SET disabled=1 WHERE client_id=?")
      .bind(grant.clientId)
      .run();
    await expect(verifyMcpAccess(env, grant.accessToken)).rejects.toMatchObject({
      code: "invalid_token",
    });
    await env.DB.prepare("UPDATE oauth_client SET disabled=0 WHERE client_id=?")
      .bind(grant.clientId)
      .run();
    await expect(verifyMcpAccess(env, grant.accessToken)).resolves.toBeTruthy();
    await env.DB.prepare("UPDATE oauth_consent SET scopes=? WHERE client_id=?")
      .bind(JSON.stringify(JSON.stringify(["openid"])), grant.clientId)
      .run();
    await expect(verifyMcpAccess(env, grant.accessToken)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });
  it("授权表里 scopes 的几种存法都能读出", () => {
    expect(parseScopes('"[\\"mcp\\",\\"offline_access\\"]"')).toEqual(["mcp", "offline_access"]);
    expect(parseScopes('["mcp"]')).toEqual(["mcp"]);
    expect(parseScopes("mcp offline_access")).toEqual(["mcp", "offline_access"]);
    expect(parseScopes(["mcp", 1])).toEqual(["mcp"]);
    expect(parseScopes(null)).toEqual([]);
    expect(parseScopes("{}")).toEqual([]);
  });
});

describe("撤销授权", () => {
  it("设置页的撤销接口执行后，旧访问令牌立即被拒，其签名本身仍然有效", async () => {
    const cookie = await authenticatedCookie();
    const grant = await issueGrant({ cookie });
    await expect(verifyMcpAccess(env, grant.accessToken)).resolves.toBeTruthy();
    // 自包含JWT没有数据库行：T40撤销时删除的访问令牌行、撤销的刷新令牌，都碰不到它。
    expect(
      await env.DB.prepare("SELECT count(*) AS n FROM oauth_access_token WHERE client_id=?")
        .bind(grant.clientId)
        .first(),
    ).toEqual({ n: 0 });
    expect((await revokeConsent(cookie, grant.consentId)).status).toBe(200);
    await expect(verifyMcpAccess(env, grant.accessToken)).rejects.toMatchObject({
      code: "invalid_token",
    });
    expect(await hasCurrentMcpGrant(env.DB, grant.clientId, now())).toBe(false);
  });
  it("撤销后重新授权，新令牌可用，撤销前签发的旧令牌不会复活", async () => {
    const cookie = await authenticatedCookie();
    const first = await issueGrant({ cookie });
    expect((await revokeConsent(cookie, first.consentId)).status).toBe(200);
    // 授权建立时间按毫秒记、令牌签发时间按秒记；隔开一秒才能区分“同一秒内签发”与“撤销之后重新授权”。
    await new Promise((resolve) => setTimeout(resolve, 1100));
    const second = await issueGrant({ cookie, clientId: first.clientId });
    await expect(verifyMcpAccess(env, second.accessToken)).resolves.toMatchObject({
      clientId: first.clientId,
    });
    await expect(verifyMcpAccess(env, first.accessToken)).rejects.toMatchObject({
      code: "invalid_token",
    });
  });
});

describe("服务端故障不冒充令牌无效", () => {
  it("取不到公钥时原样抛出，/mcp 返回 500 而不是 401", async () => {
    const grant = await issueGrant();
    // 换一份绑定对象，得到全新的授权实例和公钥缓存，让公钥必须重新读取。
    const bindings = { ...env };
    vi.spyOn(getAuth(bindings).api, "getJwks").mockRejectedValue(new Error("数据库暂时不可用"));
    try {
      const error = await verifyMcpAccess(bindings, grant.accessToken).catch((e) => e);
      expect(error).not.toBeInstanceOf(McpAccessError);
      const response = await app.request(
        mcpResource(bindings),
        {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Accept: "application/json, text/event-stream",
            Authorization: `Bearer ${grant.accessToken}`,
          },
          body: JSON.stringify({ jsonrpc: "2.0", id: 1, method: "tools/list" }),
        },
        bindings,
      );
      expect(response.status).toBe(500);
      expect(response.headers.get("www-authenticate")).toBeNull();
    } finally {
      vi.restoreAllMocks();
    }
  });
});
