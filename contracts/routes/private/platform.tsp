// 私有接口 /v1 下的平台接口：运维页的数据（页面由 T41 做）与能力清单（docs/08 第 5.1 节）。
import "@typespec/http";
import "../../http.tsp";
import "../../platform.tsp";

using Http;

namespace BowenHub.Routes.Private.PrivatePlatform;

/** 运行记录（runs 表），最新的在前 */
@task("T02")
@get
@route("/runs")
op listRuns(
  /** 只看某个任务，如 news-morning */
  @query job?: string,

  ...HubHttp.CursorParams,
): RunPage | HubHttp.ErrorResponse;

/** AI 用量汇总（ai_calls 表的聚合） */
@task("T02")
@get
@route("/ai/usage")
op getAiUsage(
  /** 统计最近多少天（含今天） */
  @query @minValue(1) days?: int32,
): AiUsageSummary | HubHttp.ErrorResponse;

/** 评测结果（eval_results 表），最新的在前 */
@task("T02")
@get
@route("/evals")
op listEvals(
  /** 只看某个能力，如 news.ticker_digest */
  @query capability?: string,
): EvalResult[] | HubHttp.ErrorResponse;

/** 能力清单（读 packages/ai 构建时生成的注册表）+ 各能力最近一次评测结果 */
@task("T41")
@get
@route("/capabilities")
op listCapabilities(): CapabilityInfo[] | HubHttp.ErrorResponse;
