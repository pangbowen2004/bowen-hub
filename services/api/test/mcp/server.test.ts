// /mcp 的传输与OAuth保护：令牌来自Better Auth真实授权流程，客户端用官方SDK；
// 工具逐个经传输调通，数据用各模块service写入，问答的模型与GitHub派发用离线假响应。
import { env } from "cloudflare:workers";
import type {
  Article,
  Edition,
  Hypothesis,
  MarketDay,
  MarketDaySummary,
  Paper,
} from "@bowen-hub/contracts";
import * as z from "@bowen-hub/contracts/zod";
import type { Client } from "@modelcontextprotocol/client";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import ledgerFixture from "../../../../fixtures/samples/markets/Hypothesis.ledger.json";
import dayFixture from "../../../../fixtures/samples/markets/MarketDay.2026-08-28.json";
import summaryFixture from "../../../../fixtures/samples/markets/MarketDaySummary.2026-08-28.json";
import { mcpResource } from "../../src/lib/auth/mcp-access";
import * as markets from "../../src/modules/markets/service";
import { exposedTools, MCP_TOOL_NAMES, tools } from "../../src/modules/mcp/registry";
import * as news from "../../src/modules/news/service";
import * as papers from "../../src/modules/papers/service";
import { authenticatedCookie } from "../auth/fixture";
import { connect, forgeToken, getMetadata, issueGrant, revokeConsent, rpc } from "./oauth";

const initialize = {
  jsonrpc: "2.0",
  id: 1,
  method: "initialize",
  params: {
    protocolVersion: "2025-06-18",
    capabilities: {},
    clientInfo: { name: "测试", version: "1" },
  },
};
const listTools = { jsonrpc: "2.0", id: 2, method: "tools/list" };
const text = (result: unknown): string => {
  const content = (result as { content: { type: string; text: string }[] }).content;
  return content.map((part) => part.text).join("");
};
const json = (result: unknown): unknown => JSON.parse(text(result));

beforeEach(async () => {
  await env.DB.batch(
    ["oauth_consent", "oauth_refresh_token", "oauth_access_token", "oauth_client", "user"].map(
      (table) => env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});
afterEach(() => vi.restoreAllMocks());

describe("OAuth保护", () => {
  it("未带令牌返回401与RFC 9728挑战，挑战里的元数据地址指向本服务", async () => {
    const response = await rpc(null, listTools);
    expect(response.status).toBe(401);
    const challenge = response.headers.get("www-authenticate") ?? "";
    expect(challenge).toMatch(/^Bearer /);
    expect(challenge).toContain('scope="mcp"');
    const metadataUrl = /resource_metadata="([^"]+)"/.exec(challenge)?.[1];
    expect(metadataUrl).toBe(`${env.AUTH_BASE_URL}/.well-known/oauth-protected-resource/mcp`);
    // 客户端据此取到的元数据：受众就是 /mcp，授权服务器就是本服务的 /auth。
    expect(await (await getMetadata(String(metadataUrl))).json()).toMatchObject({
      resource: mcpResource(env),
      authorization_servers: [`${env.AUTH_BASE_URL}/auth`],
      scopes_supported: ["mcp"],
    });
  });
  it("乱写的令牌、服务令牌、受众不对的令牌都是401，没有 mcp 范围是403", async () => {
    const grant = await issueGrant();
    const client = { azp: grant.clientId, client_id: grant.clientId };
    for (const token of [
      "garbage",
      "test-service-token",
      await forgeToken({ ...client, aud: "http://localhost/other" }),
    ]) {
      const response = await rpc(token, listTools);
      expect(response.status, token.slice(0, 12)).toBe(401);
      expect(response.headers.get("www-authenticate")).toContain('error="invalid_token"');
    }
    const noScope = await rpc(await forgeToken({ ...client, scope: "openid" }), listTools);
    expect(noScope.status).toBe(403);
    expect(noScope.headers.get("www-authenticate")).toContain('error="insufficient_scope"');
  });
  it("带Origin的请求必须来自控制台，命令行与服务端客户端不带Origin放行", async () => {
    const grant = await issueGrant();
    const foreign = await rpc(grant.accessToken, listTools, {
      headers: { Origin: "https://evil.example" },
    });
    expect(foreign.status).toBe(403);
    expect(await foreign.json()).toMatchObject({ error: { message: "请求来源不被允许" } });
    expect((await rpc(grant.accessToken, listTools, { headers: { Origin: "null" } })).status).toBe(
      403,
    );
    expect(
      (await rpc(grant.accessToken, initialize, { headers: { Origin: env.AUTH_BASE_URL } })).status,
    ).toBe(200);
    expect((await rpc(grant.accessToken, initialize)).status).toBe(200);
  });
  it("设置页撤销授权后，同一个访问令牌立刻401", async () => {
    const cookie = await authenticatedCookie();
    const grant = await issueGrant({ cookie });
    expect((await rpc(grant.accessToken, listTools)).status).toBe(200);
    const revoked = await revokeConsent(cookie, grant.consentId);
    expect(revoked.status).toBe(200);
    const after = await rpc(grant.accessToken, listTools);
    expect(after.status).toBe(401);
    expect(after.headers.get("www-authenticate")).toContain('error="invalid_token"');
  });
  it("授权时没带 resource 参数（RFC 8707，MCP 授权规范要求客户端带）得到的是不透明令牌，/mcp 返回401与挑战", async () => {
    const grant = await issueGrant({ resource: null });
    // 不透明令牌不是 JWT，没有受众可核对；客户端按挑战重新走授权并带上 resource 即可。
    expect(grant.accessToken.split(".")).toHaveLength(1);
    const response = await rpc(grant.accessToken, listTools);
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
  });
  it("流式GET与会话DELETE不被支持：无状态服务", async () => {
    const grant = await issueGrant();
    for (const method of ["GET", "DELETE"]) {
      expect((await rpc(grant.accessToken, undefined, { method })).status, method).toBe(405);
    }
    expect((await rpc(null, undefined, { method: "GET" })).status).toBe(401);
  });
});

