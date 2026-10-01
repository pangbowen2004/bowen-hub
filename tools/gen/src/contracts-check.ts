// mise run contracts:check：用 oasdiff 检查当前 OpenAPI 相对 main 有没有破坏性变更（docs/08 第 3 节、docs/11 第 5.1 节）。
// 比较的基准是“当前提交与 main 的合并基点”上的 openapi.yaml：只算本分支带来的变化
// （CI 里检出的是 PR 合进 main 后的提交，合并基点就是 main 的最新提交）。
import { existsSync, mkdtempSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { PATHS, ROOT, relative } from "./paths.ts";
import { capture } from "./run.ts";

export type BasePlan =
  | { kind: "compare"; ref: string; base: string; content: string }
  | { kind: "skip"; message: string };

export type Git = (args: string[]) => string | undefined;

export const gitIn =
  (cwd: string): Git =>
  (args) =>
    capture("git", args, cwd);

/** 以哪个 main 为准：有 origin/main 用 origin/main，否则用本地 main。 */
export function mainRef(git: Git): string | undefined {
  for (const [ref, name] of [
    ["refs/remotes/origin/main", "origin/main"],
    ["refs/heads/main", "main"],
  ] as const) {
    if (git(["rev-parse", "--verify", "--quiet", ref]) !== undefined) return name;
  }
  return undefined;
}

export function planBase(git: Git, file: string): BasePlan {
  const ref = mainRef(git);
  if (ref === undefined)
    return {
      kind: "skip",
      message: "找不到 main 分支（origin/main、main 都不存在），跳过契约兼容检查。",
    };
  const base = git(["merge-base", ref, "HEAD"])?.trim();
  if (base === undefined || base === "") {
    return { kind: "skip", message: `找不到当前提交与 ${ref} 的合并基点，跳过契约兼容检查。` };
  }
  const content = git(["show", `${base}:${file}`]);
  if (content === undefined) {
    return {
      kind: "skip",
      message: `${ref}（合并基点 ${base.slice(0, 7)}）上还没有 ${file}：这是第一次引入契约，没有可比较的旧版本，通过。`,
    };
  }
  return { kind: "compare", ref, base, content };
}

export function oasdiffArgs(basePath: string, revisionPath: string): string[] {
  return [
    "breaking",
    basePath,
    revisionPath,
    "--fail-on",
    "ERR",
    "--color",
    "never",
    "--allow-external-refs=false",
  ];
}

export function contractsCheck(spawnOasdiff: (args: string[]) => number): number {
  const file = relative(PATHS.openapi);
  if (!existsSync(PATHS.openapi)) {
    console.error(`${file} 不存在：先运行 mise run gen。`);
    return 1;
  }
  const plan = planBase(gitIn(ROOT), file);
  if (plan.kind === "skip") {
    console.log(`contracts:check：${plan.message}`);
    return 0;
  }
  const dir = mkdtempSync(join(tmpdir(), "bowen-hub-oasdiff-"));
  try {
    const basePath = join(dir, "base-openapi.yaml");
    writeFileSync(basePath, plan.content);
    console.log(
      `contracts:check：用 oasdiff 比较 ${file}（基准：${plan.ref} 的合并基点 ${plan.base.slice(0, 7)}）`,
    );
    const code = spawnOasdiff(oasdiffArgs(basePath, PATHS.openapi));
    if (code === 0) {
      console.log("contracts:check：没有破坏性变更。");
    } else {
      console.error(
        "contracts:check：发现破坏性变更。契约只允许增量兼容的改动（加可选字段、加接口）；" +
          "破坏性改动需要 ADR 和 Kevin 同意（docs/11 第 5.1 节）。",
      );
    }
    return code;
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
