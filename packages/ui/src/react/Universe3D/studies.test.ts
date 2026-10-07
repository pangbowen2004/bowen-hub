import type { GraphData } from "@bowen-hub/contracts";
import { describe, expect, it } from "vitest";
import { groupStudies, publicationLabel, publicationNotes, studyGraph, studyKey } from "./studies";

describe("论文版本与发表信息", () => {
  it("同一arXiv版本合并，取最高版本，不混合近似标题", () => {
    const rows = [
      { id: "arxiv-2409.06289-v1" },
      { id: "arxiv-2409.06289-v2" },
      { id: "arxiv-2410.12345", title: "同名研究" },
    ];
    expect(groupStudies(rows)).toHaveLength(2);
    expect(groupStudies(rows)[0]!.paper.id).toBe("arxiv-2409.06289-v2");
    expect(studyKey("arxiv-2409.06289v1")).toBe("arxiv-2409.06289");
    // 可见范围先过滤：只有v1公开时不能泄露未公开的v2。
    expect(groupStudies(rows.slice(0, 1))[0]!.versions).toEqual([rows[0]]);
  });
  it("图谱关系合入代表版本，去重与过滤未开放节点", () => {
    const data: GraphData = {
      cooccurrence: [],
      nodes: [
        { id: "arxiv-2409.06289-v1", label: "v1", kind: "paper" },
        { id: "arxiv-2409.06289-v2", label: "v2", kind: "paper" },
        { id: "private", label: "私有", kind: "paper" },
        { id: "concept", label: "概念", kind: "concept" },
      ],
      edges: [
        { source: "arxiv-2409.06289-v1", target: "concept", type: "discusses" },
        { source: "arxiv-2409.06289-v2", target: "concept", type: "discusses" },
        { source: "private", target: "concept", type: "discusses" },
      ],
    };
    const result = studyGraph(data, [{ id: "arxiv-2409.06289-v1" }, { id: "arxiv-2409.06289-v2" }]);
    expect(result.nodes.filter((node) => node.kind === "paper").map((node) => node.id)).toEqual([
      "arxiv-2409.06289-v2",
    ]);
    expect(result.edges).toEqual([
      { source: "arxiv-2409.06289-v2", target: "concept", type: "discusses" },
    ]);
  });
  it("列表只用简称，核对备注分开，未核实不充当发表渠道", () => {
    expect(publicationLabel("ACL 2025 (Long Papers)")).toBe("ACL");
    expect(publicationLabel("Findings of ACL 2026")).toBe("Findings of ACL");
    expect(publicationLabel("arXiv预印本（PDF会议信息为模板占位，不作为正式发表信息）")).toBe(
      "arXiv",
    );
    expect(publicationNotes("arXiv预印本（PDF会议信息为模板占位，不作为正式发表信息）")).toBe(
      "PDF会议信息为模板占位，不作为正式发表信息",
    );
    expect(publicationLabel("未核实")).toBe("");
    expect(publicationLabel(null)).toBe("");
  });
});