describe("工具清单", () => {
  it("旧版握手：initialize给出服务信息与使用说明，tools/list 恰好12个工具且顺序与docs/09一致", async () => {
    const grant = await issueGrant();
    const init = await rpc(grant.accessToken, initialize);
    expect(init.status).toBe(200);
    expect(await init.text()).toContain('"serverInfo":{"name":"research-console"');
    const client = await connect(grant.accessToken, "legacy");
    expect(client.getProtocolEra()).toBe("legacy");
    const listed = await client.listTools();
    expect(listed.tools.map((tool) => tool.name)).toEqual([...MCP_TOOL_NAMES]);
    expect(listed.tools).toHaveLength(12);
    await client.close();
  });
  it("新版协议（2026-07-28）同样列出这12个工具", async () => {
    const grant = await issueGrant();
    const client = await connect(grant.accessToken, "auto");
    expect(client.getProtocolEra()).toBe("modern");
    expect(client.getNegotiatedProtocolVersion()).toBe("2026-07-28");
    expect((await client.listTools()).tools.map((tool) => tool.name)).toEqual([...MCP_TOOL_NAMES]);
    await client.close();
  });
  it("每个工具都有对象入参schema、说明和行为提示；八个查询工具标明只读", async () => {
    const grant = await issueGrant();
    const client = await connect(grant.accessToken);
    const listed = (await client.listTools()).tools;
    const readOnly = listed.filter((tool) => tool.annotations?.readOnlyHint === true);
    expect(readOnly.map((tool) => tool.name)).toEqual([
      "news_latest_edition",
      "news_search",
      "news_ticker_timeline",
      "watchlist_list",
      "markets_day",
      "markets_hypotheses",
      "papers_search",
      "papers_get",
    ]);
    for (const tool of listed) {
      expect(tool.inputSchema.type, tool.name).toBe("object");
      expect(tool.description?.length, tool.name).toBeGreaterThan(4);
      expect(tool.annotations, tool.name).toBeDefined();
    }
    // 自选股新增必须带完整资料：schema 里就是必填，客户端会先向用户补问。
    const add = listed.find((tool) => tool.name === "watchlist_add");
    expect(add?.inputSchema.required).toEqual(
      expect.arrayContaining(["symbol", "name", "kind", "group"]),
    );
    await client.close();
  });
  it("只开放文档列出的工具：模块多声明的工具不会自动对外", () => {
    expect(exposedTools().map((tool) => tool.name)).toEqual([...MCP_TOOL_NAMES]);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
    expect(tools.map((tool) => tool.name).sort()).toEqual([...MCP_TOOL_NAMES].sort());
  });
});

