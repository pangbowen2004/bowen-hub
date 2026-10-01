import { expect, it } from "vitest";
import { paperSearch } from "./search";

it("indexes Chinese title, English author prefixes, concepts, spaces and the conclusion entirely locally", () => {
  const search = paperSearch([
    {
      id: "p",
      title: "长期金融投资策略",
      authors: "Weixian Waylon Li",
      oneSentence: "没有稳定的风险调整优势",
      concepts: "滚动评估",
      spaces: "量化金融 Harness 与智能体",
    },
    {
      id: "other",
      title: "语言模型理论",
      authors: "Other Author",
      oneSentence: "理论边界",
      concepts: "证明",
      spaces: "通用研究",
    },
  ]);
  for (const query of ["金融", "weix", "滚动", "量化", "风险"])
    expect([...search(query)]).toEqual(["p"]);
  expect([...search("金融 证明")]).toEqual([]);
  expect([...search("不存在的论文")]).toEqual([]);
  expect([...search("")]).toEqual(["p", "other"]);
});
