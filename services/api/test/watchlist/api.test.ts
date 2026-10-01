import { env } from "cloudflare:workers";
import * as schemas from "@bowen-hub/contracts/zod";
import { beforeEach, expect, it } from "vitest";
import { app } from "../../src/app";
import { tools } from "../../src/modules/watchlist/mcp";

beforeEach(async () => {
  await env.DB.prepare("DELETE FROM watch_items").run();
});
const item = {
  symbol: "NVDA",
  name: "英伟达",
  kind: "stock",
  group: "半导体",
  underlying: null,
  sectorEtf: "SMH",
  aliases: ["Nvidia"],
  active: true,
};
const request = (path: string, method = "GET", data?: unknown, token = "") =>
  app.request(
    `http://localhost${path}`,
    {
      method,
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      ...(data === undefined ? {} : { body: JSON.stringify(data) }),
    },
    env,
  );
async function list() {
  return schemas.PrivateWatchlistListResponse.parse(await (await request("/v1/watchlist")).json());
}

it("自选股增改删及停用项保留，响应满足生成契约", async () => {
  expect(await list()).toEqual([]);
  const added = await request("/v1/watchlist/NVDA", "PUT", item);
  expect(added.status).toBe(200);
  expect(schemas.PrivateWatchlistPutResponse.parse(await added.json())).toEqual(item);
  const changed = { ...item, active: false, aliases: ["英伟达", "Nvidia"], group: "观察" };
  expect((await request("/v1/watchlist/NVDA", "PUT", changed)).status).toBe(200);
  expect(await list()).toEqual([changed]);
  expect((await request("/v1/watchlist/NVDA", "DELETE")).status).toBe(204);
  expect(await list()).toEqual([]);
  expect((await request("/v1/watchlist/NVDA", "DELETE")).status).toBe(204);
});
it("服务令牌批量导入幂等覆盖，单条绑定不会超出D1限制", async () => {
  const items = Array.from({ length: 30 }, (_, i) => ({ ...item, symbol: `S${i}` }));
  expect(
    (await request("/v1/internal/watchlist/batch", "POST", items, "test-service-token")).status,
  ).toBe(204);
  expect((await list()).length).toBe(30);
  expect(
    (
      await request(
        "/v1/internal/watchlist/batch",
        "POST",
        [{ ...items[0], name: "修改" }],
        "test-service-token",
      )
    ).status,
  ).toBe(204);
  expect((await list()).find((x) => x.symbol === "S0")?.name).toBe("修改");
  expect(
    (await request("/v1/internal/watchlist/batch", "POST", [], "test-service-token")).status,
  ).toBe(204);
});
it("ID不符和无效类型拒绝且不写入；服务令牌不能执行私有写操作", async () => {
  for (const payload of [item, { ...item, symbol: "AAPL", kind: "unknown" }]) {
    const response = await request("/v1/watchlist/AAPL", "PUT", payload);
    expect(response.status).toBe(400);
    expect(schemas.Problem.parse(await response.json()).status).toBe(400);
  }
  expect((await request("/v1/watchlist/NVDA", "PUT", item, "test-service-token")).status).toBe(403);
  expect((await request("/v1/internal/watchlist/batch", "POST", [item])).status).toBe(401);
  expect(await list()).toEqual([]);
});
it("MCP先要求完整资料，薄封装与HTTP共用数据", async () => {
  const add = tools.find((tool) => tool.name === "watchlist_add");
  expect(add?.inputSchema.safeParse({ symbol: "NVDA" }).success).toBe(false);
  expect(await list()).toEqual([]);
  expect(await add?.handler(item, env)).toEqual(item);
  expect(await tools.find((tool) => tool.name === "watchlist_list")?.handler({}, env)).toEqual([
    item,
  ]);
  await tools.find((tool) => tool.name === "watchlist_remove")?.handler({ symbol: "NVDA" }, env);
  expect(await list()).toEqual([]);
});
