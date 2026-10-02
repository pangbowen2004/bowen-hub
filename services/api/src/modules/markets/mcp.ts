// MCP只复用市场服务；账本分页保留游标，客户端可逐页继续。
import { z } from "zod";
import type { McpTool } from "../../lib/mcp";
import * as service from "./service";

const dayInput = z.object({ date: z.iso.date().optional() });
const hypothesisInput = z.object({
  status: z.enum(["PENDING", "CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE"]).optional(),
  days: z.number().int().min(1).default(30),
  cursor: z.string().optional(),
});
export const tools: readonly McpTool[] = [
  {
    name: "markets_day",
    description: "读取指定日期或最新A股复盘",
    inputSchema: dayInput,
    handler: async (input, env) =>
      JSON.parse(await service.day(env.DB, dayInput.parse(input).date)),
  },
  {
    name: "markets_hypotheses",
    description: "读取最近假设与结算，支持状态和继续分页",
    inputSchema: hypothesisInput,
    handler: async (input, env) => {
      const value = hypothesisInput.parse(input);
      const from = new Date(Date.now() + 8 * 3600 * 1000 - (value.days - 1) * 86400 * 1000)
        .toISOString()
        .slice(0, 10);
      return service.hypotheses(env.DB, 100, { result: value.status, from }, value.cursor);
    },
  },
];
