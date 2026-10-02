import { readFileSync } from "node:fs";
import { expect, it } from "vitest";
import { extractCitationPages } from "../src/citations";
import { type Adapter, Runtime } from "../src/runtime";

it.each([
  ["[论文 p.5]", [5]],
  ["[论文 pp.3–4]", [3, 4]],
  ["[论文 pp.6、10–11]", [6, 10, 11]],
  ["[论文 p.9,12][论文 pp.3—4;9]", [9, 12, 3, 4]],
  ["[论文 pp.10–15]", [10, 11, 12, 15]],
  ["[论文 pp.1–999999999]", [...Array.from({ length: 12 }, (_, i) => i + 1), 999999999]],
  ["[论文 pp.1–99999999999999999999]", [...Array.from({ length: 12 }, (_, i) => i + 1), 0]],
  ["[论文 pp.4–2][论文 p.0][论文 p.-1][论文 p.1.5][论文 p.abc][论文 p.]", [0]],
])("页码提取 %s 正确保留标注且有界展开", (text, expected) => {
  expect(extractCitationPages(text, 12)).toEqual(expected);
});
it("分块复合引用在末尾统一校验，正文逐字不变、越界明确标注", async () => {
  const chunks = ["事实[论文 pp.3", "–4]、[论文 pp.6、10–15]", "；错误[论文 p.-1]。"];
  const emitted: string[] = [];
  const adapter: Adapter = {
    async generate() {
      throw new Error("仅流");
    },
    async stream() {
      return {
        text: (async function* () {
          yield* chunks;
        })(),
        usage: Promise.resolve({ inputTokens: 10, outputTokens: 20, cachedInputTokens: 0 }),
      };
    },
  };
  const result = await new Runtime(adapter).stream(
    "papers.qa",
    { question: "问题", guide: {}, claims: [], pages: "原文" },
    async (text) => {
      emitted.push(text);
    },
    { totalPages: 12 },
  );
  expect(result.ok).toBe(true);
  expect(emitted).toEqual(chunks);
  expect(result.output?.answer).toBe(chunks.join(""));
  expect(result.output?.pages).toEqual([3, 4, 6, 10, 11, 12]);
  expect(result.reports[0]?.changes).toContain("$.pages");
});

it("真实截断成稿中的复合页标完整提取，坏标注仍可见", () => {
  const text = readFileSync(new URL("./fixtures/real-paper-answer.md", import.meta.url), "utf8");
  const pages = extractCitationPages(text, 15);
  expect(pages.filter((n) => n > 0).sort((a, b) => a - b)).toEqual([
    1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12,
  ]);
  expect(pages).toContain(0); // 模型把“推断”混入页标，不静默视为合法页数。
});
