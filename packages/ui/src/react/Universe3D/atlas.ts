import type { GraphData, PaperSummary, PapersCatalog } from "@bowen-hub/contracts";

export type AtlasPaper = PaperSummary & {
  concepts: { id: string; label: string }[];
  categoryIds?: string[];
};
export function atlasPapers(data: GraphData, catalog?: PapersCatalog): AtlasPaper[] {
  const concepts = new Map(data.nodes.filter((n) => n.kind === "concept").map((n) => [n.id, n]));
  return data.nodes
    .filter((n) => n.kind === "paper")
    .map<AtlasPaper>((n) => {
      const summary = catalog?.papers.find((p) => p.id === n.id);
      return {
        ...(summary ?? {
          id: n.id,
          title: n.label,
          titleZh: null,
          year: null,
          venue: null,
          oneSentence: null,
          spaces: data.edges
            .filter((e) => e.type === "belongs_to" && e.source === n.id)
            .map((e) => e.target),
          readingDepth: "R0",
          paperKind: null,
          paperType: null,
          visibility: "public",
          review: "draft",
          updatedAt: "",
          hasCode: false,
          conceptCount: 0,
        }),
        concepts: data.edges
          .filter((e) => e.type === "discusses" && e.source === n.id && concepts.has(e.target))
          .map((e) => ({ id: e.target, label: concepts.get(e.target)?.label ?? e.target })),
      };
    })
    .sort(
      (a, b) =>
        b.updatedAt.localeCompare(a.updatedAt) ||
        (b.year ?? 0) - (a.year ?? 0) ||
        a.id.localeCompare(b.id),
    );
}
