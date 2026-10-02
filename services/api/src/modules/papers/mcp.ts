// MCP仅适配入参，复用同一论文服务和问答运行时。
import { z } from "zod";
import type { McpTool } from "../../lib/mcp";
import { ApiError } from "../../lib/problem";
import * as qa from "./qa";
import * as service from "./service";

const search = z.object({ query: z.string() }),
  get = z.object({ id: z.string() }),
  ask = z.object({ id: z.string(), question: z.string() }),
  ingest = z.object({ url: z.string() });
export const tools: readonly McpTool[] = [
  {
    name: "papers_search",
    description: "搜索全部论文的标题、导读与概念",
    inputSchema: search,
    handler: async (input, env) =>
      service.listPapers(env.DB, { q: search.parse(input).query, limit: 20 }),
  },
  {
    name: "papers_get",
    description: "读取单篇论文的导读与证据",
    inputSchema: get,
    handler: async (input, env) => JSON.parse(await service.getPaper(env.DB, get.parse(input).id)),
  },
  {
    name: "papers_ask",
    description: "依据论文原文回答问题并给出页码",
    inputSchema: ask,
    handler: async (input, env) => {
      const p = ask.parse(input);
      const r = await qa.ask(env, p.id, p.question, async () => {});
      if (!r.ok) throw new ApiError(502, "这次没答上来，可以重试");
      return r.output;
    },
  },
  {
    name: "papers_ingest_url",
    description: "提交arXiv论文链接进入入库流程",
    inputSchema: ingest,
    handler: async (input, env) => service.uploadArxiv(env, ingest.parse(input).url),
  },
];
