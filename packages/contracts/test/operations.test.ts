// 读 contracts/generated/openapi.yaml 检查每个接口：
// - 都有 x-task，且任务号在 tasks/graph.yaml 里（T01 验收）；
// - 路径前缀、鉴权与接口类别一致，错误响应统一是 problem+json（docs/08 第 4–5 节）。
import { describe, expect, it } from "vitest";
import { GRAPH, OPENAPI, readYaml } from "./support/repo";

type Operation = {
  operationId?: string;
  "x-task"?: unknown;
  security?: Record<string, unknown[]>[];
  responses?: Record<string, { content?: Record<string, { schema?: { $ref?: string } }> }>;
};

const METHODS = ["get", "put", "post", "patch", "delete", "head", "options"] as const;

const doc = readYaml(OPENAPI) as { paths: Record<string, Partial<Record<string, Operation>>> };
const operations = Object.entries(doc.paths).flatMap(([path, item]) =>
  METHODS.flatMap((method) => {
    const operation = item[method];
    return operation === undefined
      ? []
      : [{ path, method, operation, label: `${method.toUpperCase()} ${path}` }];
  }),
);
const taskIds = new Set(
  ((readYaml(GRAPH) as { tasks: { id: string }[] }).tasks ?? []).map((task) => task.id),
);

const PUBLIC = [{}];
const SERVICE = [{ ServiceToken: [] }];
const SESSION_OR_SERVICE = [{ SessionCookie: [] }, { ServiceToken: [] }];
const SESSION = [{ SessionCookie: [] }];

/** docs/08 第 5 节：公开无鉴权；内部只认服务令牌；私有 GET 会话或服务令牌，私有写接口只认会话；/v1/health 无鉴权 */
function expectedSecurity(path: string, method: string): unknown[] {
  if (path === "/v1/health" || path.startsWith("/v1/public/")) return PUBLIC;
  if (path.startsWith("/v1/internal/")) return SERVICE;
  return method === "get" ? SESSION_OR_SERVICE : SESSION;
}

describe("contracts/generated/openapi.yaml 的接口", () => {
  it("有接口", () => {
    expect(operations.length).toBeGreaterThan(0);
  });

  it.each(operations)("$label 有 x-task，且任务号在 tasks/graph.yaml 里", ({ operation }) => {
    const task = operation["x-task"];
    expect(typeof task, '缺少 x-task（在操作上加 @task("Txx")）').toBe("string");
    expect(taskIds.has(task as string), `任务号 ${String(task)} 不在 tasks/graph.yaml 里`).toBe(
      true,
    );
  });

  it.each(operations)(
    "$label 路径以 /v1/ 开头，鉴权与接口类别一致",
    ({ path, method, operation }) => {
      expect(path.startsWith("/v1/")).toBe(true);
      expect(operation.security, "私有写接口要另标 @useAuth(HubHttp.SessionCookie)").toEqual(
        expectedSecurity(path, method),
      );
    },
  );

  it.each(operations)("$label 的错误响应是 application/problem+json", ({ operation }) => {
    const schema = operation.responses?.default?.content?.["application/problem+json"]?.schema;
    expect(schema?.$ref, "返回类型里加 | HubHttp.ErrorResponse").toBe(
      "#/components/schemas/Problem",
    );
  });
});
