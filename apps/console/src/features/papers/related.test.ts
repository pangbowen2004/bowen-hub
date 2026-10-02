import { Paper as PaperSchema, PaperSummary as SummarySchema } from "@bowen-hub/contracts/zod";
import { expect, it } from "vitest";
import raw from "../../../../../fixtures/samples/papers/Paper.arxiv-2505.07078.json";
import summaries from "../../../../../fixtures/samples/papers/PaperSummary.all.json";
import { relatedPapers } from "./RelatedPapers";

it("共同概念最多五篇，排除自己；关系和空间依实际数据保留", () => {
  const paper = PaperSchema.parse(raw);
  const base = SummarySchema.parse(summaries[0]);
  paper.relations = [{ target: "other-6", type: "extends" }];
  const rows = Array.from({ length: 7 }, (_, i) => ({
    ...base,
    id: `other-${i}`,
    spaces: [paper.spaces?.[0] ?? "quant-finance"],
  }));
  const groups = relatedPapers(paper, [SummarySchema.parse(summaries[1]), ...rows], {
    nodes: [],
    cooccurrence: [],
    edges: [paper.id, ...rows.map((row) => row.id)].map((id) => ({
      source: id,
      target: "concept:actual",
      type: "discusses",
    })),
  });
  expect(groups[0]?.items).toHaveLength(5);
  expect(groups[0]?.items.some((row) => row.id === paper.id)).toBe(false);
  expect(groups[1]?.items).toHaveLength(7);
  expect(groups[2]?.items.map((row) => row.id)).toEqual(["other-6"]);
});
