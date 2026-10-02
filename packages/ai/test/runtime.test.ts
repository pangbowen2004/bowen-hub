import { readdirSync, readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { type CheckContext, CheckRegistry, quantities } from "../src/checks";
import { type Registry, registry } from "../src/registry";
import { renderPrompt } from "../src/render";
import {
  type Adapter,
  Runtime,
  retryAfterMs,
  StructureError,
  TransportError,
} from "../src/runtime";

const root = resolve(import.meta.dirname, "../../..");
const vectorRoot = resolve(root, "fixtures/samples/prompt-render");
for (const dir of readdirSync(vectorRoot, { withFileTypes: true }).filter((entry) =>
  entry.isDirectory(),
))
  it(`共享渲染 ${dir.name}`, () => {
    const folder = resolve(vectorRoot, dir.name);
    expect(
      renderPrompt(
        readFileSync(resolve(folder, "template.md"), "utf8"),
        JSON.parse(readFileSync(resolve(folder, "input.json"), "utf8")),
      ),
    ).toEqual(JSON.parse(readFileSync(resolve(folder, "expected.json"), "utf8")));
  });
it("图片占位只写页码", () =>
  expect(
    renderPrompt("## system\nx\n## user\n{{ pageImages }}\n", { pageImages: [1, 3] }).user,
  ).toBe("[\n  1,\n  3\n]"));
const context: CheckContext = {
  inputs: { text: "收入1.2 billion，涨1.23%。", articles: [{ id: 5 }, { id: "s1" }] },
  schema: {
    type: "object",
    properties: {
      text: { "x-max-chars": 8 },
      lines: { type: "array", items: { type: "string" }, "x-max-chars": 8 },
      items: { type: "array", items: { properties: { quote: { "x-source-quote": true } } } },
    },
  },
  adviceWords: ["建议买入"],
  totalPages: 3,
};
const checks = new CheckRegistry();
function check(name: string, output: Record<string, unknown>, ctx = context) {
  return checks.run([name], output, ctx);
}
describe("通用校验", () => {
  it.each(["1.2 billion", "1.2B", "12亿", "$1,200,000,000"])("数量规范化 %s", (text) =>
    expect([...quantities(text)]).toEqual([1.2e9]),
  );
  it.each([
    "2026年Q3发布8-K，Item 5.02，标普500。",
    "2026-10-01 03:00 Form 4 第三季度 October 3。",
  ])("日期指数排除 %s", (text) => expect(quantities(text).size).toBe(0));
  it("未知数量删除整句", () => {
    const r = check("numbers_in_sources", { text: "收入12亿。新增900%。" });
    expect(r.output.text).toBe("收入12亿。");
    expect(r.reports[0]?.changes).toHaveLength(1);
  });
  it("全部删除失败", () =>
    expect(check("numbers_in_sources", { text: "达到900%。" }).reports[0]?.failed).toBe(true));
  it("三位裸数需要来源，短数字保留", () =>
    expect(check("numbers_in_sources", { text: "数量123。第2次。" }).output.text).toBe("第2次。"));
  it("引用去除行号与空白，删掉无效项", () => {
    const r = check(
      "quotes_in_sources",
      { items: [{ quote: "收入 12亿" }, { quote: "伪造引文" }] },
      { ...context, inputs: { pages: "L123: 收入\nL124: 12亿" } },
    );
    expect(r.output.items).toEqual([{ quote: "收入 12亿" }]);
  });
  it("数字来源 id 保留", () =>
    expect(check("source_ids_exist", { sourceIds: [5, "s1", "fake"] }).output.sourceIds).toEqual([
      5,
      "s1",
    ]));
  it("空引用允许，全无效失败", () => {
    expect(check("source_ids_exist", { sourceIds: [] }).reports[0]?.failed).toBe(false);
    expect(check("source_ids_exist", { sourceIds: ["fake"] }).reports[0]?.failed).toBe(true);
  });
  it("非法条目 id 删除", () =>
    expect(
      check("source_ids_exist", { items: [{ id: "s1" }, { id: "fake" }] }).output.items,
    ).toEqual([{ id: "s1" }]));
  it("建议删句", () =>
    expect(check("no_advice", { text: "事实明确。建议买入。" }).output.text).toBe("事实明确。"));
  it("完整句截断与数组注解", () =>
    expect(
      check("length_within", { text: "一句。第二句太长超过。", lines: ["一句。第二句太长超过。"] })
        .output,
    ).toEqual({ text: "一句。", lines: ["一句。"] }));
  it("无完整句则失败", () =>
    expect(check("length_within", { text: "没有完整句但是很长" }).reports[0]?.failed).toBe(true));
  it("页码数组与标量", () => {
    const r = check("pages_in_range", {
      pages: [0, 1, 3, 4],
      pagesChecked: [2, 5],
      visualPagesChecked: [3, 4],
      pdfPage: 8,
    });
    expect(r.output).toEqual({
      pages: [1, 3],
      pagesChecked: [2],
      visualPagesChecked: [3],
      pdfPage: null,
    });
    expect(r.reports[0]?.failed).toBe(true);
  });
  it("缺页码上下文失败", () =>
    expect(() =>
      check("pages_in_range", { pages: [1] }, { ...context, totalPages: undefined }),
    ).toThrow("totalPages"));
  it("未注册领域校验失败", () => expect(() => check("paper_draft", {})).toThrow("未注册"));
});
const usage = { inputTokens: 100, outputTokens: 20, cachedInputTokens: 50 };
function fixture(autonomy: "L0" | "L1" | "L2" = "L2"): Registry {
  const result = structuredClone(registry);
  const cap = result.capabilities["news.filing_digest"];
  if (!cap) throw new Error("缺清单");
  cap.autonomy = autonomy;
  return result;
}
const input = { symbol: "TEST", name: "测试", form: "8-K", items: [], text: "增长1.2%。" };
it("重试 1s/2s、结构修复一次、完整用量与盖章", async () => {
  let calls = 0;
  const sleeps: number[] = [];
  const recorded: unknown[] = [];
  const adapter: Adapter = {
    async generate(request) {
      calls++;
      if (calls <= 2) throw new TransportError();
      if (calls === 3) return { output: { bad: true }, usage };
      expect(request.repair).toBe(true);
      return { output: { digest: "增长1.2%。" }, usage };
    },
  };
  const result = await new Runtime(adapter, {
    sleep: async (ms) => {
      sleeps.push(ms);
    },
    record: async (call) => {
      recorded.push(call);
    },
  }).run("news.filing_digest", input);
  expect(calls).toBe(4);
  expect(sleeps).toEqual([1000, 2000]);
  expect(result.ok).toBe(true);
  expect(result.schemaValid).toBe(false);
  expect(result.call.inputTokens).toBe(200);
  expect(result.output?.generatedBy).toMatchObject({
    capability: "news.filing_digest",
    version: 1,
    model: registry.llm.tiers.fast?.model,
  });
  expect(recorded).toHaveLength(1);
  const price = registry.llm.prices[result.call.model];
  expect(result.call.costUsd).toBe(
    (100 * (price?.input ?? 0) + 100 * (price?.cachedInput ?? 0) + 40 * (price?.output ?? 0)) / 1e6,
  );
});
it("传输最终失败记录且不泄漏正文", async () => {
  let calls = 0;
  const result = await new Runtime(
    {
      async generate() {
        calls++;
        throw new TransportError("密钥正文");
      },
    },
    { sleep: async () => {} },
  ).run("news.filing_digest", input);
  expect(calls).toBe(3);
  expect(result.call.ok).toBe(false);
  expect(result.reason).not.toContain("密钥");
  expect(result.fallback).toBe("items_only");
});
it("结构错误最多两次", async () => {
  let calls = 0;
  const result = await new Runtime({
    async generate() {
      calls++;
      throw new StructureError(usage);
    },
  }).run("news.filing_digest", input);
  expect(calls).toBe(2);
  expect(result.ok).toBe(false);
  expect(result.call.inputTokens).toBe(200);
});
it.each(["L0", "L1", "L2"] as const)("自治 %s", async (autonomy) => {
  const result = await new Runtime(
    {
      async generate() {
        return { output: { digest: "增长1.2%。" }, usage };
      },
    },
    { registry: fixture(autonomy) },
  ).run("news.filing_digest", input);
  expect(result.status).toBe(autonomy === "L0" ? "shadow" : autonomy === "L1" ? "draft" : "ready");
  expect(result.output === null).toBe(autonomy === "L0");
});
const qa = { question: "问题", guide: {}, claims: [], pages: "=== p.1 ===\n原文" };
it("流末清除页码，保留已发回答", async () => {
  const chunks = ["回答[论文 p.1]", "越界[论文 p.9]"];
  const sent: string[] = [];
  const adapter: Adapter = {
    async generate() {
      throw new Error("不应进入结构化入口");
    },
    async stream() {
      return {
        text: (async function* () {
          yield* chunks;
        })(),
        usage: Promise.resolve(usage),
      };
    },
  };
  const result = await new Runtime(adapter).stream(
    "papers.qa",
    qa,
    async (text) => {
      sent.push(text);
    },
    { totalPages: 3 },
  );
  expect(result.ok).toBe(true);
  expect(sent).toEqual(chunks);
  expect(result.output?.answer).toBe(chunks.join(""));
  expect(result.output?.pages).toEqual([1]);
  expect(result.reports[0]?.changes).toContain("$.pages");
});
it("流内容发送后失败不重发", async () => {
  let calls = 0;
  const sent: string[] = [];
  const adapter: Adapter = {
    async generate() {
      throw new Error();
    },
    async stream() {
      calls++;
      return {
        text: (async function* () {
          yield "已发送";
          throw new TransportError();
        })(),
        usage: Promise.resolve(usage),
      };
    },
  };
  const result = await new Runtime(adapter, { sleep: async () => {} }).stream(
    "papers.qa",
    qa,
    async (text) => {
      sent.push(text);
    },
    { totalPages: 3 },
  );
  expect(calls).toBe(1);
  expect(sent).toEqual(["已发送"]);
  expect(result.ok).toBe(false);
  expect(result.call.inputTokens).toBe(100);
});
it("缺总页数时不调模型", async () => {
  let calls = 0;
  const result = await new Runtime({
    async generate() {
      calls++;
      throw new Error();
    },
  }).run("papers.qa", qa);
  expect(calls).toBe(0);
  expect(result.reason).toContain("totalPages");
});
it("流建立后未发块的传输失败仍退避，首次块后停止重试", async () => {
  let calls = 0;
  const waits: number[] = [];
  const adapter: Adapter = {
    async generate() {
      throw new Error();
    },
    async stream() {
      calls++;
      return {
        text: (async function* () {
          if (calls < 3) throw new TransportError();
          yield "答[论文 p.1]";
        })(),
        usage: Promise.resolve(usage),
      };
    },
  };
  const result = await new Runtime(adapter, {
    sleep: async (ms) => {
      waits.push(ms);
    },
  }).stream("papers.qa", qa, async () => {}, { totalPages: 3 });
  expect(result.ok).toBe(true);
  expect(calls).toBe(3);
  expect(waits).toEqual([1000, 2000]);
  expect(result.call.inputTokens).toBe(300);
});
it("AI SDK官方 mock 模型经适配器输出", async () => {
  const { MockLanguageModelV3 } = await import("ai/test");
  const { createGatewayAdapter } = await import("../src/gateway");
  const model = new MockLanguageModelV3({
    doGenerate: {
      content: [{ type: "text", text: '{"digest":"增长1.2%。"}' }],
      finishReason: { unified: "stop", raw: "stop" },
      usage: {
        inputTokens: { total: 100, noCache: 50, cacheRead: 50, cacheWrite: 0 },
        outputTokens: { total: 20, text: 20, reasoning: 0 },
      },
      warnings: [],
    },
  });
  const adapter = createGatewayAdapter(
    registry.llm,
    { CLOUDFLARE_ACCOUNT_ID: "fixture", AI_GATEWAY_ID: "fixture", OPENAI_API_KEY: "fixture" },
    () => model,
  );
  const result = await new Runtime(adapter).run("news.filing_digest", input);
  expect(result.ok).toBe(true);
  expect(result.call.inputTokens).toBe(100);
  expect(model.doGenerateCalls).toHaveLength(1);
});

it("只对429解析有界秒数和HTTP日期，不接受无效等待", () => {
  const now = Date.parse("2026-10-02T01:00:00Z");
  expect(retryAfterMs(429, "7", now)).toBe(7000);
  expect(retryAfterMs(429, "10000", now)).toBe(60000);
  expect(retryAfterMs(429, "Fri, 02 Oct 2026 01:00:08 GMT", now)).toBe(8000);
  for (const header of [
    "",
    "NaN",
    "-2",
    "Infinity",
    "0x10",
    "0b111",
    "1e1",
    "Mon, 30 Feb 2026 01:00:00 GMT",
    "Fri, 02 Oct 2026 00:59:59 GMT",
  ])
    expect(retryAfterMs(429, header, now)).toBeUndefined();
  expect(retryAfterMs(500, "30", now)).toBeUndefined();
  expect(
    retryAfterMs(429, "Mon, 30 Feb 2026 01:00:00 GMT", Date.parse("2026-01-01T00:00:00Z")),
  ).toBeUndefined();
});
it.each([7000, 100000, Number.NaN])(
  "普通和未发布流尊重有界限流等待 %s，仍仅三次",
  async (delay) => {
    for (const streaming of [false, true]) {
      let calls = 0;
      const waits: number[] = [];
      const fail = async () => {
        calls++;
        throw new TransportError("安全传输错误", delay);
      };
      const r = new Runtime(
        { generate: fail, stream: fail },
        {
          sleep: async (ms) => {
            waits.push(ms);
          },
        },
      );
      const result = streaming
        ? await r.stream("papers.qa", qa, async () => {}, { totalPages: 3 })
        : await r.run("news.filing_digest", input);
      expect(result.ok).toBe(false);
      expect(calls).toBe(3);
      expect(waits).toEqual(
        Number.isNaN(delay) ? [1000, 2000] : [Math.min(delay, 60000), Math.min(delay, 60000)],
      );
    }
  },
);
