// 整篇原文问答；选择上下文不伪造缺省内容，模型只经能力运行时。
import {
  type Adapter,
  createGatewayAdapter,
  type Result,
  Runtime,
  registry,
  renderPrompt,
} from "@bowen-hub/ai";
import type { Paper, PaperQaInput } from "@bowen-hub/contracts";
import { PaperQaInput as InputSchema } from "@bowen-hub/contracts/zod";
import { createUIMessageStream, createUIMessageStreamResponse } from "ai";
import type { Bindings } from "../../lib/env";
import { ApiError } from "../../lib/problem";
import { batchAiCalls } from "../platform/service";
import { nativeResponse } from "./qa-native";
import { getQaContext } from "./repo";

function capability() {
  const cap = registry.capabilities["papers.qa"];
  if (!cap) throw new ApiError(503, "问答能力未配置");
  return cap;
}
interface Page {
  page: number;
  lines: string[];
}
export function context(
  paper: Paper,
  question: string,
  text: string,
  jsonl?: string,
  maxTokens = capability().limits.maxInputTokens,
): { input: PaperQaInput; totalPages: number } {
  if (!paper.guide || !paper.evidence?.claims) throw new ApiError(422, "论文导读或证据尚未就绪");
  const headers = [...text.matchAll(/^=== p\..*$/gm)];
  const totalPages = headers.length;
  if (jsonl !== undefined) {
    let pages: Page[];
    try {
      pages = jsonl
        .trim()
        .split(/\r?\n/)
        .map((line) => JSON.parse(line) as Page);
    } catch {
      throw new ApiError(422, "原文页数据格式无效");
    }
    if (
      !pages.length ||
      pages.length !== totalPages ||
      pages.some(
        (p, i) =>
          !p ||
          typeof p !== "object" ||
          p.page !== i + 1 ||
          !Array.isArray(p.lines) ||
          p.lines.some((l) => typeof l !== "string"),
      )
    )
      throw new ApiError(422, "原文页集合不完整");
  }
  if (!text.startsWith("=== p.1 ===\n") && !text.startsWith("=== p.1 ===\r\n"))
    throw new ApiError(422, "原文文本页格式无效");
  if (
    headers.some(
      (h, i) =>
        h[0].trim() !== `=== p.${i + 1} ===` ||
        h.index === undefined ||
        (text[h.index + h[0].length] !== "\n" &&
          text.slice(h.index + h[0].length, h.index + h[0].length + 2) !== "\r\n"),
    )
  )
    throw new ApiError(422, "原文文本页格式无效");
  const input: PaperQaInput = {
    question,
    guide: paper.guide,
    claims: paper.evidence.claims,
    pages: text,
  };
  if (!InputSchema.safeParse(input).success)
    throw new ApiError(422, "论文导读或证据不符合问答契约");
  const prompt = registry.prompts[capability().id];
  if (!prompt) throw new ApiError(503, "问答提示词未配置");
  if (paper.structure?.pageCount != null && paper.structure.pageCount !== totalPages)
    throw new ApiError(422, "原文元数据与页集合不一致");
  // 页面是原样字符串占位符，只渲染一次固定开销，避免长文逐页重复拼整个提示词。
  const fixed = renderPrompt(prompt, { ...input, pages: "x" });
  const overhead = fixed.system.length + fixed.user.length - 1;
  const available = maxTokens * 3 - overhead;
  if (input.pages.length <= available) return { input, totalPages };
  input.pages = "";
  if (available < 0) throw new ApiError(422, "问题和导读超过问答上下文预算");
  const order = [
    ...new Set([
      ...input.claims
        .map((c) => c.pdfPage)
        .filter((n): n is number => typeof n === "number" && n >= 1 && n <= totalPages),
      ...Array.from({ length: Math.min(10, totalPages) }, (_, i) => i + 1),
      ...Array.from({ length: totalPages }, (_, i) => i + 1),
    ]),
  ];
  for (const n of order) {
    const start = headers[n - 1]?.index;
    if (start === undefined) throw new ApiError(422, "原文文本页缺失");
    const block = text.slice(start, headers[n]?.index ?? text.length);
    if (input.pages.length + block.length > available) break;
    input.pages += block;
  }
  if (!input.pages) throw new ApiError(422, "上下文预算无法容纳原文页");
  return { input, totalPages };
}
export async function prepare(env: Bindings, id: string, question: string) {
  // SQLite只取问答所需字段，不解析整篇Paper和整份页行JSONL。
  const doc = await getQaContext(env.DB, id);
  if (!doc) throw new ApiError(404, "论文不存在");
  const text = await env.FILES.get(`papers/${id}/pages.txt`);
  if (!text) throw new ApiError(422, "原文尚未就绪");
  const paper = JSON.parse(doc) as Paper;
  return context(paper, question, await text.text());
}
export function runtime(
  env: Bindings,
  adapter?: Adapter,
  hasUsage: () => boolean = () => true,
): Runtime {
  if (!adapter && !env.OPENAI_API_KEY) throw new ApiError(503, "问答网关未配置");
  return new Runtime(
    adapter ??
      createGatewayAdapter(registry.llm, { ...env, OPENAI_API_KEY: env.OPENAI_API_KEY ?? "" }),
    {
      record: async (call) => {
        if (!hasUsage()) {
          console.error(
            JSON.stringify({ module: "papers.qa", error: "上游缺少真实用量，未写入费用" }),
          );
          return;
        }
        try {
          await batchAiCalls(env.DB, [call]);
        } catch {
          console.error(JSON.stringify({ module: "papers.qa", error: "AI用量记录失败" }));
          throw new ApiError(500, "AI用量记录失败");
        }
      },
    },
  );
}
export async function ask(
  env: Bindings,
  id: string,
  question: string,
  emit: (text: string) => Promise<void>,
  adapter?: Adapter,
): Promise<Result> {
  const p = await prepare(env, id, question);
  return runtime(env, adapter).stream("papers.qa", { ...p.input }, emit, {
    totalPages: p.totalPages,
  });
}
export async function response(
  env: Bindings,
  id: string,
  question: string,
  adapter?: Adapter,
  waitUntil?: (task: Promise<unknown>) => void,
): Promise<Response> {
  if (!adapter) return nativeResponse(env, id, question, waitUntil);
  const p = await prepare(env, id, question),
    r = runtime(env, adapter);
  const stream = createUIMessageStream({
    execute: async ({ writer }) => {
      const textId = crypto.randomUUID();
      writer.write({ type: "start" });
      writer.write({ type: "text-start", id: textId });
      const result = await r.stream(
        "papers.qa",
        { ...p.input },
        async (delta) => {
          writer.write({ type: "text-delta", id: textId, delta });
        },
        { totalPages: p.totalPages },
      );
      writer.write({ type: "text-end", id: textId });
      if (!result.ok) {
        writer.write({ type: "error", errorText: "这次没答上来，可以重试" });
      }
      writer.write({
        type: "data-paper-qa",
        data: {
          pages: result.output?.pages ?? [],
          generatedBy: result.output?.generatedBy ?? null,
          validation: result.reports,
          ok: result.ok,
        },
      });
      writer.write({ type: "finish" });
    },
    onError: () => "这次没答上来，可以重试",
  });
  return createUIMessageStreamResponse({ stream });
}
