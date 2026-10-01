// 市场接口：docs/08 第 5.1 节。
import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Public.PublicMarkets;

/** listDays：市场数据接口。 */
@task("T23")
@get
@route("/markets/days")
op listDays(@query before?: Date, ...HubHttp.CursorParams): MarketDaySummaryPage | HubHttp.ErrorResponse;

/** getLatestDay：市场数据接口。 */
@task("T23")
@get
@route("/markets/days/latest")
op getLatestDay(): MarketDay | HubHttp.ErrorResponse;

/** getDay：市场数据接口。 */
@task("T23")
@get
@route("/markets/days/{date}")
op getDay(@path date: Date): MarketDay | HubHttp.ErrorResponse;

/** listIndexBars：市场数据接口。 */
@task("T23")
@get
@route("/markets/indices/{code}/bars")
op listIndexBars(@path code: string, @query @minValue(1) @maxValue(250) limit?: int32 = 250): IndexBar[] | HubHttp.ErrorResponse;

/** listHypotheses：市场数据接口。 */
@task("T23")
@get
@route("/markets/hypotheses")
op listHypotheses(@query result?: HypothesisResult, @query("from") fromDate?: Date, @query("to") toDate?: Date, @query dateField?: "created" | "due" | "settled" = "created", ...HubHttp.CursorParams): HypothesisPage | HubHttp.ErrorResponse;

/** listWeeklies：市场数据接口。 */
@task("T23")
@get
@route("/markets/weeklies")
op listWeeklies(): WeeklySummary[] | HubHttp.ErrorResponse;

/** getWeekly：市场数据接口。 */
@task("T23")
@get
@route("/markets/weeklies/{date}")
op getWeekly(@path date: Date): WeeklyReport | HubHttp.ErrorResponse;

/** listEvents：市场数据接口。 */
@task("T23")
@get
@route("/markets/events")
op listEvents(@query("from") fromDate?: Date, @query("to") toDate?: Date): MarketEvent[] | HubHttp.ErrorResponse;

/** getReference：市场数据接口。 */
@task("T23")
@get
@route("/markets/reference")
op getReference(): MarketReference | HubHttp.ErrorResponse;
