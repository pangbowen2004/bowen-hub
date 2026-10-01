import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Private.PrivateNews;
@task("T14") @get @route("/news/editions")
op listEditions(@query kind?: EditionKind, ...HubHttp.CursorParams): EditionPage | HubHttp.ErrorResponse;
@task("T14") @get @route("/news/editions/{id}")
op getEdition(@path id: string): Edition | HubHttp.ErrorResponse;
@task("T14") @get @route("/news/editions/{id}/html")
op getEditionHtml(@path id: string): { @header contentType: "text/html"; @body body: string; } | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/editions/{id}/feedback") @useAuth(HubHttp.SessionCookie)
op rateEdition(@path id: string, @body body: EditionFeedbackRequest): EditionFeedback | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/feedback/items") @useAuth(HubHttp.SessionCookie)
op flagItem(@body body: ItemFeedbackRequest): ItemFeedback | HubHttp.ErrorResponse;
@task("T14") @get @route("/news/feedback")
op listFeedback(@query since?: DateTime): Feedback[] | HubHttp.ErrorResponse;
@task("T14") @get @route("/news/articles/search")
op searchArticles(@query q: string, @query ticker?: string, @query @minValue(1) days?: int32 = 30): Article[] | HubHttp.ErrorResponse;
@task("T14") @get @route("/news/tickers/{symbol}/timeline")
op getTimeline(@path symbol: string, @query @minValue(1) days?: int32 = 30): NewsTimelineItem[] | HubHttp.ErrorResponse;
/** 完整个股时间线：新闻、公告、内部人交易、财报卡片。旧timeline接口保留。 */
@task("T14") @get @route("/news/tickers/{symbol}/timeline/full")
op getFullTimeline(@path symbol: string, @query @minValue(1) days?: int32 = 30): NewsFullTimelineItem[] | HubHttp.ErrorResponse;
@task("T14") @get @route("/news/sources")
op listSources(): NewsSourceHealth[] | HubHttp.ErrorResponse;
