import { describe, expect, it } from "vitest";
import { componentSchemaNames, findSchemaMismatch } from "../src/typespec.ts";

describe("JSON Schema 与 components.schemas 一一对应", () => {
  it("取出 components.schemas 的名字", () => {
    const text = "openapi: 3.1.0\ncomponents:\n  schemas:\n    Run: {}\n    WatchItem: {}\n";
    expect(componentSchemaNames(text)).toEqual(["Run", "WatchItem"]);
    expect(componentSchemaNames("openapi: 3.1.0\n")).toEqual([]);
  });

  it("两边一致时没有差异", () => {
    expect(findSchemaMismatch(["Run", "Health"], ["Health", "Run"])).toEqual({
      onlyInOpenapi: [],
      onlyInSchemas: [],
    });
  });

  it("routes 里的具名模型（OpenAPI 名字带命名空间）和 HTTP 参数模型会被找出来", () => {
    expect(
      findSchemaMismatch(["Run", "Routes.PrivateNews.Filter"], ["Run", "Filter", "ListParams"]),
    ).toEqual({
      onlyInOpenapi: ["Routes.PrivateNews.Filter"],
      onlyInSchemas: ["Filter", "ListParams"],
    });
  });
});
