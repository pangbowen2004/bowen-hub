import { expect, it } from "vitest";
import { makeGraph } from "./graph";

const data = {
  nodes: [
    { id: "p", kind: "paper" as const, label: "Paper" },
    { id: "a", kind: "concept" as const, label: "A" },
    { id: "b", kind: "concept" as const, label: "B" },
  ],
  edges: [{ source: "p", target: "a", type: "discusses" as const }],
  cooccurrence: [{ source: "a", target: "b", count: 3 }],
};
it("keeps explicit relations separate from weighted concept cooccurrence", () => {
  const colors = { paper: "#1", concept: "#2", space: "#3", border: "#4" };
  const relations = makeGraph(data, "relations", colors);
  expect(relations.order).toBe(3);
  expect(relations.size).toBe(1);
  expect(relations.getNodeAttribute("p", "color")).toBe("#1");
  const cooccurrence = makeGraph(data, "cooccurrence", colors);
  expect(cooccurrence.hasNode("p")).toBe(false);
  expect(cooccurrence.size).toBe(1);
  expect(cooccurrence.getEdgeAttribute("0", "size")).toBe(2);
});
