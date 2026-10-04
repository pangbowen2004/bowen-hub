// 把领域工具（Zod 入参 + 处理函数）适配成官方 SDK 的工具注册，不含任何业务逻辑。
import type {
  CallToolResult,
  McpServer,
  StandardSchemaWithJSON,
} from "@modelcontextprotocol/server";
import { ZodError } from "zod";
import type { Bindings } from "../../lib/env";
import type { McpTool } from "../../lib/mcp";
import { ApiError } from "../../lib/problem";
import { type McpToolName, TOOL_HINTS } from "./registry";

function describeIssues(error: ZodError): string {
  return error.issues
    .slice(0, 5)
    .map((issue) => `${issue.path.join(".") || "参数"}：${issue.message}`)
    .join("；");
}

/**
 * 工具失败时返回带 isError 的结果而不是协议错误：模型能读到原因并自行重试或改参数。
 * 只把业务层明确抛出的 ApiError 和参数错误的原因交给客户端；其他异常只记一行日志，不泄漏内部细节。
 */
export function toolFailure(tool: string, error: unknown): CallToolResult {
  let message = "工具执行失败，请稍后重试";
  if (error instanceof ApiError) message = error.message;
  else if (error instanceof ZodError) message = `参数不符合要求：${describeIssues(error)}`;
  else console.error(JSON.stringify({ mcpTool: tool, error: "工具执行失败" }));
  return { isError: true, content: [{ type: "text", text: message }] };
}

/** 调用领域处理函数，把返回值序列化成一段 JSON 文本。 */
export async function runTool(
  tool: McpTool,
  args: unknown,
  env: Bindings,
): Promise<CallToolResult> {
  try {
    const result = await tool.handler(args, env);
    return { content: [{ type: "text", text: JSON.stringify(result ?? null) }] };
  } catch (error) {
    return toolFailure(tool.name, error);
  }
}

/** 注册全部对外工具。入参由 SDK 先按 Zod 校验，处理函数里仍会再解析一次。 */
export function registerTools(server: McpServer, env: Bindings, tools: readonly McpTool[]): void {
  for (const tool of tools) {
    server.registerTool(
      tool.name,
      {
        description: tool.description,
        inputSchema: tool.inputSchema as unknown as StandardSchemaWithJSON,
        annotations: TOOL_HINTS[tool.name as McpToolName],
      },
      (args) => runTool(tool, args, env),
    );
  }
}
