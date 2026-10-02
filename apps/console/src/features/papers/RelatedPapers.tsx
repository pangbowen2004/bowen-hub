import type { GraphData, Paper, PaperSummary } from "@bowen-hub/contracts";
import { privatePapersGetGraph } from "@bowen-hub/contracts/client";
import { useQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { allPapers, QueryState } from "./shared";

export function relatedPapers(paper: Paper, papers: PaperSummary[], graph?: GraphData) {
  const concepts = new Set(
    graph?.edges
      .filter((edge) => edge.source === paper.id && edge.type === "discusses")
      .map((edge) => edge.target),
  );
  const shared = new Set(
    graph?.edges
      .filter((edge) => edge.type === "discusses" && concepts.has(edge.target))
      .map((edge) => edge.source),
  );
  const relations = new Set(paper.relations?.map((relation) => relation.target));
  for (const edge of graph?.edges ?? []) {
    if (edge.type !== "relation") continue;
    if (edge.source === paper.id) relations.add(edge.target);
    if (edge.target === paper.id) relations.add(edge.source);
  }
  const others = papers.filter((item) => item.id !== paper.id);
  return [
    { title: "共同概念", items: others.filter((item) => shared.has(item.id)).slice(0, 5) },
    {
      title: "同研究空间",
      items: others.filter((item) => item.spaces.some((space) => paper.spaces?.includes(space))),
    },
    { title: "论文关系", items: others.filter((item) => relations.has(item.id)) },
  ];
}

export function RelatedPapers({ paper }: { paper: Paper }) {
  const papers = useQuery({
    queryKey: ["papers", "list"],
    queryFn: ({ signal }) => allPapers(signal),
  });
  const graph = useQuery({
    queryKey: ["papers", "graph"],
    queryFn: ({ signal }) => privatePapersGetGraph({ signal }),
  });
  return (
    <section className="paper-panel">
      <h2>继续阅读</h2>
      <QueryState
        loading={papers.isPending || graph.isPending}
        error={papers.error ?? graph.error}
        retry={() => {
          void papers.refetch();
          void graph.refetch();
        }}
      />
      {papers.data &&
        graph.data &&
        relatedPapers(paper, papers.data, graph.data).map((group) => (
          <section key={group.title}>
            <h3>{group.title}</h3>
            {group.items.length === 0 ? (
              <p className="muted">暂无关联论文。</p>
            ) : (
              <ul>
                {group.items.map((item) => (
                  <li key={item.id}>
                    <Link to="/papers/$id" params={{ id: item.id }}>
                      {item.titleZh ?? item.title}
                    </Link>
                  </li>
                ))}
              </ul>
            )}
          </section>
        ))}
    </section>
  );
}
