import type { z } from "zod";
import type { Bindings } from "./env";
/** 领域工具薄封装：T41按此形状汇总，处理函数复用领域service，入参先用inputSchema解析。 */
export interface McpTool {
  name: string;
  description: string;
  inputSchema: z.ZodType;
  handler: (input: unknown, env: Bindings) => Promise<unknown>;
}
