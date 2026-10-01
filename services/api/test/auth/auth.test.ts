import { env } from "cloudflare:workers";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { matchesToken, OWNER_ID } from "../../src/lib/auth/bootstrap";
import type { Bindings } from "../../src/lib/env";
import { authenticatedCookie } from "./fixture";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM user").run();
});
const request = (
  path: string,
  body?: unknown,
  cookie?: string,
  bindings: Bindings = env,
  origin = bindings.AUTH_BASE_URL,
) =>
  app.request(
    `${bindings.AUTH_BASE_URL}${path}`,
    {
      method: body === undefined ? "GET" : "POST",
      headers: {
        Origin: origin,
        "Content-Type": "application/json",
        ...(cookie ? { Cookie: cookie } : {}),
      },
      ...(body === undefined ? {} : { body: JSON.stringify(body) }),
    },
    bindings,
  );
const bootstrap = () => request("/auth/bootstrap", { token: env.HUB_BOOTSTRAP_TOKEN });
const responseCookie = (response: Response) =>
  response.headers.get("set-cookie")?.split(";")[0] ?? "";

describe("唯一使用者与真实签名会话", () => {
  it("本地模式也拒绝未登录私有接口，内部服务令牌规则保留", async () => {
    expect((await request("/v1/watchlist")).status).toBe(401);
    expect(
      (
        await app.request(
          "http://localhost/v1/watchlist",
          { headers: { Authorization: "Bearer test-service-token" } },
          env,
        )
      ).status,
    ).toBe(200);
    expect(
      (
        await app.request(
          "http://localhost/v1/watchlist/TEST",
          { method: "DELETE", headers: { Authorization: "Bearer test-service-token" } },
          env,
        )
      ).status,
    ).toBe(403);
  });
  it("口令比较拒绝空值、缺配置和不同长度", () => {
    expect(matchesToken("", "")).toBe(false);
    expect(matchesToken("abc", undefined)).toBe(false);
    expect(matchesToken("abcd", "abc")).toBe(false);
    expect(matchesToken("abc", "abc")).toBe(true);
  });
  it("错误口令和来源不创建使用者", async () => {
    expect((await request("/auth/bootstrap", { token: "invalid" })).status).toBe(401);
    expect(
      (
        await request(
          "/auth/bootstrap",
          { token: env.HUB_BOOTSTRAP_TOKEN },
          undefined,
          env,
          "https://other.invalid",
        )
      ).status,
    ).toBe(403);
    expect(await env.DB.prepare("SELECT count(*) AS n FROM user").first()).toEqual({ n: 0 });
  });
  it("并发首次登记只有一个使用者，所有等待会话保持受限", async () => {
    const responses = await Promise.all([bootstrap(), bootstrap(), bootstrap()]);
    for (const response of responses) {
      expect(response.status).toBe(200);
      const cookie = response.headers.get("set-cookie");
      expect(cookie).toContain("HttpOnly");
      expect(cookie).toContain("SameSite=Lax");
      expect(cookie).not.toContain("Domain=");
      expect((await request("/v1/watchlist", undefined, responseCookie(response))).status).toBe(
        401,
      );
      expect(
        (await request("/auth/oauth2/get-consents", undefined, responseCookie(response))).status,
      ).toBe(403);
    }
    expect(await env.DB.prepare("SELECT count(*) AS n FROM user").first()).toEqual({ n: 1 });
    expect(
      await env.DB.prepare("SELECT count(*) AS n FROM session WHERE bootstrap=1").first(),
    ).toEqual({ n: 3 });
  });
  it("存在凭据永久消耗口令，也不会自动升级其他等待会话", async () => {
    const pending = responseCookie(await bootstrap());
    await authenticatedCookie();
    expect((await bootstrap()).status).toBe(403);
    expect((await request("/v1/watchlist", undefined, pending)).status).toBe(401);
  });
  it("真实签名会话可读写，注销后失效，篡改Cookie拒绝", async () => {
    const cookie = await authenticatedCookie();
    expect((await request("/v1/watchlist", undefined, cookie)).status).toBe(200);
    expect((await request("/v1/watchlist", undefined, `${cookie}altered`)).status).toBe(401);
    expect((await request("/auth/sign-out", {}, cookie)).status).toBe(200);
    expect((await request("/v1/watchlist", undefined, cookie)).status).toBe(401);
  });
  it("未登记不能申请注册选项，密码注册和恢复入口关闭", async () => {
    expect((await request("/auth/passkey/generate-register-options")).status).toBe(401);
    for (const path of [
      "/sign-up/email",
      "/sign-in/email",
      "/request-password-reset",
      "/reset-password",
    ])
      expect((await request(`/auth${path}`, {})).status).toBe(404);
  });
  it("不允许删除唯一通行密钥，错误来源不能注销", async () => {
    const cookie = await authenticatedCookie();
    expect(
      (await request("/auth/passkey/delete-passkey", { id: "fixture-passkey" }, cookie)).status,
    ).toBe(400);
    expect((await request("/auth/sign-out", {}, cookie, env, "https://other.invalid")).status).toBe(
      403,
    );
    expect((await request("/v1/watchlist", undefined, cookie)).status).toBe(200);
  });
  it("首把完成后等待会话不能继续登记，口令保持永久作废", async () => {
    const pending = responseCookie(await bootstrap());
    await authenticatedCookie();
    expect(
      (await request("/auth/passkey/generate-register-options", undefined, pending)).status,
    ).toBe(403);
    expect(
      (await request("/auth/passkey/verify-registration", { createSession: true }, pending)).status,
    ).toBe(403);
    await env.DB.prepare("DELETE FROM passkey").run();
    expect((await bootstrap()).status).toBe(403);
  });
  it("并发删除两把密钥只成功一次，保留最后一把", async () => {
    const cookie = await authenticatedCookie();
    await env.DB.prepare(
      `INSERT INTO passkey SELECT 'second-passkey',name,public_key,user_id,'second-credential',counter,device_type,backed_up,transports,created_at,aaguid FROM passkey WHERE id='fixture-passkey'`,
    ).run();
    const results = await Promise.all([
      request("/auth/passkey/delete-passkey", { id: "fixture-passkey" }, cookie),
      request("/auth/passkey/delete-passkey", { id: "second-passkey" }, cookie),
    ]);
    expect(results.map((r) => r.status).sort()).toEqual([200, 400]);
    expect(await env.DB.prepare("SELECT count(*) AS n FROM passkey").first()).toEqual({ n: 1 });
    expect((await bootstrap()).status).toBe(403);
  });
  it("私有写操作要求可信来源", async () => {
    const cookie = await authenticatedCookie();
    expect(
      (await request("/v1/watchlist/UNKNOWN", {}, cookie, env, "https://other.invalid")).status,
    ).toBe(403);
    expect(
      (
        await app.request(
          "http://localhost/v1/watchlist/UNKNOWN",
          { method: "DELETE", headers: { Cookie: cookie } },
          env,
        )
      ).status,
    ).toBe(403);
  });
  it("过期登记占用可以回收，失败请求释放新的占用", async () => {
    const pending = responseCookie(await bootstrap());
    await env.DB.prepare(
      "UPDATE user SET bootstrap_registration_session='expired-session' WHERE id=?",
    )
      .bind(OWNER_ID)
      .run();
    const response = await request("/auth/passkey/verify-registration", { response: {} }, pending);
    expect(response.status).not.toBe(403);
    expect(
      await env.DB.prepare("SELECT bootstrap_registration_session AS claim FROM user WHERE id=?")
        .bind(OWNER_ID)
        .first(),
    ).toEqual({ claim: null });
  });
  it("正式Cookie具有Secure且只属于控制台域", async () => {
    const base = "https://console.example.invalid";
    const bindings = {
      ...env,
      AUTH_BASE_URL: base,
      AUTH_RP_ID: "console.example.invalid",
      AUTH_TRUSTED_ORIGINS: base,
    };
    const response = await request(
      "/auth/bootstrap",
      { token: env.HUB_BOOTSTRAP_TOKEN },
      undefined,
      bindings,
    );
    expect(response.status).toBe(200);
    const cookie = response.headers.get("set-cookie");
    expect(cookie).toContain("Secure");
    expect(cookie).toContain("HttpOnly");
    expect(cookie).toContain("SameSite=Lax");
    expect(cookie).not.toContain("Domain=");
  });
  it("标准OAuth元数据由真实插件给出", async () => {
    const response = await request("/.well-known/oauth-authorization-server/auth");
    expect(response.status).toBe(200);
    const metadata = (await response.json()) as Record<string, unknown>;
    expect(metadata.issuer).toBe(`${env.AUTH_BASE_URL}/auth`);
    expect(metadata.authorization_endpoint).toBe(`${env.AUTH_BASE_URL}/auth/oauth2/authorize`);
    expect(metadata.code_challenge_methods_supported).toContain("S256");
    const resource = await request("/.well-known/oauth-protected-resource/mcp");
    expect(resource.status).toBe(200);
    expect(await resource.json()).toMatchObject({
      resource: `${env.AUTH_BASE_URL}/mcp`,
      authorization_servers: [`${env.AUTH_BASE_URL}/auth`],
    });
    expect((await request("/.well-known/unknown")).status).toBe(404);
    expect(
      await env.DB.prepare("SELECT count(*) AS n FROM user WHERE id=?").bind(OWNER_ID).first(),
    ).toEqual({ n: 0 });
  });
});
