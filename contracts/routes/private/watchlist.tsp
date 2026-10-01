// 私有接口 /v1 下的自选股接口（docs/08 第 5.1 节，x-task T14）。
import "@typespec/http";
import "../../http.tsp";
import "../../watchlist.tsp";

using Http;

namespace BowenHub.Routes.Private.PrivateWatchlist;

/** 全部自选股（含停用的） */
@task("T14")
@get
@route("/watchlist")
op list(): WatchItem[] | HubHttp.ErrorResponse;

/** 新增或修改一只自选股（按代码覆盖）；body.symbol 必须等于路径里的 symbol */
@task("T14")
@useAuth(HubHttp.SessionCookie)
@put
@route("/watchlist/{symbol}")
op put(@path symbol: string, @body body: WatchItem): WatchItem | HubHttp.ErrorResponse;

/** 删除一只自选股 */
@task("T14")
@useAuth(HubHttp.SessionCookie)
@delete
@route("/watchlist/{symbol}")
op remove(@path symbol: string): NoContentResponse | HubHttp.ErrorResponse;
