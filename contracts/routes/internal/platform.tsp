// 内部接口 /v1/internal 下的平台接口：通用文档、运行记录、AI 用量、评测结果、数据导出（docs/08 第 5.1 节）。
import "@typespec/http";
import "../../http.tsp";
import "../../platform.tsp";

using Http;

namespace BowenHub.Routes.Internal.InternalPlatform;

/**
 * 写一份派生数据或参考资料（documents 表，按 key 覆盖）。
 * 请求体就是文档本身，结构由 key 决定（见 Document.payload）；API 不解析重组，整块存入。
 */
@task("T02")
@put
@route("/documents/{key}")
op putDocument(@path key: DocumentKey, @body body: Record<unknown>): NoContentResponse | HubHttp.ErrorResponse;

/** 写一条运行记录（任务开始和结束各写一次，按 runId 覆盖）；body.id 必须等于路径里的 runId */
@task("T02")
@put
@route("/runs/{runId}")
op putRun(@path runId: string, @body body: Run): NoContentResponse | HubHttp.ErrorResponse;

/** 批量写入 AI 调用记录 */
@task("T02")
@post
@route("/ai-calls/batch")
op batchAiCalls(@body body: AiCall[]): NoContentResponse | HubHttp.ErrorResponse;

/** 批量写入评测结果（每周评测） */
@task("T02")
@post
@route("/evals/results/batch")
op batchEvalResults(@body body: EvalResult[]): NoContentResponse | HubHttp.ErrorResponse;

/** 数据导出：分页读出一张表（hub export 每晚调用，docs/09 第 5 节） */
@task("T42")
@get
@route("/export/{table}")
op exportTable(@path table: ExportTable, ...HubHttp.CursorParams): ExportPage | HubHttp.ErrorResponse;
