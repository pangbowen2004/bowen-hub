// 私有接口 /v1 下的新闻接口（docs/08 第 5.1 节，x-task T14）。写接口另标 @useAuth(HubHttp.SessionCookie)。
// 由 T01 的对应分段填写（约定见 contracts/README.md）：只写操作，不声明具名模型；每个操作标 @task("T14")。
import "@typespec/http";
import "../../http.tsp";

using Http;

namespace BowenHub.Routes.Private.PrivateNews;
