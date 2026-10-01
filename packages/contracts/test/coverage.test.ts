// 契约验收：docs/08 的完整接口清单必须落入生成物，每个 JSON GET 都有默认样例。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { sampleHandlers } from "../src/mocks";
import { OPENAPI, ROOT, readYaml } from "./support/repo";

type Operation = {
  "x-task": string;
  responses: Record<string, { content?: Record<string, unknown> }>;
};
const document = readYaml(OPENAPI) as {
  paths: Record<string, Record<string, Operation>>;
};
const specification = readFileSync(join(ROOT, "docs/08-契约与代码生成.md"), "utf8");
const methods = new Set(["get", "put", "post", "patch", "delete", "head", "options"]);
const expected = new Map<string, string>([["GET /v1/health", "T02"]]);
let prefix = "";
for (const line of specification.split("\n")) {
  if (line.startsWith("**公开 `/v1/public`")) prefix = "/v1/public";
  if (line.startsWith("**私有 `/v1`")) prefix = "/v1";
  if (line.startsWith("**内部 `/v1/internal`")) prefix = "/v1/internal";
  const task = /\| (T\d+) \|$/.exec(line)?.[1];
  if (task === undefined || prefix === "") continue;
  for (const match of line.matchAll(/`(GET|PUT|POST|PATCH|DELETE) (\/[^`?]+)(?:\?[^`]*)?`/g)) {
    expected.set(`${match[1]} ${prefix}${match[2]}`, task);
  }
}
const operations = Object.entries(document.paths).flatMap(([path, item]) =>
  Object.entries(item)
    .filter(([method]) => methods.has(method))
    .map(([method, operation]) => ({
      key: `${method.toUpperCase()} ${path}`,
      path,
      method,
      operation,
    })),
);

describe("完整契约的交付覆盖", () => {
  it("docs/08 清单中的接口全部存在、没有额外接口、任务归属正确", () => {
    expect(expected.size).toBeGreaterThan(60);
    expect(operations.map(({ key }) => key).sort()).toEqual([...expected.keys()].sort());
    for (const { key, operation } of operations) {
      expect(operation["x-task"], key).toBe(expected.get(key));
    }
  });

  it("每个返回 JSON 的 GET 接口均登记样例处理器", () => {
    const registered = new Set(
      sampleHandlers().map(({ info }) =>
        String(info.path)
          .replace(/^\*/, "")
          .replace(/:(\w+)/g, "{$1}"),
      ),
    );
    const missing = operations
      .filter(
        ({ method, path, operation }) =>
          method === "get" &&
          operation.responses["200"]?.content?.["application/json"] !== undefined &&
          !registered.has(path),
      )
      .map(({ key }) => key);
    expect(missing).toEqual([]);
  });
});
