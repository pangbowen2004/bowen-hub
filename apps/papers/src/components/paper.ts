import { createMarkdownProcessor } from "@astrojs/markdown-remark";
import type { GraphData, Paper, PaperSummary } from "@bowen-hub/contracts";

/** Raw HTML is never trusted; Markdown links retain only public web URLs/anchors. */
function safeMarkdown() {
  return (tree: { children?: MarkdownNode[] }) => {
    function clean(node: MarkdownNode) {
      if (node.children) {
        node.children = node.children.filter((child) => child.type !== "html");
        node.children.forEach(clean);
      }
      if (node.type === "heading") node.depth = Math.max(2, node.depth ?? 2);
      if (node.url && !/^(https?:\/\/|#)/i.test(node.url)) node.url = "#";
    }
    clean(tree);
  };
}
type MarkdownNode = {
  type?: string;
  depth?: number;
  url?: string;
  children?: MarkdownNode[];
  position?: { start: { line: number; offset?: number }; end: { line: number; offset?: number } };
};
/** Same paragraph counting as T30: strip genuine headings outside fences, then blank-line groups. */
function paragraphLines(article: string) {
  let fence: string | undefined;
  let index = 0;
  let body = false;
  let gap = false;
  const result = new Map<number, number>();
  article.split(/\r?\n/).forEach((line, lineIndex) => {
    const marker = /^\s{0,3}(`{3,}|~{3,})/.exec(line)?.[1];
    let outside = fence === undefined;
    if (marker) {
      if (!fence) fence = marker;
      else if (marker[0] === fence[0] && marker.length >= fence.length) fence = undefined;
      outside = false;
    }
    if (outside && /^\s{0,3}#{1,6}\s+/.test(line)) return;
    if (!line.trim()) {
      if (body) gap = true;
      return;
    }
    if (gap) {
      index++;
      gap = false;
    }
    body = true;
    result.set(lineIndex + 1, index);
  });
  return result;
}
export async function articleParagraphs(paper: Paper) {
  const article = paper.guide?.article ?? "";
  const indexes = paragraphLines(article);
  let captured: MarkdownNode[] = [];
  function capture() {
    return (tree: MarkdownNode) => {
      captured = [...(tree.children ?? [])];
    };
  }
  const renderer = await createMarkdownProcessor({
    remarkPlugins: [safeMarkdown, capture],
    syntaxHighlight: false,
  });
  await renderer.render(article);
  const nodes = captured;
  return Promise.all(
    nodes
      .filter((node) => node.position)
      .map(async (node) => {
        const position = node.position!;
        const start = position.start.offset,
          end = position.end.offset;
        if (start === undefined || end === undefined) throw new Error("Markdown节点缺少原文位置");
        const blockIndexes = new Set<number>();
        for (let line = position.start.line; line <= position.end.line; line++) {
          const index = indexes.get(line);
          if (index !== undefined) blockIndexes.add(index);
        }
        const blocks = [...blockIndexes]
          .map((index) => paper.evidence?.articleBlocks?.[index])
          .filter((block) => block !== undefined);
        const evidence = blocks.length
          ? {
              claimOrigin: blocks.some((block) => block.claimOrigin === "llm_inferred")
                ? ("llm_inferred" as const)
                : blocks[0]!.claimOrigin,
              claimIds: [...new Set(blocks.flatMap((block) => block.claimIds))],
            }
          : undefined;
        return {
          html: (await renderer.render(article.slice(start, end))).code,
          evidence,
          claims: (paper.evidence?.claims ?? []).filter((claim) =>
            evidence?.claimIds.includes(claim.id),
          ),
        };
      }),
  );
}
export { readingCoverage as coverageRatio } from "@bowen-hub/ui/react/PaperReader";
export function publicGraph(graph: GraphData, papers: PaperSummary[]): GraphData {
  const ids = new Set(papers.filter((p) => p.visibility === "public").map((p) => p.id));
  const nodes = graph.nodes.filter((node) => node.kind !== "paper" || ids.has(node.id));
  const allowed = new Set(nodes.map((node) => node.id));
  return {
    nodes,
    edges: graph.edges.filter((e) => allowed.has(e.source) && allowed.has(e.target)),
    cooccurrence: graph.cooccurrence.filter((e) => allowed.has(e.source) && allowed.has(e.target)),
  };
}
export function relatedPapers(
  paper: Paper,
  papers: Paper[],
  summaries: PaperSummary[],
  graph: GraphData,
) {
  const publicIds = new Set(summaries.filter((p) => p.visibility === "public").map((p) => p.id));
  const others = papers.filter(
    (p) => p.id !== paper.id && publicIds.has(p.id) && p.status.visibility === "public",
  );
  const conceptsFor = (id: string) =>
    new Set(
      graph.edges
        .filter(
          (edge) =>
            edge.type === "discusses" &&
            edge.source === id &&
            graph.nodes.some((node) => node.id === edge.target && node.kind === "concept"),
        )
        .map((edge) => edge.target),
    );
  const concepts = conceptsFor(paper.id);
  return {
    concepts: others
      .map((p) => ({
        paper: p,
        count: [...conceptsFor(p.id)].filter((id) => concepts.has(id)).length,
      }))
      .filter((p) => p.count > 0)
      .sort((a, b) => b.count - a.count || a.paper.id.localeCompare(b.paper.id))
      .slice(0, 5)
      .map((p) => p.paper),
    spaces: others.filter((p) => p.spaces?.some((space) => paper.spaces?.includes(space))),
    relations: others.filter((p) => paper.relations?.some((relation) => relation.target === p.id)),
  };
}
export function paperMarkdown(paper: Paper) {
  const cell = (value?: string | number | null) =>
    String(value ?? "—")
      .replaceAll("|", "\\|")
      .replaceAll("\n", " ");
  const claims = paper.evidence?.claims ?? [];
  return `${paper.guide?.article ?? `# ${paper.meta.titleZh ?? paper.meta.title}`}\n\n${claims.length ? `## 原文证据\n\n| 类型 | 主张 | 指标 | 条件 | 原文定位 | 边界 |\n| --- | --- | --- | --- | --- | --- |\n${claims.map((c) => `| ${[c.kind, c.claim, c.metric, c.condition, [c.anchor, c.pdfPage ? `PDF p.${c.pdfPage}` : null].filter(Boolean).join(" · "), c.interpretationBoundary].map(cell).join(" | ")} |`).join("\n")}` : ""}\n`;
}
