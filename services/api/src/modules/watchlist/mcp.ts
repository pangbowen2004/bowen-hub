// T14填入工具；T41汇总，工具复用service而不另写业务逻辑。

import { WatchItem } from "@bowen-hub/contracts/zod";
import { z } from "zod";
import type { McpTool } from "../../lib/mcp";
import * as service from "./service";

const symbolInput = z.object({ symbol: z.string() });
export const tools: readonly McpTool[] = [
  {
    name: "watchlist_list",
    description: "读取全部自选股，包括停用的标的",
    inputSchema: z.object({}),
    handler: async (input, env) => {
      z.object({}).parse(input);
      return service.list(env.DB);
    },
  },
  // Kevin确认：资料不全时由客户端询问并补齐，不猜名称、类型和分组。
  {
    name: "watchlist_add",
    description: "新增或修改自选股；请先询问并补齐名称、类型、分组、标的、对照ETF、别名和启用状态",
    inputSchema: WatchItem,
    handler: async (input, env) => {
      const item = WatchItem.parse(input);
      return service.put(env.DB, item.symbol, item);
    },
  },
  {
    name: "watchlist_remove",
    description: "按代码删除自选股",
    inputSchema: symbolInput,
    handler: async (input, env) => {
      await service.remove(env.DB, symbolInput.parse(input).symbol);
      return { removed: true };
    },
  },
];
