import type { GraphData, Paper, PaperSummary } from "@bowen-hub/contracts";
import { describe, expect, it } from "vitest";
import {
  articleParagraphs,
  coverageRatio,
  paperMarkdown,
  publicGraph,
  relatedPapers,
} from "./paper";

const paper: Paper = {
  id: "public",
  meta: { title: "Public" },
  status: {
    visibility: "public",
    review: "passed",
    readingDepth: "R1",
    nextAction: "",
    updatedAt: "2026-10-01",
  },
  guide: { article: "# Heading\n\nFirst paragraph\n\n## Heading two\n\nSecond paragraph" },
  evidence: {
    articleBlocks: [
      { claimOrigin: "paper_supported", claimIds: ["c1"] },
      { claimOrigin: "llm_inferred", claimIds: [] },
    ],
    claims: [{ id: "c1", kind: "result", claim: "Observed result", pdfPage: 3, anchor: "Table 1" }],
  },
};
describe("public reading content", () => {
  it("maps non-heading blocks to evidence without consuming heading indexes", async () => {
    const blocks = await articleParagraphs(paper);
    expect(blocks[0]?.evidence).toBeUndefined();
    expect(blocks[1]?.claims[0]?.id).toBe("c1");
    expect(blocks[2]?.evidence).toBeUndefined();
    expect(blocks[3]?.evidence?.claimOrigin).toBe("llm_inferred");
  });
  it("omits raw HTML and unsafe Markdown links", async () => {
    const blocks = await articleParagraphs({
      ...paper,
      guide: { article: "<script>alert(1)</script>\n\n[unsafe](javascript:alert)\n\n**safe**" },
    });
    expect(blocks.map((b) => b.html).join("")).not.toContain("<script>");
    expect(blocks.map((b) => b.html).join("")).not.toContain("javascript:");
    expect(blocks.at(-1)?.html).toContain("<strong>safe</strong>");
  });
  it("supports minimal migrated papers and unavailable coverage", async () => {
    expect(await articleParagraphs({ ...paper, guide: undefined })).toEqual([]);
    expect(coverageRatio()).toBeNull();
  });
  it("weights reading coverage and excludes not applicable", () => {
    expect(
      coverageRatio([
        { dimension: "a", status: "complete" },
        { dimension: "b", status: "partial" },
        { dimension: "c", status: "missing" },
        { dimension: "d", status: "not_applicable" },
      ]),
    ).toBe(0.5);
  });
  it("exports claims with PDF anchors without private cards", () => {
    const markdown = paperMarkdown(paper);
    expect(markdown).toContain("PDF p.3");
    expect(markdown).toContain("Table 1");
    expect(markdown).not.toContain("c1");
  });
  it("removes private paper nodes and incident edges", () => {
    const data: GraphData = {
      nodes: [
        { id: "public", kind: "paper", label: "Public" },
        { id: "private", kind: "paper", label: "SECRET" },
        { id: "concept", kind: "concept", label: "Concept" },
      ],
      edges: [
        { source: "private", target: "concept", type: "discusses" },
        { source: "public", target: "concept", type: "discusses" },
      ],
      cooccurrence: [],
    };
    const summaries = [{ id: "public", visibility: "public" }] as PaperSummary[];
    expect(publicGraph(data, summaries).nodes.map((n) => n.id)).toEqual(["public", "concept"]);
    expect(publicGraph(data, summaries).edges).toHaveLength(1);
  });
  it("related papers exclude private and self; concept matches do not synthesize graph edges", () => {
    const other = {
      ...paper,
      id: "other",
      structure: { concepts: [{ id: "shared", name: "Shared" }] },
    };
    const privatePaper = {
      ...other,
      id: "private",
      status: { ...paper.status, visibility: "private" as const },
    };
    const summaries = [
      { id: "other", visibility: "public" },
      { id: "private", visibility: "private" },
    ] as PaperSummary[];
    const related = relatedPapers(
      { ...paper, structure: { concepts: [{ id: "shared", name: "Shared" }] } },
      [other, privatePaper],
      summaries,
      {
        nodes: [{ id: "canonical:shared", kind: "concept", label: "Shared" }],
        edges: [
          { source: "public", target: "canonical:shared", type: "discusses" },
          { source: "other", target: "canonical:shared", type: "discusses" },
        ],
        cooccurrence: [],
      },
    );
    expect(related.concepts.map((p) => p.id)).toEqual(["other"]);
  });
  it("retains headings without blank lines while keeping the T30 body index", async () => {
    const blocks = await articleParagraphs({
      ...paper,
      guide: {
        article:
          "## Heading\nFirst paragraph\n### Nested heading\nSame paragraph\n\nSecond paragraph",
      },
    });
    expect(blocks.filter((block) => block.html.startsWith("<h"))).toHaveLength(2);
    const body = blocks.filter((block) => !block.html.startsWith("<h"));
    expect(body[0]?.claims[0]?.id).toBe("c1");
    expect(body[1]?.claims[0]?.id).toBe("c1");
    expect(body[2]?.evidence?.claimOrigin).toBe("llm_inferred");
  });
  it("preserves fenced fake headings and code blank lines without shifting following evidence", async () => {
    const input = {
      ...paper,
      guide: { article: "~~~markdown\n## Not a heading\n~~~\n\nSecond paragraph" },
    };
    const blocks = await articleParagraphs(input);
    expect(blocks[0]?.html).toContain("<pre");
    expect(blocks[0]?.html).toContain("## Not a heading");
    expect(blocks[0]?.claims[0]?.id).toBe("c1");
    expect(blocks[1]?.evidence?.claimOrigin).toBe("llm_inferred");
  });
  it("matches canonical derived graph concepts, not local IDs; configured aliases can share a graph target", () => {
    const original = { ...paper, structure: { concepts: [{ id: "k1", name: "Sharpe ratio" }] } };
    const alias = {
      ...paper,
      id: "alias",
      structure: { concepts: [{ id: "k9", name: "夏普比率" }] },
    };
    const different = {
      ...paper,
      id: "different",
      structure: { concepts: [{ id: "k1", name: "历史成分股" }] },
    };
    const graph: GraphData = {
      nodes: [
        { id: "concept:夏普比率", kind: "concept", label: "夏普比率" },
        { id: "concept:历史成分股", kind: "concept", label: "历史成分股" },
      ],
      edges: [
        { source: "public", target: "concept:夏普比率", type: "discusses" },
        { source: "alias", target: "concept:夏普比率", type: "discusses" },
        { source: "different", target: "concept:历史成分股", type: "discusses" },
      ],
      cooccurrence: [],
    };
    const summaries = [
      { id: "alias", visibility: "public" },
      { id: "different", visibility: "public" },
    ] as PaperSummary[];
    expect(
      relatedPapers(original, [alias, different], summaries, graph).concepts.map((p) => p.id),
    ).toEqual(["alias"]);
    expect(graph.edges).toHaveLength(3);
  });
});
