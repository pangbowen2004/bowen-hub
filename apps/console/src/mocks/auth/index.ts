import { HttpResponse, http } from "msw";

// 仅用于明确开启的页面样例环境；真实认证由实际Worker和虚拟认证器另行验收。
let keys = [{ id: "sample-key", name: "样例：本机通行密钥", createdAt: "2026-10-01T00:00:00Z" }];
let consents = [{ id: "sample-consent", clientId: "样例：研究客户端", scopes: ["mcp"] }];
export const authHandlers = [
  http.get("/auth/get-session", () =>
    HttpResponse.json({
      user: { id: "owner", name: "样例使用者" },
      session: { id: "sample-session", bootstrap: false },
    }),
  ),
  http.get("/auth/passkey/list-user-passkeys", () => HttpResponse.json(keys)),
  http.get("/auth/oauth2/get-consents", () => HttpResponse.json(consents)),
  http.post("/auth/oauth2/delete-consent", async ({ request }) => {
    const { id } = (await request.json()) as { id: string };
    consents = consents.filter((consent) => consent.id !== id);
    return new HttpResponse(null, { status: 200 });
  }),
  http.post("/auth/passkey/delete-passkey", async ({ request }) => {
    const { id } = (await request.json()) as { id: string };
    if (keys.length <= 1)
      return HttpResponse.json({ message: "请保留至少一把通行密钥" }, { status: 400 });
    keys = keys.filter((key) => key.id !== id);
    return HttpResponse.json({ status: true });
  }),
  http.post("/auth/sign-out", () => HttpResponse.json({ success: true })),
];