const now = new Date().toISOString();
const today = new Date(Date.now() + 8 * 3600 * 1000).toISOString().slice(0, 10);
const edition: Edition = {
  id: "morning-mcp",
  kind: "morning",
  date: today,
  window: { fromAt: null, toAt: null },
  generatedAt: now,
  lede: null,
  sections: [],
  sources: [],
  aiUsage: null,
  email: null,
};
const article: Article = {
  id: "mcp-a",
  sourceId: "rss",
  kind: "news",
  title: "Nvidia earnings report",
  summary: "chips sales",
  url: "https://news.example/mcp-a",
  publishedAt: now,
  lang: "en",
  tickers: ["NVDA"],
  topics: [],
  paywall: "none",
  clusterId: null,
};
const watchItem = {
  symbol: "NVDA",
  name: "英伟达",
  kind: "stock",
  group: "半导体",
  underlying: null,
  sectorEtf: "SMH",
  aliases: ["Nvidia"],
  active: true,
};
const paper: Paper = {
  schemaVersion: 1,
  id: "mcp-paper",
  meta: { title: "传输接线夹具论文" },
  status: {
    visibility: "private",
    review: "passed",
    readingDepth: "R1",
    nextAction: "阅读",
    updatedAt: "2026-10-02",
  },
  guide: { article: "假论文导读，只验证传输接线" },
  evidence: { claims: [{ id: "c1", kind: "result", claim: "结果有限", pdfPage: 2 }] },
  structure: { pageCount: 2 },
};
const pages = "=== p.1 ===\nL1: 假论文方法。\n\n=== p.2 ===\nL1: 假论文结果有限。\n";

