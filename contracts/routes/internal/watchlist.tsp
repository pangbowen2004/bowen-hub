// 内部接口 /v1/internal 下的自选股接口（docs/08 第 5.1 节，x-task T14）。
import "@typespec/http";
import "../../http.tsp";
import "../../watchlist.tsp";

using Http;

namespace BowenHub.Routes.Internal.InternalWatchlist;

/** 自选股初始导入（hub migrate watchlist）：按代码覆盖写入 */
@task("T14")
@post
@route("/watchlist/batch")
op batch(@body body: WatchItem[]): NoContentResponse | HubHttp.ErrorResponse;
