// 私有接口 /v1/*：控制台用会话 Cookie；服务令牌可以读私有前缀下的全部 GET（docs/08 第 5 节）。
// 所以这里默认“会话或服务令牌”；私有的写接口（PUT / POST / PATCH / DELETE）必须在操作上
// 另标 @useAuth(HubHttp.SessionCookie)（服务令牌不能调用私有写接口）。测试会检查这一点。
// 这个文件只定前缀与鉴权并导入各领域的子文件；接口写在 routes/private/<领域>.tsp。
import "@typespec/http";
import "../http.tsp";
import "./private/news.tsp";
import "./private/watchlist.tsp";
import "./private/markets.tsp";
import "./private/papers.tsp";
import "./private/platform.tsp";

using Http;

namespace BowenHub.Routes;

@route("/v1")
@useAuth(HubHttp.SessionCookie | HubHttp.ServiceToken)
namespace Private {

}
