// 公开接口 /v1/public/*：无鉴权、只读、只含公开数据（公开站构建时读取；docs/08 第 5 节）。
// 这个文件只定前缀与鉴权并导入各领域的子文件；接口写在 routes/public/<领域>.tsp。
import "@typespec/http";
import "../http.tsp";
import "./public/markets.tsp";
import "./public/papers.tsp";

using Http;

namespace BowenHub.Routes;

@route("/v1/public")
@useAuth(NoAuth)
namespace Public {

}