describe("12个工具逐个经传输调通", () => {
  it("新闻、自选股、市场、论文全部走通；工具结果是JSON文本", async () => {
    const day: MarketDay = { ...z.MarketDay.parse(dayFixture), date: "2026-08-28" };
    const summary: MarketDaySummary = {
      ...z.MarketDaySummary.parse(summaryFixture),
      date: "2026-08-28",
    };
    const hypothesis: Hypothesis = {
      ...z.Hypothesis.parse(ledgerFixture[0]),
      id: "mcp-h",
      createdOn: today,
      result: "PENDING",
      settledOn: null,
      actual: null,
    };
    await Promise.all(
      ["watch_items", "papers", "market_days", "market_hypotheses", "editions", "articles"].map(
        (table) => env.DB.prepare(`DELETE FROM ${table}`).run(),
      ),
    );
    await news.putEdition(env.DB, edition.id, edition);
    await news.putArticles(env.DB, [article]);
    await markets.putDay(env.DB, "2026-08-28", { day, summary });
    await markets.putHypotheses(env.DB, [hypothesis]);
    await papers.putPaper(env.DB, paper.id, {
      paper,
      summary: {
        id: paper.id,
        title: paper.meta.title,
        titleZh: null,
        year: null,
        venue: null,
        oneSentence: null,
        spaces: [],
        readingDepth: "R1",
        paperKind: null,
        paperType: null,
        visibility: "private",
        review: "passed",
        updatedAt: "2026-10-02",
        hasCode: false,
        conceptCount: 0,
      },
    });
    await env.FILES.put(`papers/${paper.id}/pages.txt`, pages);
    // 外部只有模型网关与GitHub派发，两者都用离线响应；其余请求不应出现。
    const gateway = (answer: string) => {
      const chunk = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
      return new Response(
        `${chunk({ id: "x", choices: [{ index: 0, delta: { role: "assistant", content: answer }, finish_reason: null }] })}${chunk({ id: "x", choices: [{ index: 0, delta: {}, finish_reason: "stop" }] })}${chunk({ id: "x", choices: [], usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 0 } } })}data: [DONE]\n\n`,
        { headers: { "Content-Type": "text/event-stream" } },
      );
    };
    const external: string[] = [];
    vi.spyOn(globalThis, "fetch").mockImplementation(async (input) => {
      const url = new URL(
        typeof input === "string" ? input : input instanceof Request ? input.url : String(input),
      );
      external.push(url.hostname);
      if (url.hostname === "gateway.ai.cloudflare.com") return gateway("结果有限[论文 p.2]");
      if (url.hostname === "api.github.com") return new Response(null, { status: 204 });
      throw new Error(`不该出现的外部请求：${url.hostname}`);
    });
    // 这里测进程内接线（模型网关用离线假响应）；转交 Durable Object 的行为单独测，见下面的用例。
    const bindings = { ...env, OPENAI_API_KEY: "offline-test-key", PAPER_QA_RUNTIME: undefined };
    const grant = await issueGrant({ bindings });
    const client: Client = await connect(grant.accessToken, "legacy", bindings);
    const call = (name: string, args: Record<string, unknown> = {}) =>
      client.callTool({ name, arguments: args });

    // 新闻
    expect(json(await call("news_latest_edition", { kind: "morning" }))).toEqual(edition);
    expect(json(await call("news_search", { query: "Nvidia", ticker: "NVDA" }))).toEqual([article]);
    expect(
      z.NewsFullTimelineItem.array().parse(
        json(await call("news_ticker_timeline", { symbol: "NVDA" })),
      ),
    ).toHaveLength(1);
    // 自选股：新增、读取、删除
    expect(json(await call("watchlist_list"))).toEqual([]);
    expect(json(await call("watchlist_add", watchItem))).toEqual(watchItem);
    expect(json(await call("watchlist_list"))).toEqual([watchItem]);
    expect(json(await call("watchlist_remove", { symbol: "NVDA" }))).toEqual({ removed: true });
    expect(json(await call("watchlist_list"))).toEqual([]);
    // 市场
    expect(json(await call("markets_day", { date: "2026-08-28" }))).toEqual(day);
    const pending = json(await call("markets_hypotheses", { status: "PENDING", days: 1 })) as {
      items: { id: string }[];
    };
    expect(pending.items.map((item) => item.id)).toContain("mcp-h");
    // 论文
    const found = json(await call("papers_search", { query: "传输接线夹具论文" })) as {
      items: { id: string }[];
    };
    expect(found.items.map((item) => item.id)).toContain(paper.id);
    expect((json(await call("papers_get", { id: paper.id })) as Paper).id).toBe(paper.id);
    const answer = json(await call("papers_ask", { id: paper.id, question: "结果是什么？" })) as {
      answer: string;
      pages: number[];
    };
    expect(answer.answer).toContain("结果有限");
    expect(answer.pages).toEqual([2]);
    const upload = json(
      await call("papers_ingest_url", { url: "https://arxiv.org/abs/2505.07078" }),
    ) as { arxivUrl: string; status: string };
    expect(upload.arxivUrl).toBe("https://arxiv.org/abs/2505.07078");
    expect(upload.status).toBe("queued");
    // 外部请求只有模型网关与GitHub派发；问答的真实用量已记入ai_calls。
    expect(new Set(external)).toEqual(new Set(["gateway.ai.cloudflare.com", "api.github.com"]));
    expect(
      await env.DB.prepare(
        "SELECT capability, ok FROM ai_calls WHERE capability='papers.qa'",
      ).first(),
    ).toEqual({ capability: "papers.qa", ok: 1 });
    await client.close();
  });
});

describe("失败以工具结果返回，不是协议错误", () => {
  it("参数不合格、资料不存在、问答网关未配置都带原因且isError", async () => {
    const grant = await issueGrant();
    const client = await connect(grant.accessToken);
    const invalid = await client.callTool({
      name: "news_latest_edition",
      arguments: { kind: "daily" },
    });
    expect(invalid.isError).toBe(true);
    expect(text(invalid)).toContain("kind");
    const missing = await client.callTool({
      name: "papers_get",
      arguments: { id: "no-such-paper" },
    });
    expect(missing).toMatchObject({ isError: true });
    expect(text(missing)).toBe("论文不存在");
    const add = await client.callTool({ name: "watchlist_add", arguments: { symbol: "NVDA" } });
    expect(add.isError).toBe(true);
    const badLink = await client.callTool({
      name: "papers_ingest_url",
      arguments: { url: "https://example.com/paper.pdf" },
    });
    expect(text(badLink)).toBe("仅支持arXiv论文链接");
    await client.close();
  });
});

