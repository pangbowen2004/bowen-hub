// 假模型只测试传输与确定性校验；不冒充真实问答质量或线上CPU证据。
import { env } from "cloudflare:workers";
import { type Adapter, TransportError } from "@bowen-hub/ai";
import type { Paper } from "@bowen-hub/contracts";
import { PaperQaOutput } from "@bowen-hub/contracts/zod";
import { beforeEach, expect, it, vi } from "vitest";
import { tools } from "../../src/modules/papers/mcp";
import * as qa from "../../src/modules/papers/qa";
import * as service from "../../src/modules/papers/service";

const p: Paper = {
  schemaVersion: 1,
  id: "qa-paper",
  meta: { title: "问答夹具" },
  status: {
    visibility: "private",
    review: "passed",
    readingDepth: "R1",
    nextAction: "阅读",
    updatedAt: "2026-10-02",
  },
  guide: { article: "假论文导读，不用于质量评分" },
  evidence: { claims: [{ id: "c1", kind: "result", claim: "结果有限", pdfPage: 2 }] },
  structure: { pageCount: 2 },
};
const pages = "=== p.1 ===\nL1: 假论文方法。\n\n=== p.2 ===\nL1: 假论文结果有限。\n";
const jsonl =
  JSON.stringify({ page: 1, lines: ["假论文方法。"] }) +
  "\n" +
  JSON.stringify({ page: 2, lines: ["假论文结果有限。"] });
const adapter = (parts = ["结果有限[论文 p.2]"]): Adapter => ({
  generate: async () => {
    throw new Error("流问答不能调用非流generate");
  },
  stream: async () => ({
    text: (async function* () {
      for (const part of parts) yield part;
    })(),
    usage: Promise.resolve({ inputTokens: 100, outputTokens: 20, cachedInputTokens: 0 }),
  }),
});
beforeEach(async () => {
  await env.DB.prepare("DELETE FROM papers").run();
  await env.DB.prepare("DELETE FROM ai_calls").run();
  await service.putPaper(env.DB, p.id, {
    paper: p,
    summary: {
      id: p.id,
      title: p.meta.title,
      titleZh: null,
      year: null,
      venue: null,
      oneSentence: null,
      spaces: [],
      readingDepth: "R1",
      paperKind: null,
      paperType: null,
      visibility: "private",
      review: "passed",
      updatedAt: "2026-10-02",
      hasCode: false,
      conceptCount: 0,
    },
  });
  await env.FILES.put(`papers/${p.id}/pages.txt`, pages);
  await env.FILES.put(`papers/${p.id}/pages.jsonl`, jsonl);
});
it("真实完整页元数据、缺导读/证据/原文明确失败", async () => {
  expect(qa.context(p, "问题", pages, jsonl).totalPages).toBe(2);
  for (const malformed of ["null", "5", "{}", "[]", "bad"]) {
    expect(() => qa.context(p, "问题", pages, malformed)).toThrow();
  }
  expect(() => qa.context({ ...p, guide: undefined }, "问题", pages, jsonl)).toThrow("尚未就绪");
  expect(() => qa.context({ ...p, evidence: undefined }, "问题", pages, jsonl)).toThrow("尚未就绪");
  expect(() => qa.context(p, "问题", pages, JSON.stringify({ page: 2, lines: [] }))).toThrow(
    "不完整",
  );
  expect(() => qa.context(p, "问题", "=== p.1 ===\n片段", jsonl)).toThrow("不完整");
  await env.FILES.delete(`papers/${p.id}/pages.txt`);
  await expect(qa.prepare(env, p.id, "问题")).rejects.toMatchObject({ status: 422 });
});
it("超长选页按证据页优先，总页数保持真实完整元数据，提示词全开销计预算", () => {
  const all = Array.from({ length: 15 }, (_, i) => ({ page: i + 1, lines: ["段落".repeat(500)] }));
  const text = all.map((p) => `=== p.${p.page} ===\nL1: ${p.lines[0]}\n`).join("");
  const doc = {
    ...p,
    structure: { pageCount: 15 },
    evidence: { claims: [{ id: "c1", kind: "result" as const, claim: "摘要", pdfPage: 15 }] },
  };
  const selected = qa.context(
    doc,
    "问题",
    text,
    all.map((p) => JSON.stringify(p)).join("\n"),
    1000,
  );
  expect(selected.totalPages).toBe(15);
  expect(selected.input.pages).toMatch(/^=== p.15 ===/);
  expect(selected.input.pages).not.toContain("=== p.2 ===");
  expect(() =>
    qa.context(
      doc,
      "巨大问题".repeat(1000),
      text,
      all.map((p) => JSON.stringify(p)).join("\n"),
      100,
    ),
  ).toThrow("超过");
});
it("标准UI SSE片段与终态pages/generatedBy，AiCall落库", async () => {
  const res = await qa.response(env, p.id, "结果?", adapter(["结果", "有限[论文 p.2]"]));
  expect(res.headers.get("Content-Type")).toContain("text/event-stream");
  expect(res.headers.get("x-vercel-ai-ui-message-stream")).toBe("v1");
  const raw = await res.text();
  const data = raw
    .split("\n")
    .filter((l) => l.startsWith("data: {"))
    .map((l) => JSON.parse(l.slice(6)) as { type: string; data?: unknown });
  expect(data.map((x) => x.type)).toEqual([
    "start",
    "text-start",
    "text-delta",
    "text-delta",
    "text-end",
    "data-paper-qa",
    "finish",
  ]);
  expect(data.find((x) => x.type === "data-paper-qa")?.data).toMatchObject({
    pages: [2],
    ok: true,
    generatedBy: { capability: "papers.qa", version: 2 },
  });
  expect(raw).toContain("data: [DONE]");
  const count = await env.DB.prepare("SELECT count(*) as n FROM ai_calls").first<{ n: number }>();
  expect(count?.n).toBe(1);
});
it("流末越界只标注，不回写已经发出的回答", async () => {
  const emitted: string[] = [];
  const result = await qa.ask(
    env,
    p.id,
    "问题",
    async (t) => {
      emitted.push(t);
    },
    adapter(["事实[论文 p.2]，错误[论文 p.99]"]),
  );
  expect(emitted.join("")).toContain("p.99");
  const output = PaperQaOutput.parse(result.output);
  expect(output.pages).toEqual([2]);
  expect(output.answer).toContain("p.99");
  expect(result.reports.some((r) => r.name === "pages_in_range" && r.changes.length > 0)).toBe(
    true,
  );
});
it("首片前传输失败有限重试，首片后失败绝不重复", async () => {
  let calls = 0;
  const a = adapter();
  const original = a.stream;
  if (!original) throw new Error("假流适配器缺失");
  a.stream = async (request) => {
    calls++;
    if (calls === 1) throw new TransportError("安全传输错误");
    return original(request);
  };
  const result = await qa.ask(env, p.id, "问题", async () => {}, a);
  expect(result.ok).toBe(true);
  expect(calls).toBe(2);
  calls = 0;
  a.stream = async () => {
    calls++;
    return {
      text: (async function* () {
        yield "已发文本";
        throw new TransportError("安全传输错误");
      })(),
      usage: Promise.resolve({ inputTokens: 10, outputTokens: 2, cachedInputTokens: 0 }),
    };
  };
  const emitted: string[] = [];
  const failure = await qa.ask(
    env,
    p.id,
    "问题",
    async (t) => {
      emitted.push(t);
    },
    a,
  );
  expect(failure.ok).toBe(false);
  expect(calls).toBe(1);
  expect(emitted).toEqual(["已发文本"]);
});

