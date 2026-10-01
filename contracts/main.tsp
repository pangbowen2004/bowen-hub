// bowen-hub 契约入口（docs/08）：服务元信息、版本、导入其余文件。目录分工与写法约定见 contracts/README.md。
// 三种安全方案（公开无鉴权 / 私有会话 Cookie / 内部 Bearer 服务令牌）定义在 http.tsp，
// 按接口类别挂在 routes/public.tsp、routes/private.tsp、routes/internal.tsp。
import "@typespec/http";
import "@typespec/openapi";
import "@typespec/json-schema";
import "./lib/decorators.js";
import "./http.tsp";
import "./common.tsp";
import "./platform.tsp";
import "./watchlist.tsp";
import "./news.tsp";
import "./markets.tsp";
import "./papers.tsp";
import "./capabilities.tsp";
import "./routes/health.tsp";
import "./routes/public.tsp";
import "./routes/private.tsp";
import "./routes/internal.tsp";

using Http;
using OpenAPI;
using TypeSpec.JsonSchema;

/**
 * Kevin 全部个人产品的唯一 API（docs/08、docs/09）。路径前缀 /v1，只做增量兼容的改动。
 * 公开 /v1/public/*：无鉴权，只读；私有 /v1/*：会话 Cookie（服务令牌可读全部 GET）；
 * 内部 /v1/internal/*：服务令牌；另有 /v1/health。错误一律 application/problem+json（RFC 9457）。
 */
@service(#{ title: "bowen-hub API" })
@info(#{ version: "1.0.0" })
@jsonSchema
namespace BowenHub;
