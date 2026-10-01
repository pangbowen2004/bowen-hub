import type { GraphData } from "@bowen-hub/contracts";
import Graph from "graphology";
export type GraphMode = "relations" | "cooccurrence";
export function makeGraph(data: GraphData, mode: GraphMode, colors: Record<string, string>) {
  const graph = new Graph({ multi: true, type: "undirected" });
  const nodes =
    mode === "cooccurrence" ? data.nodes.filter((n) => n.kind === "concept") : data.nodes;
  nodes.forEach((node, i) => {
    const angle = (i / Math.max(nodes.length, 1)) * Math.PI * 2;
    graph.addNode(node.id, {
      label: node.label,
      kind: node.kind,
      x: Math.cos(angle),
      y: Math.sin(angle),
      size: node.kind === "paper" ? 10 : 7,
      color: colors[node.kind],
    });
  });
  const edges = mode === "cooccurrence" ? data.cooccurrence : data.edges;
  edges.forEach((edge, i) => {
    if (graph.hasNode(edge.source) && graph.hasNode(edge.target))
      graph.addEdgeWithKey(String(i), edge.source, edge.target, {
        label: "count" in edge ? `${edge.count} 篇论文共同出现` : edge.type,
        size: "count" in edge ? Math.max(1, Math.log2(edge.count + 1)) : 1,
        color: colors.border,
      });
  });
  return graph;
}
