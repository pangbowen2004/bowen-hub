// 健康检查 /v1/health（docs/08 第 5 节“另有”；T02 的验收用它）。无鉴权，不属于三类接口。
import "@typespec/http";
import "../http.tsp";
import "../platform.tsp";

using Http;

namespace BowenHub.Routes;

@route("/v1/health")
@useAuth(NoAuth)
namespace HealthCheck {
  /** API 在线就返回 200 */
  @task("T02")
  @get
  op get(): Health | HubHttp.ErrorResponse;
}
