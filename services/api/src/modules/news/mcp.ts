// T14填入工具；T41汇总，工具复用service而不另写业务逻辑。

import {
  EditionKind,
  PrivateNewsGetFullTimelineParams,
  PrivateNewsGetFullTimelineQueryParams,
} from "@bowen-hub/contracts/zod";
import { z } from "zod";
import type { McpTool } from "../../lib/mcp";
import * as service from "./service";

const latestInput = z.object({ kind: EditionKind });
const searchInput = z.object({
  query: z.string(),
  ticker: z.string().optional(),
  days: z.number().int().min(1).default(30),
});
const timelineInput = PrivateNewsGetFullTimelineParams.merge(PrivateNewsGetFullTimelineQueryParams);
export const tools: readonly McpTool[] = [
  {
    name: "news_latest_edition",
    description: "读取指定版次的最新一期新闻",
    inputSchema: latestInput,
    handler: async (input, env) => service.latestEdition(env.DB, latestInput.parse(input).kind),
  },
  {
    name: "news_search",
    description: "按关键词、股票及时间范围搜索已归档新闻",
    inputSchema: searchInput,
    handler: async (input, env) => {
      const value = searchInput.parse(input);
      return service.search(env.DB, value.query, value.ticker, value.days);
    },
  },
  {
    name: "news_ticker_timeline",
    description: "读取个股的新闻、公告、内部人交易及财报时间线",
    inputSchema: timelineInput,
    handler: async (input, env) => {
      const value = timelineInput.parse(input);
      return service.fullTimeline(env.DB, value.symbol, value.days);
    },
  },
];
