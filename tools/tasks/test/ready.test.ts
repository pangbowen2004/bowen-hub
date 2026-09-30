import { afterEach, describe, expect, it } from "vitest";
import { loadGraph } from "../src/graph.ts";
import { completedFromSubjects, inProgressFromRefs, readyTasks, runReady } from "../src/ready.ts";
import {
  commitAll,
  fixtureTasks,
  git,
  initRepo,
  REPO_ROOT,
  removeDir,
  runBin,
  tempDir,
} from "./helpers.ts";

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) removeDir(dir);
});

function repo(): string {
  const dir = initRepo();
  created.push(dir);
  return dir;
}

function readyIds(output: string[]): string[] {
  return output.flatMap((line) => /^\s+(T\d+)\s/.exec(line)?.slice(1, 2) ?? []);
}

describe("tasks:ready（任务图用测试夹具，结构与真实的一致：T01 只依赖 T00）", () => {
  it("只有初始提交时只有 T00 可开工", () => {
    expect(readyIds(runReady(repo()).output)).toEqual(["T00"]);
  });

  it("T00 以 squash 合并进 main 之后只列出 T01", () => {
    const dir = repo();
    commitAll(dir, "[T00] 仓库骨架与工具链 (#1)");
    const result = runReady(dir);
    expect(result.code).toBe(0);
    expect(readyIds(result.output)).toEqual(["T01"]);
  });

  it("T00 的分支还在但已合并，照样算完成", () => {
    const dir = repo();
    git(dir, "branch", "task/T00-toolchain");
    commitAll(dir, "[T00] 仓库骨架与工具链 (#1)");
    expect(readyIds(runReady(dir).output)).toEqual(["T01"]);
  });

  it("本地有 task/T00-* 分支、还没合并：T00 进行中，不列出", () => {
    const dir = repo();
    git(dir, "branch", "task/T00-toolchain");
    const result = runReady(dir);
    expect(readyIds(result.output)).toEqual([]);
    expect(result.output.join("\n")).toContain("现在没有可开工的任务");
  });

  it("只有远端有 task/T01-* 分支也算进行中", () => {
    const dir = repo();
    const origin = tempDir("origin");
    created.push(origin);
    git(origin, "init", "--quiet", "--bare");
    git(dir, "remote", "add", "origin", origin);
    commitAll(dir, "[T00] 仓库骨架与工具链 (#1)");
    git(dir, "push", "--quiet", "origin", "main", "main:task/T01-contracts");
    git(dir, "fetch", "--quiet", "origin");
    expect(readyIds(runReady(dir).output)).toEqual([]);
  });

  it("有 origin/main 时以 origin/main 为准", () => {
    const dir = repo();
    const origin = tempDir("origin");
    created.push(origin);
    git(origin, "init", "--quiet", "--bare");
    git(dir, "remote", "add", "origin", origin);
    git(dir, "push", "--quiet", "origin", "main");
    git(dir, "fetch", "--quiet", "origin");
    // 只在本地 main 上“合并”了 T00，远端没有
    commitAll(dir, "[T00] 仓库骨架与工具链 (#1)");
    expect(readyIds(runReady(dir).output)).toEqual(["T00"]);
  });

  it("命令行入口能直接用 Node 运行", () => {
    const dir = repo();
    commitAll(dir, "[T00] 仓库骨架与工具链 (#1)");
    const result = runBin("ready.ts", { cwd: dir });
    expect(result.stderr).toBe("");
    expect(result.code).toBe(0);
    expect(readyIds(result.stdout.split("\n"))).toEqual(["T01"]);
  });
});

describe("状态判断的纯函数", () => {
  const tasks = fixtureTasks();

  it("提交标题以 [ID] 开头才算完成，[C] 契约 PR 不算", () => {
    const done = completedFromSubjects([
      "[T00] 仓库骨架与工具链 (#1)",
      "[C] 给 Paper 加可选字段 (#9)",
      "docs: 修正 [T05] 的说明",
      "[T01] 契约与代码生成 (#2)",
    ]);
    expect([...done].sort()).toEqual(["T00", "T01"]);
  });

  it("本地和各个远端的 task/<ID>-* 分支", () => {
    const ids = inProgressFromRefs([
      "refs/heads/main",
      "refs/heads/task/T02-api",
      "refs/remotes/origin/task/T03-python",
      "refs/remotes/origin/HEAD",
      "refs/remotes/fork/task/T05-ui",
      "refs/heads/task/T04",
      "refs/heads/feature/task/T06-x",
    ]);
    expect([...ids].sort()).toEqual(["T02", "T03", "T05"]);
  });

  it("依赖没有全部完成就不能开工（T04 依赖 T01 和 T03）", () => {
    const readyWithT01 = readyTasks(tasks, new Set(["T00", "T01"]), new Set()).map((t) => t.id);
    expect(readyWithT01).toEqual(["T02", "T03", "T05"]);
    const readyWithT03 = readyTasks(tasks, new Set(["T00", "T01", "T03"]), new Set(["T02"])).map(
      (t) => t.id,
    );
    expect(readyWithT03).toContain("T04");
    expect(readyWithT03).not.toContain("T02");
  });
});

describe("真实的 tasks/graph.yaml", () => {
  it("格式正确：任务号是 Txx、不重复，依赖的任务都存在", () => {
    expect(loadGraph(REPO_ROOT).length).toBeGreaterThan(0);
  });
});
