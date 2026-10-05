// 汇总各领域模块的 mcp.ts；工具本身是各模块 service 的薄封装，这里不写业务逻辑（docs/09 第 6 节）。
import type { McpTool } from "../../lib/mcp";
import { tools as markets } from "../markets/mcp";
import { tools as news } from "../news/mcp";
import { tools as papers } from "../papers/mcp";
import { tools as watchlist } from "../watchlist/mcp";

/** 各领域声明的全部工具，按新闻、自选股、市场、论文的顺序汇总。 */
export const tools: readonly McpTool[] = [...news, ...watchlist, ...markets, ...papers];

/** docs/09 第 6 节列出的 12 个工具。MCP 只开放这些：某个模块多声明了工具也不会自动对外。 */
export const MCP_TOOL_NAMES = [
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
] as const;
export type McpToolName = (typeof MCP_TOOL_NAMES)[number];

/** 对外开放的工具，顺序与文档一致。 */
export function exposedTools(): readonly McpTool[] {
  return MCP_TOOL_NAMES.map((name) => {
    const tool = tools.find((candidate) => candidate.name === name);
    if (!tool) throw new Error(`缺少 MCP 工具：${name}`);
    return tool;
  });
}

export interface ToolHints {
  readOnlyHint: boolean;
  destructiveHint?: boolean;
  idempotentHint?: boolean;
  openWorldHint: boolean;
}
const read: ToolHints = { readOnlyHint: true, openWorldHint: false };
/**
 * 给客户端的行为提示，客户端据此决定是否需要逐次确认：
 * 八个查询工具只读；自选股新增是整条覆盖写入、删除不可恢复；问答调用模型并产生费用；提交论文会触发入库流程。
 */
export const TOOL_HINTS: Record<McpToolName, ToolHints> = {
  news_latest_edition: read,
  news_search: read,
  news_ticker_timeline: read,
  watchlist_list: read,
  watchlist_add: {
    readOnlyHint: false,
    destructiveHint: true,
    idempotentHint: true,
    openWorldHint: false,
  },
  watchlist_remove: { readOnlyHint: false, destructiveHint: true, openWorldHint: false },
  markets_day: read,
  markets_hypotheses: read,
  papers_search: read,
  papers_get: read,
  papers_ask: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
  papers_ingest_url: { readOnlyHint: false, destructiveHint: false, openWorldHint: true },
};
