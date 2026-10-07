import { privatePapersGetCatalog, privatePapersGetGraph } from "@bowen-hub/contracts/client";
import {
  groupStudies,
  studyGraph,
  Universe3D,
  visibleTaxonomy,
} from "@bowen-hub/ui/react/Universe3D";
import { useQuery } from "@tanstack/react-query";
import taxonomySource from "../../../../../config/paper_topics.json";
import { PaperHeader, QueryState } from "./shared";
export function GraphPage() {
  const query = useQuery({
    queryKey: ["papers", "graph"],
    queryFn: ({ signal }) => privatePapersGetGraph({ signal }),
  });
  const catalog = useQuery({
    queryKey: ["papers", "catalog"],
    queryFn: ({ signal }) => privatePapersGetCatalog({ signal }),
  });
  const readable = catalog.data?.papers.filter((p) => p.readingDepth !== "R0") ?? [];
  const studies = groupStudies(readable).map((group) => group.paper);
  const taxonomy = visibleTaxonomy(
    taxonomySource,
    studies.map((p) => p.id),
  );
  return (
    <section className="papers-page">
      <PaperHeader title="论文" lead="" />
      <QueryState loading={catalog.isPending} error={catalog.error} retry={catalog.refetch} />
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
      {query.data && catalog.data && (
        <Universe3D
          data={studyGraph(query.data, readable)}
          catalog={{ ...catalog.data, papers: studies }}
          taxonomy={taxonomy}
          privateLibrary
        />
      )}
    </section>
  );
}
