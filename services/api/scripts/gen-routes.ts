// T01的统一生成链调用此脚本；字段、任务号和接口清单只读OpenAPI。
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const spec = parse(readFileSync(resolve(root, "contracts/generated/openapi.yaml"), "utf8")) as {
  paths: Record<string, Record<string, { operationId: string; "x-task": string }>>;
};
const routes = Object.entries(spec.paths)
  .flatMap(([path, ops]) =>
    Object.entries(ops)
      .filter(([method]) =>
        ["get", "put", "post", "patch", "delete", "options", "head"].includes(method),
      )
      .map(([method, op]) => {
        if (!op.operationId || !op["x-task"])
          throw new Error(`接口缺少operationId或x-task：${path}`);
        return {
          method: method.toUpperCase(),
          path: path.replace(/\{([^}]+)\}/g, ":$1"),
          operationId: op.operationId,
          task: op["x-task"],
        };
      }),
  )
  .sort(
    (a, b) =>
      a.path.split(":").length - b.path.split(":").length ||
      a.path.localeCompare(b.path, "en") ||
      a.method.localeCompare(b.method, "en"),
  );
const notice = "// 由 contracts 生成，勿手改（mise run gen）\n";
const modules = ["platform", "news", "watchlist", "markets", "papers"];
const source =
  notice +
  `import type { Hono } from "hono";\nimport type { AppEnv } from "./lib/env";\nimport { unimplemented } from "./lib/problem";\n` +
  modules
    .map((name) => `import { handlers as ${name} } from "./modules/${name}/routes";\n`)
    .join("") +
  `export const ROUTES = ${JSON.stringify(routes, null, 2)} as const;\nconst handlers = { ...${modules.join(", ...")} };\nexport function registerRoutes(app: Hono<AppEnv>): void {\n  for (const route of ROUTES) app.on(route.method,route.path,handlers[route.operationId] ?? unimplemented(route.task));\n}\n`;
writeFileSync(resolve(root, "services/api/src/routes.gen.ts"), source);
const config = parse(readFileSync(resolve(root, "config/llm.yaml"), "utf8")) as {
  monthlyBudgetUsd: number;
};
if (!Number.isFinite(config.monthlyBudgetUsd)) throw new Error("模型配置缺少月度预算");
writeFileSync(
  resolve(root, "services/api/src/lib/config.gen.ts"),
  `${notice}export const MONTHLY_BUDGET_USD = ${config.monthlyBudgetUsd};\n`,
);
console.log(`API路由：${routes.length}个，月度预算配置已编入`);
