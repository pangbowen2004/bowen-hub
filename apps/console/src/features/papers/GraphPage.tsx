import { privatePapersGetGraph } from "@bowen-hub/contracts/client";
import { GraphView } from "@bowen-hub/ui";
import { useQuery } from "@tanstack/react-query";
import { PaperHeader, QueryState } from "./shared";
export function GraphPage() {
  const query = useQuery({
    queryKey: ["papers", "graph"],
    queryFn: ({ signal }) => privatePapersGetGraph({ signal }),
  });
  return (
    <section className="papers-page">
      <PaperHeader
        title="在概念之间，找到下一条线索。"
        lead="全部论文与研究空间的关系；私人档案只在这里显示。"
      />
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
      {query.data && <GraphView data={query.data} />}
    </section>
  );
}
