import { env } from "cloudflare:workers";
import * as schemas from "@bowen-hub/contracts/zod";
import { describe, expect, it, vi } from "vitest";
import { app } from "../../src/app";
import { dispatch } from "../../src/lib/github";
import { readFile, writeFile } from "../../src/lib/r2";
import { tools as marketTools } from "../../src/modules/markets/mcp";
import { exposedTools, tools } from "../../src/modules/mcp/registry";
import { tools as newsTools } from "../../src/modules/news/mcp";
import { tools as paperTools } from "../../src/modules/papers/mcp";
import { tools as watchlistTools } from "../../src/modules/watchlist/mcp";

describe("存储和GitHub薄封装", () => {
  it("R2流式保存/读取保留字节与媒体类型，缺文件明确404", async () => {
    const bytes = new Uint8Array([0, 255, 137, 80, 78, 71]);
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(bytes);
        c.close();
      },
    });
    await writeFile(env.FILES, "papers/test/pages/1.png", stream, "image/png", bytes.length);
    const response = await readFile(env.FILES, "papers/test/pages/1.png");
    expect(response.headers.get("content-type")).toBe("image/png");
    expect(response.headers.get("etag")).toBeTruthy();
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(bytes);
    await expect(readFile(env.FILES, "missing")).rejects.toMatchObject({ status: 404 });
  });
  it("repository_dispatch使用env凭据，失败明确，不真实联网", async () => {
    const mock = vi
      .spyOn(globalThis, "fetch")
      .mockResolvedValue(new Response(null, { status: 204 }));
    try {
      await dispatch(env, "papers-ingest", { uploadId: "test" });
      const [url, init] = mock.mock.calls[0] ?? [];
      expect(url).toBe("https://api.github.com/repos/pangbowen2004/bowen-hub/dispatches");
      expect(JSON.parse(String(init?.body))).toEqual({
        event_type: "papers-ingest",
        client_payload: { uploadId: "test" },
      });
      expect(new Headers(init?.headers).get("authorization")).toBe("Bearer test-dispatch-token");
      mock.mockResolvedValueOnce(new Response(null, { status: 500 }));
      await expect(dispatch(env, "papers-ingest", {})).rejects.toMatchObject({ status: 502 });
      await expect(
        dispatch({ ...env, GH_AUTOMATION_TOKEN: undefined }, "papers-ingest", {}),
      ).rejects.toMatchObject({ status: 503 });
    } finally {
      mock.mockRestore();
    }
  });
  it("日志不包含授权头或正文，失败返回problem并带请求ID", async () => {
    const logs = vi.spyOn(console, "log").mockImplementation(() => {});
    try {
      const response = await app.request(
        "http://localhost/v1/internal/runs/private",
        {
          method: "PUT",
          headers: {
            "Content-Type": "application/json",
            Authorization: "Bearer test-service-token",
          },
          body: '{"secret":"never-log-this"}',
        },
        env,
      );
      expect(response.status).toBe(400);
      expect(schemas.Problem.parse(await response.json()).status).toBe(400);
      expect(response.headers.get("x-request-id")).toBeTruthy();
      const serialized = JSON.stringify(logs.mock.calls);
      expect(serialized).not.toContain("test-service-token");
      expect(serialized).not.toContain("never-log-this");
    } finally {
      logs.mockRestore();
    }
  });
  it("MCP入口是受OAuth保护的真实服务，领域工具已接线，对外正好是文档列出的12个", async () => {
    const response = await app.request("http://localhost/mcp", { method: "POST" }, env);
    expect(response.status).toBe(401);
    expect(response.headers.get("www-authenticate")).toContain("resource_metadata=");
    expect(tools).toEqual([...newsTools, ...watchlistTools, ...marketTools, ...paperTools]);
    expect(new Set(tools.map((tool) => tool.name)).size).toBe(tools.length);
    // docs/09 第 6 节的工具表，顺序一致。
    expect(exposedTools().map((tool) => tool.name)).toEqual([
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
    ]);
  });
});