it("运行时传递既定超时与token预算，超限失败仍记录实际用量", async () => {
  const a = adapter();
  a.stream = async (request) => {
    expect(request.timeoutSec).toBe(120);
    expect(request.maxOutputTokens).toBe(3000);
    return {
      text: (async function* () {
        yield "已发文本[论文 p.2]";
      })(),
      usage: Promise.resolve({ inputTokens: 100, outputTokens: 3001, cachedInputTokens: 0 }),
    };
  };
  const result = await qa.ask(env, p.id, "问题", async () => {}, a);
  expect(result.ok).toBe(false);
  const call = await env.DB.prepare(
    "SELECT output_tokens FROM ai_calls ORDER BY rowid DESC LIMIT 1",
  ).first<{ output_tokens: number }>();
  expect(call?.output_tokens).toBe(3001);
});
it("四个MCP工具复用服务，问答原样返回同一运行时的出处与页码", async () => {
  expect(tools.map((t) => t.name)).toEqual([
    "papers_search",
    "papers_get",
    "papers_ask",
    "papers_ingest_url",
  ]);
  const search = tools.find((t) => t.name === "papers_search");
  const get = tools.find((t) => t.name === "papers_get");
  const ask = tools.find((t) => t.name === "papers_ask");
  if (!search || !get || !ask) throw new Error("工具缺失");
  expect(await search.handler({ query: "问答夹具" }, env)).toMatchObject({ items: [{ id: p.id }] });
  expect(await get.handler({ id: p.id }, env)).toMatchObject({ id: p.id });
  const result = await qa.ask(env, p.id, "问题", async () => {}, adapter());
  const spy = vi.spyOn(qa, "ask").mockResolvedValue(result);
  try {
    expect(await ask.handler({ id: p.id, question: "同一问题" }, env)).toEqual(result.output);
    expect(spy).toHaveBeenCalledWith(env, p.id, "同一问题", expect.any(Function));
    spy.mockResolvedValue({ ...result, ok: false });
    await expect(ask.handler({ id: p.id, question: "问题" }, env)).rejects.toMatchObject({
      status: 502,
    });
  } finally {
    spy.mockRestore();
  }
});

it("物理页单次索引仍拒绝跳页、重复页和末页缺换行", () => {
  for (const text of [
    "=== p.1 ===\n方法\n=== p.3 ===\n结果",
    "=== p.1 ===\n方法\n=== p.1 ===\n结果",
    "=== p.1 ===\n方法\n=== p.2 ===",
  ]) {
    expect(() => qa.context(p, "问题", text)).toThrow("格式无效");
  }
  expect(qa.context(p, "问题", pages.replace(/\n/g, "\r\n")).totalPages).toBe(2);
});
