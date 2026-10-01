// MSW“默认返回样例”（docs/08 第 7 节）：
// - 每个登记了样例的 GET 接口，返回的数据符合该接口在 OpenAPI 里的响应 schema（形状 one / list / page 没登记错）；
// - 分页接口包成分页结构；带路径参数的按参数挑样例，挑不中返回第一份；没有样例的接口回落到 Orval 生成的处理器。
import { setupServer } from "msw/node";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import {
  configureClient,
  healthCheckGet,
  internalPlatformExportTable,
  privatePlatformListRuns,
  privateWatchlistList,
  privateWatchlistPut,
} from "../src/client";
import type { WatchItem } from "../src/generated/types";
import { createHandlers, flattenSamples, resolveSample, sampleHandlers } from "../src/mocks";
import { createAjv, OPENAPI, readYaml } from "./support/repo";

const BASE = "http://hub.test";
const server = setupServer(...createHandlers());

beforeAll(() => {
  configureClient({ baseUrl: BASE });
  server.listen({ onUnhandledRequest: "error" });
});

afterAll(() => {
  server.close();
});

type Responses = Record<string, { content?: Record<string, { schema?: unknown }> }>;
const doc = readYaml(OPENAPI) as {
  paths: Record<string, Record<string, { responses: Responses }>>;
};
const ajv = createAjv();

/** OpenAPI 里的 $ref（#/components/schemas/X）换成 JSON Schema 文件（X.json），交给同一个 Ajv 校验 */
function toJsonSchema(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(toJsonSchema);
  if (typeof value !== "object" || value === null) return value;
  return Object.fromEntries(
    Object.entries(value).map(([key, item]) =>
      key === "$ref" && typeof item === "string"
        ? [key, `${item.replace("#/components/schemas/", "")}.json`]
        : [key, toJsonSchema(item)],
    ),
  );
}

describe("样例处理器", () => {
  const routes = sampleHandlers().map((handler) => {
    const { method, path } = handler.info;
    if (typeof path !== "string") throw new Error("样例处理器的路径应当是字符串");
    return { method: String(method).toLowerCase(), path };
  });

  it("都是 GET 接口", () => {
    expect(routes.length).toBeGreaterThan(0);
    expect(routes.filter((route) => route.method !== "get")).toEqual([]);
  });

  it.each(routes)("$path 返回的数据符合接口的响应 schema", async ({ method, path }) => {
    const openapiPath = path.replace(/^\*/, "").replace(/:(\w+)/g, "{$1}");
    const operation = doc.paths[openapiPath]?.[method];
    if (operation === undefined)
      throw new Error(`OpenAPI 里没有 ${method.toUpperCase()} ${openapiPath}`);
    const schema = operation.responses["200"]?.content?.["application/json"]?.schema;
    if (schema === undefined) throw new Error(`${openapiPath} 没有 200 的 JSON 响应`);
    const response = await fetch(`${BASE}${path.replace(/^\*/, "").replace(/:(\w+)/g, "x")}`);
    expect(response.status).toBe(200);
    const validate = ajv.compile(toJsonSchema(schema) as object);
    const body: unknown = await response.json();
    expect(validate(body), ajv.errorsText(validate.errors)).toBe(true);
  });
});

describe("用生成的客户端读样例", () => {
  it("自选股列表就是 fixtures/samples/watchlist/WatchItem.initial.json 的 30 只", async () => {
    const list = await privateWatchlistList();
    expect(list).toHaveLength(30);
    expect(list[0]).toMatchObject({ symbol: "TSM", kind: "stock", sectorEtf: "SMH", active: true });
  });

  it("分页接口包成 { items, nextCursor: null }", async () => {
    const page = await privatePlatformListRuns({ limit: 20 });
    expect(page.nextCursor).toBeNull();
    expect(page.items.map((run) => run.status)).toEqual(["running", "succeeded", "failed"]);
  });

  it("带路径参数时按参数挑样例，挑不中返回第一份", async () => {
    expect((await internalPlatformExportTable("watch_items")).table).toBe("watch_items");
    expect((await internalPlatformExportTable("runs")).table).toBe("runs");
    expect((await internalPlatformExportTable("articles")).table).toBe("runs");
  });

  it("单个对象的接口", async () => {
    expect(await healthCheckGet()).toEqual({ status: "ok" });
  });

  it("没有样例的接口回落到 Orval 生成的处理器（随机数据）", async () => {
    const item: WatchItem = {
      symbol: "NVDA",
      name: "英伟达",
      kind: "stock",
      group: "半导体",
      underlying: null,
      sectorEtf: "SMH",
      aliases: ["Nvidia"],
      active: true,
    };
    const saved = await privateWatchlistPut("NVDA", item);
    expect(typeof saved.symbol).toBe("string");
  });
});

describe("样例的摊平与挑选", () => {
  const samples = flattenSamples([[{ id: "a" }, { id: "b" }], { id: "c" }]);

  it("文件内容是对象或对象数组都行", () => {
    expect(samples.map((sample) => sample.id)).toEqual(["a", "b", "c"]);
  });

  it("三种形状", () => {
    expect(resolveSample(samples, { shape: "list" }, {})).toHaveLength(3);
    expect(resolveSample(samples, { shape: "page" }, {})).toEqual({
      items: samples,
      nextCursor: null,
    });
    const pick = (sample: Record<string, unknown>, params: Record<string, unknown>) =>
      sample.id === params.id;
    expect(resolveSample(samples, { shape: "one", pick }, { id: "b" })).toEqual({ id: "b" });
    expect(resolveSample(samples, { shape: "one", pick }, { id: "zzz" })).toEqual({ id: "a" });
  });
});
