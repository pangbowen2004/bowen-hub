import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Private.PrivatePapers;
@task("T32") @get @route("/papers")
op listPapers(@query visibility?: PaperVisibility, @query review?: PaperReviewStatus, @query space?: string, @query q?: string, ...HubHttp.CursorParams): PaperPage | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/{id}")
op getPaper(@path id: string): Paper | HubHttp.ErrorResponse;
@task("T32") @patch @route("/papers/{id}") @useAuth(HubHttp.SessionCookie)
op patchPaper(@path id: string, @body body: PaperPatch): Paper | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/{id}/private")
op getPrivate(@path id: string): PaperPrivate | HubHttp.ErrorResponse;
@task("T32") @put @route("/papers/{id}/private") @useAuth(HubHttp.SessionCookie)
op putPrivate(@path id: string, @body body: PaperPrivateWrite): PaperPrivate | HubHttp.ErrorResponse;
@task("T32") @post @route("/papers/{id}/ask") @useAuth(HubHttp.SessionCookie)
op ask(@path id: string, @body body: PaperAskRequest): { @header contentType: "text/event-stream"; @body body: string; } | HubHttp.ErrorResponse;
@task("T32") @post @route("/papers/{id}/explanations") @useAuth(HubHttp.SessionCookie)
op createExplanation(@path id: string, @body body: PaperExplanationCreate): PaperExplanation | HubHttp.ErrorResponse;
@task("T32") @patch @route("/papers/{id}/explanations/{eid}") @useAuth(HubHttp.SessionCookie)
op patchExplanation(@path id: string, @path eid: string, @body body: PaperExplanationPatch): PaperExplanation | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/{id}/pages/{n}")
op getPage(@path id: string, @path @minValue(1) n: int32): { @header contentType: "image/png"; @body body: bytes; } | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/{id}/source.pdf")
op getPdf(@path id: string): { @header contentType: "application/pdf"; @body body: bytes; } | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/{id}/reviews")
op listReviews(@path id: string): Review[] | HubHttp.ErrorResponse;
@task("T32") @post @route("/papers/{id}/revise") @useAuth(HubHttp.SessionCookie)
op revise(@path id: string, @body body: PaperReviseRequest): NoContentResponse | HubHttp.ErrorResponse;
@task("T32") @put @route("/papers/uploads/{filename}") @useAuth(HubHttp.SessionCookie)
op uploadPdf(@path filename: string, @header contentType: "application/pdf", @body body: bytes): Upload | HubHttp.ErrorResponse;
@task("T32") @post @route("/papers/uploads/arxiv") @useAuth(HubHttp.SessionCookie)
op uploadArxiv(@body body: PaperArxivUploadRequest): Upload | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/uploads")
op listUploads(@query status?: PaperUploadStatus): Upload[] | HubHttp.ErrorResponse;
@task("T32") @post @route("/papers/uploads/{uploadId}/retry") @useAuth(HubHttp.SessionCookie)
op retryUpload(@path uploadId: string): Upload | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/graph")
op getGraph(): GraphData | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/catalog")
op getCatalog(): PapersCatalog | HubHttp.ErrorResponse;
