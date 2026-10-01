import { spawnSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { describe, expect, it, vi } from "vitest";
import { isProxyPath, onRequest } from "../apps/console/functions/_middleware.ts";
import { bootstrap } from "./bootstrap.ts";
import { missing, missingVars, workerVars } from "./check-secrets.ts";
import { Cloudflare } from "./cloudflare.ts";
import { deploymentBranch, pagesCommand } from "./deploy-pages.ts";
import { verify } from "./verify.ts";

describe("安全部署", () => {
  it("公开站必须显式开启SITES_LIVE，预览不覆盖生产", () => {
    expect(() => deploymentBranch("markets", "production", "main", "false")).toThrow("SITES_LIVE");
    expect(() => deploymentBranch("papers", "preview", "preview", "false")).toThrow("已有生产");
    expect(deploymentBranch("markets", "preview", "main", "false")).toBe("preview");
    expect(deploymentBranch("papers", "production", "main", "true")).toBe("main");
    expect(deploymentBranch("console", "production", "main", "false")).toBe("main");
  });
  it("Pages在站点cwd自动读配置，真实CLI接受发布选项", () => {
    const command = pagesCommand("console", "preview");
    expect(command.cwd).toBe(fileURLToPath(new URL("../apps/console", import.meta.url)));
    expect(command.args).not.toContain("--config");
    const result = spawnSync(command.executable, [...command.args, "--help"], {
      cwd: command.cwd,
      encoding: "utf8",
      env: {
        ...process.env,
        CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
        WRANGLER_SEND_METRICS: "false",
      },
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("--project-name");
    expect(result.stdout).toContain("--branch");
  });
  it("只比较名称", () => expect(missing(["A", "B"], [{ name: "A" }])).toEqual(["B"]));
  it("外部错误不输出响应正文", async () => {
    const api = new Cloudflare(
      "测试占位",
      "account",
      vi.fn(async () => new Response("私人正文", { status: 403 })) as typeof fetch,
    );
    await expect(api.request("d1/database")).rejects.toThrow(
      /^Cloudflare请求失败：GET d1\/database HTTP 403$/,
    );
  });
  it("错误JSON不暴露正文片段", async () => {
    const api = new Cloudflare(
      "测试占位",
      "account",
      vi.fn(async () => new Response("私人正文不是JSON")) as typeof fetch,
    );
    await expect(api.request("pages/projects")).rejects.toThrow(
      /^Cloudflare响应格式错误：GET pages\/projects$/,
    );
  });
  it("精确GET的404才创建，权限失败不会误建", async () => {
    const methods: string[] = [];
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      const path = String(url);
      methods.push(`${init?.method} ${path}`);
      if (path.includes("d1/database"))
        return Response.json({ success: true, result: [{ name: "bowen-hub", uuid: "已有ID" }] });
      if (init?.method === "GET" && path.includes("r2/buckets/"))
        return new Response("缺失", { status: 404 });
      if (init?.method === "POST")
        return Response.json({ success: true, result: { name: "bowen-hub-files" } });
      if (path.includes("pages/projects/")) return new Response("私人错误", { status: 403 });
      throw new Error("意外请求");
    });
    await expect(
      bootstrap(new Cloudflare("测试占位", "account", fetcher as typeof fetch)),
    ).rejects.toThrow("HTTP 403");
    expect(methods.filter((value) => value.startsWith("POST"))).toEqual([
      "POST https://api.cloudflare.com/client/v4/accounts/account/r2/buckets",
    ]);
  });
  it("D1后续页的同名数据库不会重复创建", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request, init?: RequestInit) => {
      expect(init?.method).toBe("GET");
      const path = String(url);
      const result = path.includes("d1/database")
        ? new URL(path).searchParams.get("page") === "1"
          ? Array.from({ length: 100 }, (_, index) => ({
              name: `other${index}`,
              uuid: String(index),
            }))
          : [{ name: "bowen-hub", uuid: "第二页ID" }]
        : path.includes("r2/buckets/")
          ? { name: "bowen-hub-files" }
          : path.includes("pages/projects/")
            ? { name: "bowen-console", production_branch: "main" }
            : { id: "bowen-hub" };
      return Response.json({ success: true, result });
    });
    expect(
      (await bootstrap(new Cloudflare("测试占位", "account", fetcher as typeof fetch))).databaseId,
    ).toBe("第二页ID");
  });
  it("复用全部资源，不产生写请求", async () => {
    const fetcher = vi.fn(async (url: string | URL | Request) => {
      const path = String(url);
      const result = path.includes("d1/database")
        ? [{ name: "bowen-hub", uuid: "已有ID" }]
        : path.includes("r2/buckets")
          ? { name: "bowen-hub-files" }
          : path.includes("pages/projects")
            ? { name: "bowen-console", production_branch: "main" }
            : { id: "bowen-hub" };
      return Response.json({ success: true, result });
    });
    const result = await bootstrap(new Cloudflare("测试占位", "account", fetcher as typeof fetch));
    expect(result.databaseId).toBe("已有ID");
    expect(fetcher.mock.calls).toHaveLength(4);
  });
});
describe("同源代理", () => {
  it("精确识别四个前缀，不吞SPA或相似名称", () => {
    for (const path of [
      "/v1",
      "/v1/health",
      "/auth/login",
      "/mcp",
      "/.well-known/oauth-authorization-server",
    ])
      expect(isProxyPath(path)).toBe(true);
    for (const path of ["/", "/v123", "/authentication", "/mcpx"])
      expect(isProxyPath(path)).toBe(false);
  });
  it("保留同一个POST请求、Cookie、路径、流响应与Set-Cookie", async () => {
    const request = new Request("https://bowen-console.pages.dev/auth/test?q=1", {
      method: "POST",
      headers: { Cookie: "session=test", "Content-Type": "application/pdf" },
      body: new Uint8Array([1, 2, 3]),
    });
    const response = new Response(
      new ReadableStream({
        start(controller) {
          controller.enqueue(new TextEncoder().encode("data: 流\n\n"));
          controller.close();
        },
      }),
      { headers: { "Content-Type": "text/event-stream", "Set-Cookie": "session=new; HttpOnly" } },
    );
    const fetcher = vi.fn(async (received: Request) => {
      expect(received).toBe(request);
      expect(new Uint8Array(await received.arrayBuffer())).toEqual(new Uint8Array([1, 2, 3]));
      return response;
    });
    const next = vi.fn(async () => new Response("SPA"));
    const result = await onRequest({ request, env: { API: { fetch: fetcher } }, next });
    expect(result).toBe(response);
    expect(result.headers.get("Set-Cookie")).toContain("HttpOnly");
    expect(await result.text()).toBe("data: 流\n\n");
    expect(next).not.toHaveBeenCalled();
  });
  it("普通页面交回Pages", async () => {
    const next = vi.fn(async () => new Response("SPA"));
    const fetcher = vi.fn();
    expect(
      await (
        await onRequest({
          request: new Request("https://example.com/news"),
          env: { API: { fetch: fetcher } },
          next,
        })
      ).text(),
    ).toBe("SPA");
    expect(fetcher).not.toHaveBeenCalled();
  });
});

