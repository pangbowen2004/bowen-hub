import { createHash } from "node:crypto";
import { expect, test } from "@playwright/test";

test("真实通行密钥首次登记、三个屏幕登录和注销", async ({ page, context }) => {
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  const { authenticatorId } = await cdp.send("WebAuthn.addVirtualAuthenticator", {
    options: {
      protocol: "ctap2",
      transport: "internal",
      hasResidentKey: true,
      hasUserVerification: true,
      isUserVerified: true,
      automaticPresenceSimulation: true,
    },
  });
  await page.goto("/settings");
  await expect(page).toHaveURL(/\/login/);
  await page.getByText("第一次使用？登记通行密钥").click();
  await page.getByLabel("一次性登记口令").fill("e2e-bootstrap-only");
  await page.getByRole("button", { name: "登记我的通行密钥" }).click();
  await expect(page).toHaveURL(/\/settings$/, { timeout: 20000 });
  await expect(page.getByText("我的通行密钥", { exact: true })).toBeVisible();
  expect((await cdp.send("WebAuthn.getCredentials", { authenticatorId })).credentials).toHaveLength(
    1,
  );
  for (const [width, height] of [
    [390, 844],
    [768, 1024],
    [1440, 900],
  ] as const) {
    await page.setViewportSize({ width, height });
    await page.getByRole("button", { name: "退出登录" }).click();
    await expect(page).toHaveURL(/\/login/);
    expect((await context.request.get("/v1/watchlist")).status()).toBe(401);
    await page.goto("/settings");
    await page.getByRole("button", { name: "使用通行密钥登录" }).click();
    await expect(page).toHaveURL(/\/settings$/, { timeout: 20000 });
    expect((await context.request.get("/v1/watchlist")).status()).toBe(200);
    await expect(page.getByRole("button", { name: "删除", exact: true })).toBeDisabled();
    expect(await page.evaluate(() => document.documentElement.scrollWidth <= innerWidth)).toBe(
      true,
    );
    await page.screenshot({ path: `/tmp/bowen-t40-real-settings-${width}.png`, fullPage: true });
  }
  const registration = await context.request.post("/auth/oauth2/register", {
    headers: { Origin: "http://localhost:5275" },
    data: {
      client_name: "本地验收客户端",
      application_type: "native",
      redirect_uris: ["http://localhost:5275/oauth-return"],
      token_endpoint_auth_method: "none",
      grant_types: ["authorization_code", "refresh_token"],
      response_types: ["code"],
      scope: "mcp offline_access",
    },
  });
  if (!registration.ok()) {
    const failure = (await registration.json()) as {
      code?: string;
      message?: string;
      error_description?: string;
    };
    throw new Error(
      `客户端登记失败：${registration.status()} ${failure.code ?? ""} ${failure.message ?? failure.error_description ?? ""}`,
    );
  }
  const client = (await registration.json()) as { client_id: string };
  const verifier = "auth-e2e-proof-key-verifier-with-more-than-43-characters";
  const challenge = createHash("sha256").update(verifier).digest("base64url");
  const authorization = new URLSearchParams({
    client_id: client.client_id,
    redirect_uri: "http://localhost:5275/oauth-return",
    response_type: "code",
    scope: "mcp offline_access",
    resource: "http://localhost:5275/mcp",
    code_challenge: challenge,
    code_challenge_method: "S256",
    state: "local-e2e-state",
  });
  await page.goto(`/auth/oauth2/authorize?${authorization}`);
  await expect(page.getByRole("heading", { name: "授权客户端访问" })).toBeVisible();
  await page.getByRole("button", { name: "允许访问" }).click();
  await expect(page).toHaveURL(/\/oauth-return\?/, { timeout: 10000 });
  const returned = new URL(page.url());
  expect(returned.searchParams.get("state")).toBe("local-e2e-state");
  const code = returned.searchParams.get("code");
  expect(code).toBeTruthy();
  const tokens = await context.request.post("/auth/oauth2/token", {
    headers: { Origin: "http://localhost:5275" },
    form: {
      grant_type: "authorization_code",
      client_id: client.client_id,
      code: code!,
      redirect_uri: "http://localhost:5275/oauth-return",
      code_verifier: verifier,
      resource: "http://localhost:5275/mcp",
    },
  });
  expect(tokens.status()).toBe(200);
  const tokenData = (await tokens.json()) as { access_token: string; refresh_token: string };
  expect(tokenData.access_token).toBeTruthy();
  expect(tokenData.refresh_token).toBeTruthy();
  const rotated = await context.request.post("/auth/oauth2/token", {
    headers: { Origin: "http://localhost:5275" },
    form: {
      grant_type: "refresh_token",
      client_id: client.client_id,
      refresh_token: tokenData.refresh_token,
      resource: "http://localhost:5275/mcp",
    },
  });
  expect(rotated.status()).toBe(200);
  const nextTokens = (await rotated.json()) as { refresh_token: string };
  await page.goto("/settings");
  await expect(page.getByText(client.client_id, { exact: true })).toBeVisible();
  await page.getByRole("button", { name: "撤销授权" }).click();
  await expect(page.getByText("还没有授权任何客户端。")).toBeVisible();
  const refresh = await context.request.post("/auth/oauth2/token", {
    headers: { Origin: "http://localhost:5275" },
    form: {
      grant_type: "refresh_token",
      client_id: client.client_id,
      refresh_token: tokenData.refresh_token,
      resource: "http://localhost:5275/mcp",
    },
  });
  expect(refresh.status()).toBe(400);
  const nextRefresh = await context.request.post("/auth/oauth2/token", {
    headers: { Origin: "http://localhost:5275" },
    form: {
      grant_type: "refresh_token",
      client_id: client.client_id,
      refresh_token: nextTokens.refresh_token,
      resource: "http://localhost:5275/mcp",
    },
  });
  expect(nextRefresh.status()).toBe(400);
  expect(
    (
      await context.request.post("/auth/bootstrap", {
        data: { token: "e2e-bootstrap-only" },
        headers: { Origin: "http://localhost:5275" },
      })
    ).status(),
  ).toBe(403);
  await cdp.send("WebAuthn.removeVirtualAuthenticator", { authenticatorId });
});
