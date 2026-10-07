import type { GraphData } from "@bowen-hub/contracts";

// 只合并明确的 arXiv 版本主键；相似标题不等于同一研究。
export function studyKey(id: string) {
  return id.replace(/(-\d{4}\.\d{4,5})-?v\d+$/, "$1");
}
export function versionNumber(id: string) {
  return Number(/-?v(\d+)$/.exec(id)?.[1] ?? 0);
}
export function groupStudies<T extends { id: string }>(papers: T[]) {
  const groups = new Map<string, T[]>();
  for (const paper of papers) {
    const key = studyKey(paper.id);
    const versions = groups.get(key) ?? [];
    versions.push(paper);
    groups.set(key, versions);
  }
  return [...groups].map(([key, rows]) => {
    const versions = [...rows].sort((a, b) => versionNumber(b.id) - versionNumber(a.id));
    return { key, paper: versions[0]!, versions };
  });
}
export function studyGraph(data: GraphData, papers: { id: string }[]): GraphData {
  const groups = groupStudies(papers),
    representatives = new Map(
      groups.flatMap((group) => group.versions.map((paper) => [paper.id, group.paper.id] as const)),
    );
  const paperIds = new Set(groups.map((group) => group.paper.id));
  const nodes = data.nodes.filter((node) => node.kind !== "paper" || paperIds.has(node.id));
  const ids = new Set(nodes.map((node) => node.id)),
    seen = new Set<string>();
  const edges = data.edges.flatMap((edge) => {
    const source = representatives.get(edge.source) ?? edge.source,
      target = representatives.get(edge.target) ?? edge.target;
    const key = JSON.stringify([source, target, edge.type]);
    if (source === target || !ids.has(source) || !ids.has(target) || seen.has(key)) return [];
    seen.add(key);
    return [{ ...edge, source, target }];
  });
  const connected = new Set(edges.flatMap((edge) => [edge.source, edge.target]));
  return {
    ...data,
    nodes: nodes.filter((node) => node.kind === "paper" || connected.has(node.id)),
    edges,
  };
}
export function publicationLabel(venue?: string | null) {
  if (!venue?.trim() || /^(未核实|未知|待核实)/.test(venue.trim())) return "";
  if (/arxiv/i.test(venue)) return "arXiv";
  if (/Findings of ACL/i.test(venue)) return "Findings of ACL";
  if (/Journal of Financial Economics/i.test(venue)) return "JFE";
  if (/Journal of Banking\s*&\s*Finance/i.test(venue)) return "JBF";
  if (/Financial Analysts Journal/i.test(venue)) return "FAJ";
  if (/SSRN/i.test(venue)) return "SSRN";
  const acronym =
    /\b(ACL|EMNLP|NAACL|ICLR|ICML|NeurIPS|AAAI|KDD|CVPR|ICCV|ECCV|SIGGRAPH|CHI|WWW)\b/i.exec(venue);
  return (
    acronym?.[1] ??
    venue
      .split(/[（(:：]/)[0]!
      .replace(/\s+\d{4}.*$/, "")
      .replace(/未核实/g, "")
      .trim()
  );
}
export function publicationNotes(venue?: string | null) {
  return venue?.match(/[（(]([^）)]+)[）)]/)?.[1] ?? "";
}
