// 市场接口：docs/08 第 5.1 节。
import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Internal.InternalMarkets;

/** putDay：市场数据接口。 */
@task("T23")
@put
@route("/markets/days/{date}")
op putDay(@path date: Date, @body body: MarketDayWrite): NoContentResponse | HubHttp.ErrorResponse;

/** putHypotheses：市场数据接口。 */
@task("T23")
@post
@route("/markets/hypotheses/batch")
op putHypotheses(@body body: Hypothesis[]): NoContentResponse | HubHttp.ErrorResponse;

/** putWeekly：市场数据接口。 */
@task("T23")
@put
@route("/markets/weeklies/{date}")
op putWeekly(@path date: Date, @body body: WeeklyReport): NoContentResponse | HubHttp.ErrorResponse;

/** putEvents：市场数据接口。 */
@task("T23")
@post
@route("/markets/events/batch")
op putEvents(@body body: MarketEvent[]): NoContentResponse | HubHttp.ErrorResponse;

/** putIndexBars：市场数据接口。 */
@task("T23")
@put
@route("/markets/indices/{code}/bars")
op putIndexBars(@path code: string, @body body: IndexBar[]): NoContentResponse | HubHttp.ErrorResponse;
