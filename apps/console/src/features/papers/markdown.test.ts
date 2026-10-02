import { Paper as PaperSchema } from "@bowen-hub/contracts/zod";
import { expect, it } from "vitest";
import paperRaw from "../../../../../fixtures/samples/papers/Paper.arxiv-2505.07078.json";
import { articleParagraphs, exportMarkdown, markdown } from "./markdown";

it("私人笔记和导读不执行原始HTML或危险链接", () => {
  const html = markdown(
    "# 一级标题\n\n<script>alert(1)</script>\n\n[危险](javascript:alert(1))\n\n[原文](https://arxiv.org/abs/1706.03762)",
  );
  expect(html).not.toContain("<script");
  expect(html).not.toContain("javascript:");
  expect(html).toContain("<h2>");
  expect(html).toContain('href="https://arxiv.org/abs/1706.03762"');
});
it("标题和围栏内容保持物理证据段对应关系", () => {
  const paper = PaperSchema.parse(paperRaw);
  paper.guide = {
    ...paper.guide,
    article: "# 标题\n\n第一段。\n\n## 方法\n\n```text\n# 围栏不是标题\n```\n\n最后一段。",
  };
  paper.evidence = {
    ...paper.evidence,
    claims: [
      { id: "a", kind: "method", claim: "方法", pdfPage: 1 },
      { id: "b", kind: "result", claim: "边界", pdfPage: 2 },
    ],
    articleBlocks: [
      { claimOrigin: "paper_supported", claimIds: ["a"] },
      { claimOrigin: "llm_inferred", claimIds: ["b"] },
      { claimOrigin: "paper_supported", claimIds: ["a", "b"] },
    ],
  };
  const nodes = articleParagraphs(paper);
  expect(nodes.filter((node) => node.html.startsWith("<h"))).toHaveLength(2);
  expect(
    nodes.find((node) => node.html.includes("第一段"))?.claims.map((claim) => claim.id),
  ).toEqual(["a"]);
  expect(nodes.find((node) => node.html.startsWith("<pre"))?.evidence?.claimOrigin).toBe(
    "llm_inferred",
  );
  expect(
    nodes.find((node) => node.html.includes("最后一段"))?.claims.map((claim) => claim.id),
  ).toEqual(["a", "b"]);
});
it("导出保留原文页码与表格边界", () => {
  const paper = PaperSchema.parse(paperRaw);
  paper.evidence = {
    ...paper.evidence,
    claims: [
      {
        id: "c",
        kind: "result",
        claim: "A|B",
        pdfPage: 3,
        anchor: "Table 1",
        interpretationBoundary: "仅特定条件",
      },
    ],
  };
  const text = exportMarkdown(paper);
  expect(text).toContain("A\\|B");
  expect(text).toContain("PDF p.3 · Table 1");
  expect(text).toContain("仅特定条件");
});
