// HTTP 的“管道”：安全方案、错误响应、分页参数。
// 故意放在服务命名空间 BowenHub 之外：这里的模型带 @header / @query 等 HTTP 元数据，
// 不是数据模型，不进 components.schemas，也不生成 JSON Schema。用法：HubHttp.ErrorResponse 等。
import "@typespec/http";

using Http;

namespace HubHttp;

/** 会话 Cookie：Kevin 在控制台用通行密钥登录后由 Better Auth 签发（docs/09 第 2 节） */
model SessionCookie is ApiKeyAuth<ApiKeyLocation.cookie, "better-auth.session_token">;

/** 服务令牌：计算任务用 HUB_SERVICE_TOKEN，请求头 Authorization: Bearer <令牌>（docs/09 第 2 节） */
model ServiceToken is BearerAuth;

// 所有接口的错误响应，在 OpenAPI 里是每个操作的 default 响应；具体状态码看 body.status。
/** 错误（application/problem+json，RFC 9457） */
@error
model ErrorResponse {
  @header("content-type") contentType: "application/problem+json";
  @body body: BowenHub.Problem;
}

/** 游标分页的查询参数 ?cursor=&limit=（docs/08 第 4 节）；返回用 BowenHub.CursorPage */
model CursorParams {
  /** 上一页返回的 nextCursor；取第一页时不传 */
  @query cursor?: string;

  /** 每页条数，1–100（docs/09 第 1 节：单页不超过 100 条）；不传时由服务端决定 */
  @query
  @minValue(1)
  @maxValue(100)
  limit?: int32;
}
