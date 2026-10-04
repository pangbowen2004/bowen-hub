// 官方 MCP Inspector（网页与命令行，版本已锁定）连本地真实 API：完整 OAuth、列出全部 12 个工具、
// 调用工具；撤销授权后旧访问令牌立即被拒。API 是全新的本地 D1，通行密钥用 Chromium 虚拟认证器登记。
// 这只证明协议与授权链路真实可用，不替代 Kevin 本人的通行密钥登记与在 Claude 里连接 MCP。
import { execFile } from "node:child_process";
import { readFileSync, writeFileSync } from "node:fs";
import { promisify } from "node:util";
import { Paper as PaperSchema, PaperSummary as SummarySchema } from "@bowen-hub/contracts/zod";
import { expect as baseExpect, test } from "@playwright/test";
import editionRaw from "../../../../fixtures/samples/news/Edition.morning-2026-09-30.json" with {
  type: "json",
};
import paperRaw from "../../../../fixtures/samples/papers/Paper.arxiv-2505.07078.json" with {
  type: "json",
};
import summariesRaw from "../../../../fixtures/samples/papers/PaperSummary.all.json" with {
  type: "json",
};
import {
  BOOTSTRAP_TOKEN,
  CONSOLE_ORIGIN,
  INSPECTOR_API_TOKEN,
  INSPECTOR_ORIGIN,
  INSPECTOR_SECRETS,
  inspectorEnvironment,
  inspectorLauncher,
  MCP_URL,
  SERVICE_TOKEN,
} from "./shared";

// 机器负载高时页面和进程启动会慢，默认的 5 秒断言等待太紧。
const expect = baseExpect.configure({ timeout: 15_000 });
// docs/09 第 6 节的工具表，顺序一致。
const TOOLS = [
  "news_latest_edition",
  "news_search",
  "news_ticker_timeline",
  "watchlist_list",
  "watchlist_add",
  "watchlist_remove",
  "markets_day",
  "markets_hypotheses",
  "papers_search",
  "papers_get",
  "papers_ask",
  "papers_ingest_url",
];
const run = promisify(execFile);

/** Inspector 网页登录后保存的令牌；官方命令行的 --stored-auth-only 读取的是同一份。 */
function storedTokens(): { access_token: string; refresh_token?: string } {
  const store = JSON.parse(readFileSync(INSPECTOR_SECRETS, "utf8")) as {
    secrets: Record<string, string>;
  };
  const entry = Object.entries(store.secrets).find(([key]) => key.includes(":tokens:"));
  if (!entry) throw new Error("Inspector 没有保存令牌");
  return JSON.parse(entry[1]);
}

