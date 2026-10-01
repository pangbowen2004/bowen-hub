import { expect, it } from "vitest";
import { CheckRegistry } from "../src/checks";
import { strictOutputSchema } from "../src/gateway";
import { registry } from "../src/registry";
import { type Adapter, Runtime } from "../src/runtime";

it("供应商严格 schema 转换，保留业务契约原件", () => {
  const schema = {
    type: "object",
    properties: {
      text: { type: "string", "x-max-chars": 8 },
      optional: { type: "string" },
      generatedBy: { type: "object" },
    },
    required: ["text"],
  };
  const result = strictOutputSchema(schema);
  expect(result.additionalProperties).toBe(false);
  expect(result.required).toEqual(["text", "optional"]);
  expect(result.properties).toEqual({
    text: { type: "string" },
    optional: { anyOf: [{ type: "string" }, { type: "null" }] },
  });
  expect(schema.properties.text["x-max-chars"]).toBe(8);
});
it("引用只比原文，草稿不能自证；可空项无效则删项", () => {
  const checks = new CheckRegistry();
  const schema = {
    properties: {
      guidance: {
        anyOf: [{ properties: { quote: { "x-source-quote": true } } }, { type: "null" }],
      },
    },
  };
  const result = checks.run(
    ["quotes_in_sources"],
    { guidance: { quote: "草稿伪造" } },
    { inputs: { pages: "原文", paper: { text: "草稿伪造" } }, schema, adviceWords: [] },
  );
  expect(result.output.guidance).toBeNull();
  expect(result.reports[0]?.failed).toBe(false);
});
it("超过 token 上限不修复，不丢用量", async () => {
  let calls = 0;
  const adapter: Adapter = {
    async generate() {
      calls++;
      return {
        output: { digest: "事实。" },
        usage: { inputTokens: 20001, outputTokens: 2, cachedInputTokens: 0 },
      };
    },
  };
  const result = await new Runtime(adapter).run("news.filing_digest", {
    symbol: "T",
    name: "测试",
    form: "8-K",
    items: [],
    text: "事实。",
  });
  expect(calls).toBe(1);
  expect(result.ok).toBe(false);
  expect(result.reason).toContain("token");
  expect(result.call.inputTokens).toBe(20001);
});
it("流末 token 上限失败并保持已发送块", async () => {
  const adapter: Adapter = {
    async generate() {
      throw new Error();
    },
    async stream() {
      return {
        text: (async function* () {
          yield "答。";
        })(),
        usage: Promise.resolve({ inputTokens: 200001, outputTokens: 2, cachedInputTokens: 0 }),
      };
    },
  };
  const sent: string[] = [];
  const result = await new Runtime(adapter).stream(
    "papers.qa",
    { question: "问题", guide: {}, claims: [], pages: "原文" },
    async (text) => {
      sent.push(text);
    },
    { totalPages: 1 },
  );
  expect(result.ok).toBe(false);
  expect(sent).toEqual(["答。"]);
  expect(result.call.inputTokens).toBe(200001);
});
it("所有编译注册表输入输出都存在对应 schema", () => {
  for (const cap of Object.values(registry.capabilities)) {
    expect(registry.schemas[cap.io.input]).toBeDefined();
    expect(registry.schemas[cap.io.output]).toBeDefined();
    expect(registry.prompts[cap.id]).toContain("## user");
  }
});
it("SDK fullStream 错误事件不能被 textStream 静默忽略", async () => {
  const { MockLanguageModelV3 } = await import("ai/test");
  const { createGatewayAdapter } = await import("../src/gateway");
  let calls = 0;
  const model = new MockLanguageModelV3({
    doStream: async () => {
      calls++;
      return {
        stream: new ReadableStream({
          start(controller) {
            controller.enqueue({ type: "error", error: new Error("私密供应商正文") });
            controller.close();
          },
        }),
      };
    },
  });
  const adapter = createGatewayAdapter(
    registry.llm,
    { CLOUDFLARE_ACCOUNT_ID: "fixture", AI_GATEWAY_ID: "fixture", OPENAI_API_KEY: "fixture" },
    () => model,
  );
  const result = await new Runtime(adapter, { sleep: async () => {} }).stream(
    "papers.qa",
    { question: "问题", guide: {}, claims: [], pages: "原文" },
    async () => {},
    { totalPages: 1 },
  );
  expect(result.ok).toBe(false);
  expect(calls).toBe(3);
  expect(result.reason).not.toContain("私密");
});
it("清单 timeout/maxOutputTokens/reasoning 传给 SDK；超时按 1s/2s 重试", async () => {
  const { MockLanguageModelV3 } = await import("ai/test");
  const { createGatewayAdapter } = await import("../src/gateway");
  const data = structuredClone(registry);
  const cap = data.capabilities["news.filing_digest"];
  if (!cap) throw new Error("缺清单");
  cap.limits.timeoutSec = 0.001;
  let calls = 0;
  const model = new MockLanguageModelV3({
    doGenerate: async (options) => {
      calls++;
      expect(options.maxOutputTokens).toBe(300);
      expect(options.providerOptions?.openai?.reasoningEffort).toBe(data.llm.tiers.fast?.reasoning);
      await new Promise((_, reject) => {
        if (options.abortSignal?.aborted) reject(new Error("超时"));
        else
          options.abortSignal?.addEventListener("abort", () => reject(new Error("超时")), {
            once: true,
          });
      });
      throw new Error("不应到达");
    },
  });
  const waits: number[] = [];
  const result = await new Runtime(
    createGatewayAdapter(
      data.llm,
      { CLOUDFLARE_ACCOUNT_ID: "fixture", AI_GATEWAY_ID: "fixture", OPENAI_API_KEY: "fixture" },
      () => model,
    ),
    {
      registry: data,
      sleep: async (ms) => {
        waits.push(ms);
      },
    },
  ).run("news.filing_digest", {
    symbol: "T",
    name: "测试",
    form: "8-K",
    items: [],
    text: "事实。",
  });
  expect(calls).toBe(3);
  expect(result.ok).toBe(false);
  expect(waits).toEqual([1000, 2000]);
});
it("图片页码绑定附件，缺附件拒绝而非静默省略", async () => {
  const data = structuredClone(registry);
  const cap = data.capabilities["news.filing_digest"];
  if (!cap) throw new Error();
  cap.io.input = "PaperReviewInput";
  cap.prompt = "prompts/paper_review.md";
  data.prompts["news.filing_digest"] = data.prompts["papers.review"] ?? "";
  const images = { 1: new Uint8Array([1]), 3: new Uint8Array([3]) };
  let calls = 0;
  const adapter: Adapter = {
    async generate(request) {
      calls++;
      expect(request.images).toEqual([images[1], images[3]]);
      expect(request.prompt.user).toContain("[\n  1,\n  3\n]");
      return {
        output: { digest: "事实。" },
        usage: { inputTokens: 1, outputTokens: 1, cachedInputTokens: 0 },
      };
    },
  };
  const input = {
    paperId: "p",
    paper: {
      id: "p",
      meta: { title: "论文" },
      status: {
        updatedAt: "2026-10-01",
        visibility: "private",
        review: "draft",
        readingDepth: "R0",
        nextAction: "阅读",
      },
    },
    pages: "原文事实",
    pageImages: [1, 3],
  };
  const runtime = new Runtime(adapter, { registry: data });
  const failed = await runtime.run("news.filing_digest", input);
  expect(failed.reason).toContain("附件");
  expect(calls).toBe(0);
  const result = await runtime.run("news.filing_digest", input, { images });
  expect(result.ok).toBe(true);
  expect(calls).toBe(1);
});
