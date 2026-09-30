// check:ownership 的外层：取任务号、读 git 改动、读依赖清单，然后交给 ownership.ts 判断。
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import type { RunResult } from "./cli.ts";
import { changedFiles, currentBranch, mainRef, mergeBase, showFile } from "./git.ts";
import { loadGraph } from "./graph.ts";
import { onlyDependencySectionsChanged, ownManifestPaths } from "./manifest.ts";
import { checkOwnership, type Subject, subjectFromBranch, subjectFromTitle } from "./ownership.ts";

/**
 * 任务号来源：PR 标题（CI 里经环境变量 PR_TITLE 传入）→ 当前分支名 task/<ID>-* → 都没有就跳过。
 * 改动文件 = 相对 main 合并基点的差异（含未提交和未跟踪的文件，本地提交前也能检查）。
 */
export function runOwnershipCheck(root: string, prTitle: string | undefined): RunResult {
  const tasks = loadGraph(root);
  const title = prTitle?.trim() ?? "";
  let subject: Subject | undefined;
  let source: string;
  if (title !== "") {
    subject = subjectFromTitle(title);
    if (subject === undefined) {
      return fail(`PR 标题“${title}”里没有可识别的任务号：应以 [Txx] 或 [C] 开头`);
    }
    source = `取自 PR 标题“${title}”`;
  } else {
    const branch = currentBranch(root);
    subject = branch === undefined ? undefined : subjectFromBranch(branch);
    if (subject === undefined) {
      const where =
        branch === undefined ? "当前不在任何分支上" : `分支 ${branch} 不是 task/<任务号>-*`;
      return { code: 0, output: [`check:ownership：跳过（${where}，也没有 PR 标题）`] };
    }
    source = `取自分支 ${branch}`;
  }

  const task =
    subject.kind === "task" ? tasks.find((candidate) => candidate.id === subject.id) : undefined;
  if (subject.kind === "task" && task === undefined) {
    return fail(`任务 ${subject.id} 不在 tasks/graph.yaml 里`);
  }

  const ref = mainRef(root);
  const base = mergeBase(root, ref);
  const changes = changedFiles(root, base);
  const verdicts = checkOwnership({
    tasks,
    subject,
    changes,
    ownManifests:
      task === undefined
        ? new Set()
        : ownManifestPaths(task, (path) => existsSync(join(root, path))),
    onlyDependenciesChanged: (path) =>
      onlyDependencySectionsChanged(
        path,
        showFile(root, base, path),
        readIfExists(join(root, path)),
      ),
  });

  const who = subject.kind === "contract" ? "契约 PR [C]" : subject.id;
  const header = `check:ownership：${who}（${source}），相对 ${ref} 的合并基点有 ${changes.length} 个改动文件`;
  const bad = verdicts.filter((verdict) => !verdict.ok);
  if (bad.length === 0) return { code: 0, output: [`${header}，全部在允许范围内。`] };
  return {
    code: 1,
    output: [
      `${header}，其中 ${bad.length} 个越界：`,
      ...bad.map((verdict) => `  ✗ ${verdict.path} —— ${verdict.reason}`),
      "只能改自己 owns 里的路径（外加 scaffolds、sharedEdits 和公共文件），见 docs/11 第 4 节。",
      "（本地运行时请先 git fetch，否则过期的 origin/main 会把 main 上别人的改动也算进来。）",
    ],
  };
}

function fail(message: string): RunResult {
  return { code: 1, output: [`check:ownership：${message}`] };
}

function readIfExists(path: string): string | undefined {
  return existsSync(path) ? readFileSync(path, "utf8") : undefined;
}
