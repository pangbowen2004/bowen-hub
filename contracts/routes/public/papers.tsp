import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Public.PublicPapers;
@task("T32") @get @route("/papers/catalog")
op getCatalog(): PapersCatalog | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/{id}")
op getPaper(@path id: string): Paper | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/graph")
op getGraph(): GraphData | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/search-index")
op getSearchIndex(): SearchIndex | HubHttp.ErrorResponse;
