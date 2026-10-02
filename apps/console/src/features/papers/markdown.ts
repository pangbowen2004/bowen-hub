import type { Paper, PaperArticleBlock } from "@bowen-hub/contracts";
import rehypeStringify from "rehype-stringify";
import remarkGfm from "remark-gfm";
import remarkParse from "remark-parse";
import remarkRehype from "remark-rehype";
import { unified } from "unified";

type Node = {
  type: string;
  depth?: number;
  url?: string;
  children?: Node[];
  position?: { start: { line: number }; end: { line: number } };
};
function safeMarkdown() {
  return (tree: Node) => {
    function clean(node: Node) {
      if (node.type === "heading") node.depth = Math.max(2, node.depth ?? 2);
      if (node.url && !/^(https?:\/\/|#)/i.test(node.url)) node.url = "#";
      if (node.children) {
        node.children = node.children.filter((child) => child.type !== "html");
        node.children.forEach(clean);
      }
    }
    clean(tree);
  };
}
const renderer = unified()
  .use(remarkParse)
  .use(remarkGfm)
  .use(safeMarkdown)
  .use(remarkRehype)
  .use(rehypeStringify);

export function markdown(text: string): string {
  return String(renderer.processSync(text));
}

/** 与领域校验相同：代码围栏外的纯标题不占证据段编号。 */
export function articleParagraphs(paper: Paper) {
  const article = paper.guide?.article ?? "";
  const indexes = new Map<number, number>();
  let fence: string | undefined;
  let index = 0;
  let body = false;
  let gap = false;
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
    indexes.set(lineIndex + 1, index);
  });
  const tree = renderer.parse(article);
  return tree.children.map((node) => {
    const blockIndexes = new Set<number>();
    if (node.position) {
      for (let line = node.position.start.line; line <= node.position.end.line; line++) {
        const value = indexes.get(line);
        if (value !== undefined) blockIndexes.add(value);
      }
    }
    const blocks = [...blockIndexes]
      .map((n) => paper.evidence?.articleBlocks?.[n])
      .filter((value): value is PaperArticleBlock => value !== undefined);
    const evidence: PaperArticleBlock | undefined = blocks.length
      ? {
          claimOrigin: blocks.some((block) => block.claimOrigin === "llm_inferred")
            ? "llm_inferred"
            : blocks[0]!.claimOrigin,
          claimIds: [...new Set(blocks.flatMap((block) => block.claimIds))],
        }
      : undefined;
    const html = renderer.stringify(renderer.runSync({ type: "root", children: [node] }));
    return {
      html: String(html),
      evidence,
      claims: (paper.evidence?.claims ?? []).filter((claim) =>
        evidence?.claimIds.includes(claim.id),
      ),
    };
  });
}

export function exportMarkdown(paper: Paper) {
  const cell = (value: string | null | undefined) =>
    (value ?? "").replace(/\|/g, "\\|").replace(/\r?\n/g, " ");
  return `# ${paper.meta.titleZh ?? paper.meta.title}\n\n${paper.guide?.article ?? ""}\n\n## 关键证据\n\n| 主张 | 指标 | 条件 | 原文出处 | 解读边界 |\n|---|---|---|---|---|\n${(
    paper.evidence?.claims ?? []
  )
    .map(
      (claim) =>
        `| ${cell(claim.claim)} | ${cell(claim.metric)} | ${cell(claim.condition)} | PDF p.${claim.pdfPage ?? "待核对"} · ${cell(claim.anchor)} | ${cell(claim.interpretationBoundary)} |`,
    )
    .join("\n")}\n`;
}
