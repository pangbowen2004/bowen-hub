// 自选股接口 ↔ 样例（T01 甲段）。样例在 fixtures/samples/watchlist/（由 config/us_watchlist.yaml 转换）。
import watchItems from "../../../../../fixtures/samples/watchlist/WatchItem.initial.json" with {
  type: "json",
};
import { getPrivateWatchlistListMockHandler } from "../../generated/msw";
import { type SampleRoute, sampleRoute } from "../registry";

export const watchlistSamples: SampleRoute[] = [
  sampleRoute(getPrivateWatchlistListMockHandler, [watchItems], { shape: "list" }),
];
