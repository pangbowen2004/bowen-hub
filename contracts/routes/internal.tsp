// 内部接口 /v1/internal/*：计算任务用服务令牌（Authorization: Bearer；docs/08 第 5 节）。
// 计算任务的写入用 PUT + 自然键，重复写入结果相同（docs/08 第 4 节）。
// 这个文件只定前缀与鉴权并导入各领域的子文件；接口写在 routes/internal/<领域>.tsp。
import "@typespec/http";
import "../http.tsp";
import "./internal/news.tsp";
import "./internal/watchlist.tsp";
import "./internal/markets.tsp";
import "./internal/papers.tsp";
import "./internal/platform.tsp";

using Http;

namespace BowenHub.Routes;

@route("/v1/internal")
@useAuth(HubHttp.ServiceToken)
namespace Internal {

}