/** 带 Bearer 令牌（或不带）的原始 JSON-RPC 请求；用 Node 的 fetch，不带任何浏览器 Cookie。 */
function rpc(token: string | null, body: unknown): Promise<Response> {
  return fetch(MCP_URL, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/json, text/event-stream",
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  });
}
/** 无状态服务按 SSE 返回单条消息；取出其中的 JSON。 */
function parseSse(text: string): { result?: { tools?: { name: string }[] } } {
  const line = text.split("\n").find((value) => value.startsWith("data: "));
  if (!line) throw new Error(`响应里没有数据行：${text.slice(0, 200)}`);
  return JSON.parse(line.slice("data: ".length));
}
/** 官方 Inspector 命令行，只用网页登录后保存的令牌：--stored-auth-only 绝不另起交互式授权。 */
async function inspectorCli(
  method: string,
  extra: string[] = [],
): Promise<{ code: number; stdout: string; stderr: string }> {
  try {
    const { stdout } = await run(
      process.execPath,
      [
        inspectorLauncher(),
        "--cli",
        "--server-url",
        MCP_URL,
        "--transport",
        "http",
        "--method",
        method,
        ...extra,
        "--stored-auth-only",
        "--format",
        "json",
      ],
      { env: inspectorEnvironment(), timeout: 60000 },
    );
    return { code: 0, stdout, stderr: "" };
  } catch (error) {
    const failure = error as { code?: number; stdout?: string; stderr?: string };
    return {
      code: typeof failure.code === "number" ? failure.code : 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}
/** 经官方命令行调用一个工具，返回工具结果文本（工具把结果序列化成一段 JSON 文本）。 */
async function callTool(name: string, args: Record<string, unknown>): Promise<unknown> {
  const result = await inspectorCli("tools/call", [
    "--tool-name",
    name,
    "--tool-args-json",
    JSON.stringify(args),
  ]);
  expect(result.code, `${name}：${result.stdout.slice(0, 600)} ${result.stderr.slice(-300)}`).toBe(
    0,
  );
  const content = (
    JSON.parse(result.stdout) as {
      result: { isError?: boolean; content: { type: string; text: string }[] };
    }
  ).result;
  expect(content.isError, `${name} 返回了错误：${JSON.stringify(content.content)}`).toBeFalsy();
  return JSON.parse(content.content[0]?.text ?? "null");
}
/** 用服务令牌写入验收用的数据（与计算任务写入的方式相同）。 */
async function seed(path: string, method: string, body: unknown, type = "application/json") {
  const response = await fetch(`${CONSOLE_ORIGIN}${path}`, {
    method,
    headers: { Authorization: `Bearer ${SERVICE_TOKEN}`, "Content-Type": type },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  expect(response.status, `${method} ${path}`).toBe(204);
}

test("官方Inspector：真实OAuth、12个工具、调用工具，撤销授权后旧令牌立即被拒", async ({
  page,
  context,
}) => {
  test.setTimeout(180000);
  // 一、通行密钥首次登记（虚拟认证器），之后这个浏览器就是已登录的固定使用者。
  const cdp = await context.newCDPSession(page);
  await cdp.send("WebAuthn.enable");
  await cdp.send("WebAuthn.addVirtualAuthenticator", {
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
  await page.getByLabel("一次性登记口令").fill(BOOTSTRAP_TOKEN);
  await page.getByRole("button", { name: "登记我的通行密钥" }).click();
  await expect(page).toHaveURL(/\/settings$/, { timeout: 20000 });
  await expect(page.getByText("还没有授权任何客户端。")).toBeVisible();

  // 二、没有令牌时 /mcp 返回 OAuth 挑战，指向同源的资源元数据。
  const anonymous = await rpc(null, { jsonrpc: "2.0", id: 1, method: "tools/list" });
  expect(anonymous.status).toBe(401);
  expect(anonymous.headers.get("www-authenticate")).toContain(
    'resource_metadata="http://localhost:5277/.well-known/oauth-protected-resource/mcp"',
  );

  // 三、官方 Inspector 网页：连接 → 跳到控制台的授权确认页 → 允许 → 回到 Inspector 已连接。
  const inspector = await context.newPage();
  // 高一些的窗口让 12 个工具一屏放得下（留作证据截图）。
  await inspector.setViewportSize({ width: 1280, height: 1150 });
  await inspector.goto(`${INSPECTOR_ORIGIN}/?MCP_INSPECTOR_API_TOKEN=${INSPECTOR_API_TOKEN}`);
  await inspector.getByRole("switch").first().click({ force: true });
  await expect(inspector.getByRole("heading", { name: "授权客户端访问" })).toBeVisible({
    timeout: 20000,
  });
  await expect(inspector.getByText("请求范围：mcp offline_access")).toBeVisible();
  await inspector.getByRole("button", { name: "允许访问" }).click();
  await expect(inspector).toHaveURL(`${INSPECTOR_ORIGIN}/`, { timeout: 20000 });
  await expect(inspector.getByText("Connected", { exact: true })).toBeVisible({ timeout: 20000 });
  // 握手拿到的服务名就是我们的 serverInfo。
  await expect(inspector.getByText("research-console").first()).toBeVisible();

  // 四、Tools 页：恰好 12 个，与 docs/09 第 6 节一致；只读工具带 READ-ONLY 标记。
  await inspector.getByText("Tools", { exact: true }).first().click();
  await expect(
    inspector.getByRole("button", { name: "papers_ingest_url", exact: true }),
  ).toBeVisible();
  // 等“服务器”页淡出并卸载，列表才是稳定状态（截图也不会落在切换的中间帧）。
  await expect(inspector.getByText("Read-only session")).toBeHidden();
  const listed = (await inspector.locator("body").innerText())
    .split("\n")
    .map((line) => line.trim())
    .filter((line) => /^[a-z]+(?:_[a-z]+)+$/.test(line));
  expect(listed).toEqual(TOOLS);
  expect(listed).toHaveLength(12);
  await inspector.getByRole("button", { name: "watchlist_list", exact: true }).click();
  await expect(inspector.getByTestId("tools-screen").getByText("read-only")).toBeVisible();
  await inspector.screenshot({ path: "/tmp/bowen-t41-inspector-tools.png" });

  // 五、经 Inspector 真实调用一个工具：自选股此时为空数组。
  await inspector.getByRole("button", { name: "Execute Tool" }).click();
  await expect(inspector.getByText("Results", { exact: true })).toBeVisible();
  await expect(inspector.getByTestId("tools-screen")).toContainText("[]");

  // 六、Inspector 保存的访问令牌：直接调 /mcp 与官方命令行（--stored-auth-only）都能列出 12 个工具。
  const tokens = storedTokens();
  const direct = await rpc(tokens.access_token, { jsonrpc: "2.0", id: 2, method: "tools/list" });
  expect(direct.status).toBe(200);
  expect(parseSse(await direct.text()).result?.tools?.map((tool) => tool.name)).toEqual(TOOLS);
  const cliBefore = await inspectorCli("tools/list");
  expect(cliBefore.code).toBe(0);
  writeFileSync("/tmp/bowen-t41-inspector-cli-tools.json", cliBefore.stdout);
  expect(
    (JSON.parse(cliBefore.stdout) as { result: { tools: { name: string }[] } }).result.tools.map(
      (tool) => tool.name,
    ),
  ).toEqual(TOOLS);

  // 七、经官方命令行（同一份令牌）逐个调用工具：数据由服务令牌写入；模型与 GitHub 是离线夹具，不联网、不花钱。
  await seed("/v1/internal/news/editions/morning-2026-09-30", "PUT", editionRaw);
  const paper = PaperSchema.parse(paperRaw);
  paper.status.visibility = "private";
  const summary = SummarySchema.parse(summariesRaw.find((item) => item.id === paper.id));
  summary.visibility = "private";
  await seed(`/v1/internal/papers/${paper.id}`, "PUT", { paper, summary });
  const pageCount = paper.structure?.pageCount ?? 15;
  await seed(
    `/v1/internal/papers/${paper.id}/files/pages.txt`,
    "PUT",
    Array.from(
      { length: pageCount },
      (_, i) => `=== p.${i + 1} ===\nL1: 离线验收材料第${i + 1}页。\n`,
    ).join("\n"),
    "text/plain",
  );
  expect(await callTool("watchlist_list", {})).toEqual([]);
  expect(await callTool("news_latest_edition", { kind: "morning" })).toMatchObject({
    id: "morning-2026-09-30",
    kind: "morning",
  });
  expect(await callTool("papers_get", { id: paper.id })).toMatchObject({ id: paper.id });
  // 问答经 /mcp 转交 Durable Object 执行（ADR-0015），模型是离线夹具：答案、页码与出处照常返回。
  expect(await callTool("papers_ask", { id: paper.id, question: "结论是什么？" })).toMatchObject({
    answer: expect.stringContaining("离线模型传输夹具回答"),
    pages: [1],
  });
  expect(
    await callTool("papers_ingest_url", { url: "https://arxiv.org/abs/2505.07078" }),
  ).toMatchObject({ arxivUrl: "https://arxiv.org/abs/2505.07078", status: "queued" });

  // 八、设置页撤销授权后，同一个访问令牌立刻被拒（它的签名与有效期都还没过）。
  await page.goto("/settings");
  await expect(page.getByRole("button", { name: "撤销授权" })).toBeVisible();
  await page.getByRole("button", { name: "撤销授权" }).click();
  await expect(page.getByText("还没有授权任何客户端。")).toBeVisible();
  const revoked = await rpc(tokens.access_token, { jsonrpc: "2.0", id: 3, method: "tools/list" });
  expect(revoked.status).toBe(401);
  expect(revoked.headers.get("www-authenticate")).toContain('error="invalid_token"');
  const cliAfter = await inspectorCli("tools/list");
  expect(cliAfter.code).not.toBe(0);
  expect(cliAfter.stdout).not.toContain("news_latest_edition");
  // 官方客户端先发现访问令牌被拒，再拿刷新令牌换新的也失败（T40 撤销时已作废），最终报需要重新授权。
  expect(cliAfter.stderr).toContain("auth_required");
});
