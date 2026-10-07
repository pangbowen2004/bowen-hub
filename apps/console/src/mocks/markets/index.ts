import type { MarketEvent } from "@bowen-hub/contracts";
import { HttpResponse, http } from "msw";

const initial: MarketEvent = {
  id: "EVT-sample",
  title: "样例：产业应用验证窗口",
  sourceLabel: "合成测试来源",
  sourceUrl: "https://example.test/event",
  confirmation: "公开来源验证应用进展",
  invalidation: "来源撤回或观察期结束",
  startDate: "2026-09-01",
  endDate: "2026-10-31",
  status: "pending",
  watchItems: ["核对公开披露"],
  aShareMappings: ["应用观察"],
};
export const marketHandlers = [
  http.get("/v1/public/markets/events", () => HttpResponse.json([initial])),
];
