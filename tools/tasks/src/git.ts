// 调用 git 的小工具。所有路径都是相对仓库根、用 / 分隔。
import { execFileSync } from "node:child_process";

export type ChangeStatus = "A" | "M" | "D";

export type Change = { path: string; status: ChangeStatus };

export function git(root: string, args: string[]): string {
  return execFileSync("git", args, {
    cwd: root,
    encoding: "utf8",
    stdio: ["ignore", "pipe", "pipe"],
    maxBuffer: 64 * 1024 * 1024,
  });
}

function tryGit(root: string, args: string[]): string | undefined {
  try {
    return git(root, args);
  } catch {
    return undefined;
  }
}

export function repoRoot(cwd: string): string {
  return git(cwd, ["rev-parse", "--show-toplevel"]).trim();
}

/** 以哪个 main 为准：有 origin/main 用 origin/main，否则用本地 main。 */
export function mainRef(root: string): string {
  for (const [ref, name] of [
    ["refs/remotes/origin/main", "origin/main"],
    ["refs/heads/main", "main"],
  ] as const) {
    if (tryGit(root, ["rev-parse", "--verify", "--quiet", ref]) !== undefined) return name;
  }
  throw new Error("找不到 main 分支（origin/main 和 main 都不存在）");
}

export function mergeBase(root: string, ref: string): string {
  return git(root, ["merge-base", ref, "HEAD"]).trim();
}

/** 相对 base 的全部改动：已提交、未提交的，加上未跟踪的新文件。改名按“删旧 + 加新”算。 */
export function changedFiles(root: string, base: string): Change[] {
  const changes = new Map<string, ChangeStatus>();
  const fields = git(root, ["diff", "--name-status", "--no-renames", "-z", base]).split("\0");
  for (let i = 0; i + 1 < fields.length; i += 2) {
    const status = fields[i];
    const path = fields[i + 1];
    if (status === undefined || path === undefined || path === "") continue;
    changes.set(path, status === "A" ? "A" : status === "D" ? "D" : "M");
  }
  const untracked = git(root, ["ls-files", "--others", "--exclude-standard", "-z"]).split("\0");
  for (const path of untracked) {
    if (path !== "") changes.set(path, "A");
  }
  return [...changes.entries()]
    .map(([path, status]) => ({ path, status }))
    .sort((a, b) => a.path.localeCompare(b.path));
}

/** 当前分支名；分离头指针（例如 CI 里的合并提交）时返回 undefined。 */
export function currentBranch(root: string): string | undefined {
  return tryGit(root, ["symbolic-ref", "--quiet", "--short", "HEAD"])?.trim() || undefined;
}

export function commitSubjects(root: string, ref: string): string[] {
  return git(root, ["log", "--format=%s", ref]).split("\n").filter(Boolean);
}

/** 本地和远端的全部分支（完整引用名，如 refs/heads/task/T01-x、refs/remotes/origin/task/T01-x）。 */
export function branchRefs(root: string): string[] {
  return git(root, ["for-each-ref", "--format=%(refname)", "refs/heads", "refs/remotes"])
    .split("\n")
    .filter(Boolean);
}

/** 某个提交里的文件内容；文件不存在时返回 undefined。 */
export function showFile(root: string, rev: string, path: string): string | undefined {
  return tryGit(root, ["show", `${rev}:${path}`]);
}
