// 适配层：把领域处理函数的结果和失败整理成 MCP 工具结果，不泄漏内部细节。
import { env } from "cloudflare:workers";
import { afterEach, expect, it, vi } from "vitest";
import { z } from "zod";
import type { McpTool } from "../../src/lib/mcp";
import { ApiError } from "../../src/lib/problem";
import { runTool } from "../../src/modules/mcp/adapter";

afterEach(() => vi.restoreAllMocks());
const tool = (handler: McpTool["handler"]): McpTool => ({
  name: "fixture_tool",
  description: "夹具",
  inputSchema: z.object({ n: z.number() }),
  handler,
});

it("成功结果序列化成一段 JSON 文本；没有返回值时是 null", async () => {
  const ok = await runTool(
    tool(async () => ({ a: [1, "二"] })),
    {},
    env,
  );
  expect(ok).toEqual({ content: [{ type: "text", text: '{"a":[1,"二"]}' }] });
  expect(
    await runTool(
      tool(async () => undefined),
      {},
      env,
    ),
  ).toEqual({
    content: [{ type: "text", text: "null" }],
  });
});
it("业务错误把原因交给模型，参数错误指出是哪个参数", async () => {
  const notFound = await runTool(
    tool(async () => {
      throw new ApiError(404, "论文不存在");
    }),
    {},
    env,
  );
  expect(notFound).toEqual({ isError: true, content: [{ type: "text", text: "论文不存在" }] });
  const invalid = await runTool(
    tool(async (input) => z.object({ n: z.number() }).parse(input)),
    { n: "x" },
    env,
  );
  expect(invalid.isError).toBe(true);
  expect(JSON.stringify(invalid.content)).toContain("n：");
});
it("未知异常只给通用提示，内部信息不进入结果也不进入日志", async () => {
  const log = vi.spyOn(console, "error").mockImplementation(() => {});
  const result = await runTool(
    tool(async () => {
      throw new Error("连接串 libsql://secret-host 泄漏测试");
    }),
    {},
    env,
  );
  expect(result).toEqual({
    isError: true,
    content: [{ type: "text", text: "工具执行失败，请稍后重试" }],
  });
  expect(JSON.stringify(log.mock.calls)).toContain("fixture_tool");
  expect(JSON.stringify(log.mock.calls)).not.toContain("secret-host");
});
