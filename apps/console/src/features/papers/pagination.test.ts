import { configureClient } from "@bowen-hub/contracts/client";
import { afterEach, expect, it, vi } from "vitest";
import rows from "../../../../../fixtures/samples/papers/PaperSummary.all.json";
import { allPapers } from "./shared";

afterEach(() => {
  vi.unstubAllGlobals();
  configureClient({ baseUrl: "" });
});
it("跨游标取全档案再筛选，不能把第一页当全部论文", async () => {
  configureClient({ baseUrl: "https://api.fixture" });
  const requests: string[] = [];
  vi.stubGlobal("fetch", async (input: string) => {
    requests.push(input);
    const cursor = new URL(input).searchParams.get("cursor");
    return Response.json(
      cursor
        ? { items: [rows[1]], nextCursor: null }
        : { items: [rows[0]], nextCursor: "next-paper" },
    );
  });
  expect((await allPapers()).map((paper) => paper.id)).toEqual(rows.map((paper) => paper.id));
  expect(requests).toHaveLength(2);
  expect(requests[1]).toContain("cursor=next-paper");
});
it("重复游标明确失败，不在后台无限读取", async () => {
  configureClient({ baseUrl: "https://api.fixture" });
  const fetcher = vi.fn(async () => Response.json({ items: [], nextCursor: "stuck" }));
  vi.stubGlobal("fetch", fetcher);
  await expect(allPapers()).rejects.toThrow("分页未前进");
  expect(fetcher).toHaveBeenCalledTimes(2);
});
