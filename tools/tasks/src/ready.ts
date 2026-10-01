// tasks:ready：列出可以开工的任务（docs/11 第 2 节）。
// 已完成 = main（有 origin/main 时以它为准）上有提交标题以 [<ID>] 开头；
// 进行中 = 有本地或远端分支 task/<ID>-*，且还没完成；
// 可开工 = 依赖全部已完成、自己没完成也不在进行中。
import type { RunResult } from "./cli.ts";
import { branchRefs, commitSubjects, mainRef } from "./git.ts";
import { loadGraph, type Task } from "./graph.ts";

export function completedFromSubjects(subjects: string[]): Set<string> {
  const done = new Set<string>();
  for (const subject of subjects) {
    const match = /^\[(T\d+)\]/.exec(subject);
    if (match?.[1] !== undefined) done.add(match[1]);
  }
  return done;
}

/** refs/heads/task/T01-x 或 refs/remotes/<远端>/task/T01-x → T01。 */
export function inProgressFromRefs(refs: string[]): Set<string> {
  const ids = new Set<string>();
  for (const ref of refs) {
    const branch = ref.startsWith("refs/heads/")
      ? ref.slice("refs/heads/".length)
      : ref.startsWith("refs/remotes/")
        ? ref.slice("refs/remotes/".length).split("/").slice(1).join("/")
        : "";
    const match = /^task\/(T\d+)-/.exec(branch);
    if (match?.[1] !== undefined) ids.add(match[1]);
  }
  return ids;
}

export function readyTasks(tasks: Task[], done: Set<string>, inProgress: Set<string>): Task[] {
  return tasks.filter(
    (task) =>
      !done.has(task.id) &&
      !inProgress.has(task.id) &&
      task.dependsOn.every((dep) => done.has(dep)),
  );
}

export function runReady(root: string): RunResult {
  const tasks = loadGraph(root);
  const ref = mainRef(root);
  const done = completedFromSubjects(commitSubjects(root, ref));
  const inProgress = new Set(
    [...inProgressFromRefs(branchRefs(root))].filter((id) => !done.has(id)),
  );
  const ready = readyTasks(tasks, done, inProgress);
  const output =
    ready.length === 0
      ? ["现在没有可开工的任务。"]
      : [
          "可开工的任务（依赖都已合并、还没有人在做）：",
          ...ready.map(
            (task) => `  ${task.id}  ${task.title}（第 ${task.wave} 波，难度 ${task.difficulty}）`,
          ),
        ];
  output.push(
    `共 ${tasks.length} 个任务：已完成 ${done.size}，进行中 ${inProgress.size}，可开工 ${ready.length}。` +
      `（依据 ${ref} 的提交标题和 task/* 分支；要最新状态请先 git fetch --prune）`,
  );
  return { code: 0, output };
}