describe("papers_ask 转交 Durable Object（ADR-0015）", () => {
  /** 包一层命名空间，记录哪些请求被转交；真正的对象照常执行。 */
  function spyObjects() {
    const forwarded: { marker: string | null }[] = [];
    const real = env.PAPER_QA_RUNTIME as DurableObjectNamespace;
    const objects = {
      idFromName: (name: string) => real.idFromName(name),
      get: (id: DurableObjectId) => ({
        fetch: (request: Request) => {
          forwarded.push({ marker: request.headers.get("x-hub-in-object") });
          return real.get(id).fetch(request);
        },
      }),
    } as unknown as DurableObjectNamespace;
    return { forwarded, bindings: { ...env, PAPER_QA_RUNTIME: objects } };
  }
  const ask = {
    jsonrpc: "2.0",
    id: 7,
    method: "tools/call",
    params: { name: "papers_ask", arguments: { id: "no-such-paper", question: "结果是什么？" } },
  };
  const data = (text: string) =>
    JSON.parse(
      text
        .split("\n")
        .find((line) => line.startsWith("data: "))
        ?.slice(6) ?? "null",
    );

  it("调用 papers_ask 的请求交给对象执行，对象里重新核对令牌并返回同样的工具结果", async () => {
    const grant = await issueGrant();
    const { forwarded, bindings } = spyObjects();
    const response = await rpc(grant.accessToken, ask, { bindings });
    expect(response.status).toBe(200);
    expect(forwarded).toEqual([{ marker: "1" }]);
    expect(data(await response.text()).result).toMatchObject({
      isError: true,
      content: [{ type: "text", text: "论文不存在" }],
    });
  });
  it("批量请求里含 papers_ask 也转交；其他工具和握手留在本 Worker", async () => {
    const grant = await issueGrant();
    const { forwarded, bindings } = spyObjects();
    await rpc(grant.accessToken, [listTools, ask], { bindings }).then((response) =>
      response.text(),
    );
    expect(forwarded).toHaveLength(1);
    for (const body of [
      initialize,
      listTools,
      { ...ask, params: { name: "papers_get", arguments: { id: "x" } } },
    ])
      expect((await rpc(grant.accessToken, body, { bindings })).status).toBe(200);
    expect(forwarded).toHaveLength(1);
  });
  it("没通过鉴权的 papers_ask 不会唤醒对象", async () => {
    const grant = await issueGrant();
    const { forwarded, bindings } = spyObjects();
    expect((await rpc(null, ask, { bindings })).status).toBe(401);
    expect((await rpc("garbage", ask, { bindings })).status).toBe(401);
    const noScope = await forgeToken({
      azp: grant.clientId,
      client_id: grant.clientId,
      scope: "openid",
    });
    expect((await rpc(noScope, ask, { bindings })).status).toBe(403);
    expect(forwarded).toHaveLength(0);
  });
  it("已经带转交标记的请求在原处执行，不会无限转交", async () => {
    const grant = await issueGrant();
    const { forwarded, bindings } = spyObjects();
    const response = await rpc(grant.accessToken, ask, {
      bindings,
      headers: { "x-hub-in-object": "1" },
    });
    expect(forwarded).toHaveLength(0);
    expect(data(await response.text()).result).toMatchObject({ isError: true });
  });
  it("没有绑定对象命名空间时（例如本地最小环境）在原处执行", async () => {
    const grant = await issueGrant();
    const bindings = { ...env, PAPER_QA_RUNTIME: undefined };
    const response = await rpc(grant.accessToken, ask, { bindings });
    expect(data(await response.text()).result).toMatchObject({
      content: [{ type: "text", text: "论文不存在" }],
    });
  });
});
