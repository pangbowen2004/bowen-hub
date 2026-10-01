import type { MarketEvent } from "@bowen-hub/contracts";
import { MarketEvent as EventSchema } from "@bowen-hub/contracts/zod";
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
let rows = [initial];
export const marketHandlers = [
  http.get("/v1/public/markets/events", () => HttpResponse.json(rows)),
  http.post("/v1/markets/events", async ({ request }) => {
    const parsed = EventSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ detail: "事件资料无效" }, { status: 400 });
    rows = [...rows, parsed.data];
    return HttpResponse.json(parsed.data, { status: 201 });
  }),
  http.put("/v1/markets/events/:id", async ({ request, params }) => {
    const parsed = EventSchema.safeParse(await request.json());
    if (!parsed.success) return HttpResponse.json({ detail: "事件资料无效" }, { status: 400 });
    rows = rows.map((row) => (row.id === params.id ? parsed.data : row));
    return HttpResponse.json(parsed.data);
  }),
  http.delete("/v1/markets/events/:id", ({ params }) => {
    rows = rows.filter((row) => row.id !== params.id);
    return new HttpResponse(null, { status: 204 });
  }),
];
