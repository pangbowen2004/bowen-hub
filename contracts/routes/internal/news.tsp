import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Internal.InternalNews;
@task("T14") @put @route("/news/editions/{id}")
op putEdition(@path id: string, @body body: Edition): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @put @route("/news/editions/{id}/html")
op putEditionHtml(@path id: string, @header contentType: "text/html", @body body: string): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/articles/batch")
op putArticles(@body body: Article[]): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/filings/batch")
op putFilings(@body body: Filing[]): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/insider-trades/batch")
op putInsiderTrades(@body body: InsiderTrade[]): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/calendar/batch")
op putCalendar(@body body: CalendarEvent[]): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/earnings-cards/batch")
op putEarningsCards(@body body: EarningsCard[]): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @put @route("/news/sources/{id}/health")
op putSourceHealth(@path id: string, @body body: NewsSourceHealth): NoContentResponse | HubHttp.ErrorResponse;
@task("T14") @post @route("/news/articles/prune")
op pruneArticles(@query before: Date): NoContentResponse | HubHttp.ErrorResponse;
