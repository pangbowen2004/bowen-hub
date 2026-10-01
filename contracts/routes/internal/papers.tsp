import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Internal.InternalPapers;
@task("T32") @put @route("/papers/{id}")
op putPaper(@path id: string, @body body: PaperWrite): NoContentResponse | HubHttp.ErrorResponse;
@task("T32") @put @route("/papers/{id}/private")
op putPrivate(@path id: string, @body body: PaperPrivate): NoContentResponse | HubHttp.ErrorResponse;
@task("T32") @post @route("/papers/{id}/reviews")
op createReview(@path id: string, @body body: Review): NoContentResponse | HubHttp.ErrorResponse;
@task("T32") @put @route("/papers/{id}/files/{name}")
op putFile(@path id: string, @path name: "source.pdf" | "pages.jsonl" | "pages.txt", @header contentType: "application/pdf" | "application/x-ndjson" | "text/plain", @body body: bytes): NoContentResponse | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/{id}/files/{name}")
op getFile(@path id: string, @path name: "source.pdf" | "pages.jsonl" | "pages.txt"): { @header contentType: "application/pdf" | "application/x-ndjson" | "text/plain"; @body body: bytes; } | HubHttp.ErrorResponse;
@task("T32") @put @route("/papers/{id}/pages/{n}")
op putPage(@path id: string, @path @minValue(1) n: int32, @header contentType: "image/png", @body body: bytes): NoContentResponse | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/uploads/{uploadId}")
op getUpload(@path uploadId: string): Upload | HubHttp.ErrorResponse;
@task("T32") @get @route("/papers/uploads/{uploadId}/file")
op getUploadFile(@path uploadId: string): { @header contentType: "application/pdf"; @body body: bytes; } | HubHttp.ErrorResponse;
@task("T32") @patch @route("/papers/uploads/{uploadId}")
op patchUpload(@path uploadId: string, @body body: PaperUploadPatch): NoContentResponse | HubHttp.ErrorResponse;
