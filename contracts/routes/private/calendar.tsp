import "@typespec/http";
import "../../http.tsp";
using Http;
namespace BowenHub.Routes.Private.PrivateCalendar;
/** 登录后读取日期范围内的美股财报与美国宏观日程。 */
@task("T14") @get @route("/calendar/events")
op listEvents(@query from: Date, @query to: Date): CalendarEvent[] | HubHttp.ErrorResponse;
