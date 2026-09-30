// 测试用的临时 git 仓库。全部在系统临时目录里，不碰真实仓库；不读用户自己的 git 配置。
import { execFileSync, spawnSync } from "node:child_process";
import { copyFileSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";
import { parseGraph, type Task } from "../src/graph.ts";

export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

/** 测试用的任务图夹具（不对真实 tasks/graph.yaml 的具体条目做断言）。 */
export const FIXTURE_GRAPH = fileURLToPath(new URL("./fixtures/graph.yaml", import.meta.url));

export function fixtureTasks(): Task[] {
  return parseGraph(readFileSync(FIXTURE_GRAPH, "utf8"));
}

Object.assign(process.env, {
  GIT_CONFIG_GLOBAL: "/dev/null",
  GIT_CONFIG_NOSYSTEM: "1",
  GIT_AUTHOR_NAME: "测试",
  GIT_AUTHOR_EMAIL: "test@example.com",
  GIT_COMMITTER_NAME: "测试",
  GIT_COMMITTER_EMAIL: "test@example.com",
});

export function tempDir(prefix: string): string {
  return mkdtempSync(join(tmpdir(), `bowen-hub-${prefix}-`));
}

export function removeDir(dir: string): void {
  rmSync(dir, { recursive: true, force: true });
}

export function git(cwd: string, ...args: string[]): string {
  return execFileSync("git", args, { cwd, encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] });
}

export function writeFiles(root: string, files: Record<string, string>): void {
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
}

export function commitAll(repo: string, message: string): void {
  git(repo, "add", "-A");
  git(repo, "commit", "--quiet", "--allow-empty", "-m", message);
}

/** 新仓库：main 分支，tasks/graph.yaml 用夹具，带一个初始提交。 */
export function initRepo(): string {
  const repo = tempDir("repo");
  git(repo, "init", "--quiet", "-b", "main");
  mkdirSync(join(repo, "tasks"));
  copyFileSync(FIXTURE_GRAPH, join(repo, "tasks/graph.yaml"));
  commitAll(repo, "docs: 初始文档、配置、提示词与对照数据");
  return repo;
}

/** 用 Node 直接运行 bin/ 下的入口（和 mise 调用时一样，靠 Node 自带的类型擦除执行 .ts）。 */
export function runBin(
  bin: string,
  options: { cwd: string; args?: string[]; env?: Record<string, string> },
): { code: number; stdout: string; stderr: string } {
  const result = spawnSync(
    process.execPath,
    [join(REPO_ROOT, "tools/tasks/bin", bin), ...(options.args ?? [])],
    { cwd: options.cwd, encoding: "utf8", env: { ...process.env, ...options.env } },
  );
  return { code: result.status ?? 1, stdout: result.stdout, stderr: result.stderr };
}