describe("原生Node执行入口", () => {
  for (const [script, args, message] of [
    ["bootstrap.ts", [], "缺少环境变量：CLOUDFLARE_API_TOKEN"],
    ["configure-worker.ts", [], "显式指定允许上传"],
    ["deploy-pages.ts", ["invalid"], "站点只支持"],
    ["verify.ts", [], "缺少环境变量：HUB_API_URL"],
  ] as const) {
    it(`${script}不依赖Vitest转译`, () => {
      const env = { ...process.env };
      delete env.CLOUDFLARE_API_TOKEN;
      delete env.CLOUDFLARE_ACCOUNT_ID;
      delete env.HUB_API_URL;
      const result = spawnSync(
        process.execPath,
        [fileURLToPath(new URL(script, import.meta.url)), ...args],
        { env, encoding: "utf8" },
      );
      expect(result.status).toBe(1);
      expect(result.stderr).toContain(message);
      expect(result.stderr).not.toContain("ERR_UNSUPPORTED_TYPESCRIPT_SYNTAX");
    });
  }
});

describe("配置与健康验收", () => {
  it("缺失或空普通变量只返回名字", () => {
    expect(
      missingVars(
        workerVars.map((name) => ({
          name,
          type: "plain_text",
          text: name === "APP_MODE" ? "" : "test",
        })),
      ),
    ).toEqual(["APP_MODE"]);
  });
  it("五个真实入口均必须200，健康要求JSON", async () => {
    const log = vi.spyOn(console, "log").mockImplementation(() => {});
    const fetcher = vi.fn(async (url: string | URL | Request) =>
      String(url).endsWith("/v1/health")
        ? Response.json({ status: "ok" })
        : new Response("样例预览"),
    );
    await verify(
      { HUB_API_URL: "https://bowen-hub-api.example.workers.dev" },
      fetcher as typeof fetch,
    );
    expect(fetcher).toHaveBeenCalledTimes(5);
    expect(fetcher.mock.calls.every((call) => !String(call[0]).includes("production"))).toBe(true);
    log.mockRestore();
  });
  it("不以SPA200冒充代理健康", async () => {
    await expect(
      verify(
        { HUB_API_URL: "https://example.workers.dev" },
        vi.fn(async () => new Response("SPA")) as typeof fetch,
      ),
    ).rejects.toThrow("不是JSON响应");
  });
});
