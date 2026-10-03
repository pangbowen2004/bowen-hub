// ci:changes：这次改动碰到了哪些区域，决定 CI 里“评测”和“性能”两步跑不跑（docs/11 第 8 节）。
import { appendFileSync } from "node:fs";
import type { RunResult } from "./cli.ts";
import { changedFiles, mainRef, mergeBase } from "./git.ts";
import { matchesAny } from "./glob.ts";

export const AREAS = {
  /** 智能平面：能力清单、提示词、评测集、模型档位，以及两种语言的运行时（docs/01 第 4 节）。 */
  ai: [
    "capabilities/**",
    "prompts/**",
    "evals/**",
    "config/llm.yaml",
    "config/codex-models.json",
    "packages/ai/**",
    "py/packages/hub-ai/**",
  ],
  /** 两个公开站（Lighthouse CI）。 */
  sites: ["apps/markets/**", "apps/papers/**"],
} as const;

export type Area = keyof typeof AREAS;

export function detectAreas(paths: string[]): Record<Area, boolean> {
  return {
    ai: paths.some((path) => matchesAny(AREAS.ai, path)),
    sites: paths.some((path) => matchesAny(AREAS.sites, path)),
  };
}

/** 结果打印出来；在 GitHub Actions 里（有 GITHUB_OUTPUT）同时写成步骤输出 ai=… sites=…。 */
export function runChanges(root: string, githubOutput: string | undefined): RunResult {
  const ref = mainRef(root);
  const paths = changedFiles(root, mergeBase(root, ref)).map((change) => change.path);
  const pairs = Object.entries(detectAreas(paths)).map(([area, hit]) => `${area}=${hit}`);
  if (githubOutput !== undefined && githubOutput !== "") {
    appendFileSync(githubOutput, `${pairs.join("\n")}\n`);
  }
  return {
    code: 0,
    output: [`ci:changes：相对 ${ref} 的合并基点有 ${paths.length} 个改动文件；${pairs.join(" ")}`],
  };
}
