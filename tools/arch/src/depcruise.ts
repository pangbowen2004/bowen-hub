// dependency-cruiser 的外层：只检查 apps/、services/、packages/ 里已经有的 TS/JS/Astro 源码，都没有就跳过。
import { spawnSync } from "node:child_process";
import { existsSync, readdirSync, rmSync } from "node:fs";
import { join } from "node:path";
import { fileURLToPath } from "node:url";
import { ASTRO_SUFFIX, prepareAstroTree } from "./astro.ts";
import type { RunResult } from "./result.ts";

export const CONFIG_PATH = ".dependency-cruiser.cjs";
export const SOURCE_DIRS = ["apps", "services", "packages"];

const SOURCE_FILE = /\.(ts|tsx|mts|cts|js|jsx|mjs|cjs|astro)$/;
const SKIPPED = new Set([
  "node_modules",
  "dist",
  ".astro",
  ".turbo",
  ".wrangler",
  "storybook-static",
]);
const DEPCRUISE = fileURLToPath(new URL("../node_modules/.bin/depcruise", import.meta.url));

function hasSource(dir: string): boolean {
  if (!existsSync(dir)) return false;
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    if (entry.isDirectory() && !SKIPPED.has(entry.name) && hasSource(join(dir, entry.name)))
      return true;
    if (entry.isFile() && SOURCE_FILE.test(entry.name)) return true;
  }
  return false;
}

export function runDepcruise(root: string): RunResult {
  const dirs = SOURCE_DIRS.filter((dir) => hasSource(join(root, dir)));
  if (dirs.length === 0) {
    return {
      code: 0,
      output: ["dependency-cruiser：跳过（apps/、services/、packages/ 下还没有 TS/JS/Astro 源码）"],
    };
  }
  let shadow: string | undefined;
  try {
    shadow = prepareAstroTree(root, dirs, SKIPPED);
    const checkRoot = shadow ?? root;
    const result = spawnSync(
      DEPCRUISE,
      ["--config", join(checkRoot, CONFIG_PATH), "--output-type", "err-long", ...dirs],
      { cwd: checkRoot, encoding: "utf8" },
    );
    if (result.error) throw result.error;
    return {
      code: result.status ?? 1,
      output: [
        `dependency-cruiser：检查 ${dirs.join("、")}`,
        ...`${result.stdout}${result.stderr}`.replaceAll(ASTRO_SUFFIX, "").trim().split("\n"),
      ],
    };
  } catch (error) {
    return {
      code: 1,
      output: [
        `dependency-cruiser：Astro 检查失败：${error instanceof Error ? error.message : String(error)}`,
      ],
    };
  } finally {
    if (shadow !== undefined) rmSync(shadow, { recursive: true, force: true });
  }
}
