import { privatePapersGetCatalog, privatePapersGetGraph } from "@bowen-hub/contracts/client";
import { Universe3D } from "@bowen-hub/ui/react/Universe3D";
import { useQuery } from "@tanstack/react-query";
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
  return (
    <section className="papers-page">
      <PaperHeader title="知识宇宙" lead="" />
      <QueryState loading={catalog.isPending} error={catalog.error} retry={catalog.refetch} />
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
      {query.data && catalog.data && (
        <Universe3D data={query.data} catalog={catalog.data} privateLibrary />
      )}
    </section>
  );
}
