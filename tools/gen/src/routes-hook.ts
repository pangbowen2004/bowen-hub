// 第 4 步（预检 Q08）：存在 services/api/scripts/gen-routes.* 就调用它生成 services/api/src/routes.gen.ts。
// 那个脚本由 T02 写；这里只约定：用 node 运行（Node 24 能直接运行 .ts），工作目录是仓库根。
import { existsSync, readdirSync } from "node:fs";
import { join } from "node:path";
import { PATHS, ROOT, relative } from "./paths.ts";
import { run } from "./run.ts";

const RUNNABLE = /^gen-routes\.(ts|mts|cts|js|mjs|cjs)$/;

/** 找出路由生成脚本；没有返回 undefined。有多个、或扩展名不认识时报错。 */
export function findRoutesScript(dir: string, entries: string[]): string | undefined {
  const candidates = entries.filter((name) => name.startsWith("gen-routes."));
  if (candidates.length === 0) return undefined;
  if (candidates.length > 1) {
    throw new Error(`${dir} 里有多个路由生成脚本：${candidates.join("、")}，只能有一个`);
  }
  const [name] = candidates;
  if (name === undefined || !RUNNABLE.test(name)) {
    throw new Error(
      `不知道怎么运行 ${name ?? ""}：路由生成脚本要用 node 能直接运行的扩展名（.ts、.js 等）`,
    );
  }
  return join(dir, name);
}

export function generateRoutes(): void {
  const entries = existsSync(PATHS.apiScripts) ? readdirSync(PATHS.apiScripts) : [];
  const script = findRoutesScript(PATHS.apiScripts, entries);
  if (script === undefined) {
    console.log("路由骨架：services/api/scripts/gen-routes.* 还不存在（由 T02 提供），跳过。");
    return;
  }
  console.log(`路由骨架：运行 ${relative(script)}`);
  run(process.execPath, [script], ROOT);
}
