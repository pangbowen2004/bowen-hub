// MSW 模拟（docs/08 第 7 节）：GET 接口默认返回 fixtures/samples/ 里的样例，没有样例的回落到 Orval 生成的处理器。
//   import { createHandlers } from "@bowen-hub/contracts/mocks";
//   setupWorker(...createHandlers())          // 浏览器（控制台开发与 MSW 预览版）
//   setupServer(...createHandlers())          // Node 测试（先 configureClient({ baseUrl: "http://localhost" })）
// 只想改某个接口的返回：把自己的处理器放在前面，或直接用 Orval 的处理器工厂，如 getPrivateWatchlistListMockHandler([...])。
import type { HttpHandler } from "msw";
import { getBowenHubAPIMock } from "../generated/msw";
import type { SampleRoute } from "./registry";
import { marketsSamples } from "./samples/markets";
import { newsSamples } from "./samples/news";
import { papersSamples } from "./samples/papers";
import { platformSamples } from "./samples/platform";
import { watchlistSamples } from "./samples/watchlist";

/** 各领域登记的“接口 ↔ 样例” */
export const sampleRoutes: SampleRoute[] = [
  ...platformSamples,
  ...watchlistSamples,
  ...newsSamples,
  ...marketsSamples,
  ...papersSamples,
];

/** 只含样例处理器 */
export function sampleHandlers(): HttpHandler[] {
  return sampleRoutes.map((route) => route.build());
}

/** 全部处理器：样例处理器在前（先匹配），Orval 生成的处理器兜底（返回 faker 随机数据） */
export function createHandlers(): HttpHandler[] {
  return [...sampleHandlers(), ...getBowenHubAPIMock()];
}

export * from "../generated/msw";
export {
  flattenSamples,
  resolveSample,
  type SampleOptions,
  type SampleRoute,
  type SampleShape,
  sampleRoute,
} from "./registry";
