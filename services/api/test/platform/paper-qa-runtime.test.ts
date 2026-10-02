import { SELF } from "cloudflare:test";
import { env } from "cloudflare:workers";
import { describe, expect, it } from "vitest";
import { authenticatedCookie } from "../auth/fixture";

describe("真实Durable Object入口仍运行完整鉴权", () => {
  it("配置的SQLite命名空间已实例化", () => {
    expect(env.PAPER_QA_RUNTIME).toBeDefined();
  });
  it("不带会话的问答仍为401", async () => {
    const response = await SELF.fetch("http://localhost/v1/papers/sample/ask", { method: "POST" });
    expect(response.status).toBe(401);
    expect(response.headers.get("X-Request-Id")).toBeTruthy();
  });
  it("服务令牌不能绕过私有写权限", async () => {
    const response = await SELF.fetch("http://localhost/v1/papers/sample/ask", {
      method: "POST",
      headers: { Authorization: "Bearer test-service-token" },
    });
    expect(response.status).toBe(403);
  });
  it("真实签名会话的跨源写入仍拒绝", async () => {
    const response = await SELF.fetch("http://localhost/v1/papers/sample/ask", {
      method: "POST",
      headers: { Cookie: await authenticatedCookie(), Origin: "https://untrusted.invalid" },
    });
    expect(response.status).toBe(403);
  });
  it("会话与Origin在DO内通过后进入原有业务处理", async () => {
    const response = await SELF.fetch("http://localhost/v1/papers/sample/ask", {
      method: "POST",
      headers: {
        Cookie: await authenticatedCookie(),
        Origin: "http://localhost",
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ question: "论文方法是什么？" }),
    });
    // T32合并前保留明确501，合并后不存在的论文返回404。
    expect([501, 404]).toContain(response.status);
  });
});
