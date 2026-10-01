// T41接入实际工具；各领域固定导出tools，后续任务无需改app/index。

import type { McpTool } from "../../lib/mcp";
import { tools as markets } from "../markets/mcp";
import { tools as news } from "../news/mcp";
import { tools as papers } from "../papers/mcp";
import { tools as watchlist } from "../watchlist/mcp";
export const tools: readonly McpTool[] = [...news, ...watchlist, ...markets, ...papers];
