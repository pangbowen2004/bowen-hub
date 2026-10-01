// 市场接口：docs/08 第 5.1 节。
import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Private.PrivateMarkets;

/** createEvent：市场数据接口。 */
@task("T23")
@post
@route("/markets/events")
@useAuth(HubHttp.SessionCookie)
op createEvent(@body body: MarketEvent): MarketEvent | HubHttp.ErrorResponse;

/** putEvent：市场数据接口。 */
@task("T23")
@put
@route("/markets/events/{id}")
@useAuth(HubHttp.SessionCookie)
op putEvent(@path id: string, @body body: MarketEvent): MarketEvent | HubHttp.ErrorResponse;

/** deleteEvent：市场数据接口。 */
@task("T23")
@delete
@route("/markets/events/{id}")
@useAuth(HubHttp.SessionCookie)
op deleteEvent(@path id: string): NoContentResponse | HubHttp.ErrorResponse;
