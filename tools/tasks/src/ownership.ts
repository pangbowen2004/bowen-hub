// 路径所有权检查（docs/11 第 4 节）：PR 改动的每个文件都必须在本任务允许的范围内。

import type { Change } from "./git.ts";
import { compareSpecificity, matches, matchesAny } from "./glob.ts";
import type { Task } from "./graph.ts";

/** 生成物：任何 PR 都可以包含，但只能由生成命令改动（CI 的“生成物一致”一步会核对）。 */
export const GENERATED = [
  "contracts/generated/**",
  "packages/contracts/src/generated/**",
  "py/packages/hub-contracts/**",
  "services/api/src/routes.gen.ts",
  "apps/console/src/routeTree.gen.ts",
];

export const LOCK_FILES = ["pnpm-lock.yaml", "py/uv.lock"];

export type Subject =
  | { kind: "task"; id: string }
  | { kind: "contract" }
  | { kind: "orchestrator" };

export type Verdict = { path: string; ok: boolean; reason: string };

export type OwnershipInput = {
  tasks: Task[];
  subject: Subject;
  changes: Change[];
  /** 本任务“自己包”的依赖清单（见 manifest.ts）。 */
  ownManifests: ReadonlySet<string>;
  /** 某个依赖清单是否只改了依赖相关的段。 */
  onlyDependenciesChanged: (path: string) => boolean;
};

type Claim = { taskId: string; pattern: string };

/** 按“更具体优先”找出一个路径的所有者；最具体的几条并列时都算所有者。 */
export function ownersOf(path: string, tasks: Task[]): Claim[] {
  let best: Claim[] = [];
  for (const task of tasks) {
    for (const pattern of task.owns) {
      if (!matches(pattern, path)) continue;
      const order = best[0] === undefined ? 1 : compareSpecificity(pattern, best[0].pattern);
      if (order > 0) best = [{ taskId: task.id, pattern }];
      else if (order === 0 && !best.some((claim) => claim.taskId === task.id)) {
        best.push({ taskId: task.id, pattern });
      }
    }
  }
  return best;
}

/** sharedEdits 的写法是“路径：能改的范围”，冒号是全角的。 */
export function parseSharedEdit(entry: string): { path: string; scope: string } {
  const index = entry.indexOf("：");
  if (index === -1) return { path: entry.trim(), scope: "" };
  return { path: entry.slice(0, index).trim(), scope: entry.slice(index + 1).trim() };
}

export function checkOwnership(input: OwnershipInput): Verdict[] {
  const { subject } = input;
  if (subject.kind === "orchestrator") {
    return input.changes.map(({ path }) => ({ path, ok: true, reason: "编排 PR：所有权豁免" }));
  }
  if (subject.kind === "contract") {
    return input.changes.map(({ path }) =>
      matches("contracts/**", path) || matchesAny(GENERATED, path)
        ? { path, ok: true, reason: "契约 PR：contracts/** 或生成物" }
        : { path, ok: false, reason: "契约 PR（[C]）只能改 contracts/** 和生成物" },
    );
  }
  const task = input.tasks.find((candidate) => candidate.id === subject.id);
  if (task === undefined) throw new Error(`任务 ${subject.id} 不在 tasks/graph.yaml 里`);
  return input.changes.map((change) => judge(change, task, input));
}

function judge(change: Change, task: Task, input: OwnershipInput): Verdict {
  const { path } = change;
  const ok = (reason: string): Verdict => ({ path, ok: true, reason });
  const no = (reason: string): Verdict => ({ path, ok: false, reason });

  if (matchesAny(GENERATED, path)) return ok("生成物");

  const owners = ownersOf(path, input.tasks);
  const mine = owners.find((claim) => claim.taskId === task.id);
  if (mine !== undefined) return ok(`owns：${mine.pattern}`);

  const scaffold = task.scaffolds.find((pattern) => matches(pattern, path));
  if (scaffold !== undefined) return ok(`骨架（scaffolds）：${scaffold}`);

  const shared = task.sharedEdits.map(parseSharedEdit).find((edit) => matches(edit.path, path));
  if (shared !== undefined) {
    const scope = shared.scope === "" ? "" : `；范围“${shared.scope}”由人工审查`;
    return ok(`sharedEdits：${shared.path}${scope}`);
  }

  if (path === `docs/progress/${task.id}.md`) return ok("本任务的进度记录");
  if (matches("docs/adr/ADR-*.md", path)) {
    return change.status === "A"
      ? ok("新增的 ADR")
      : no("任务 PR 对 ADR 只增不改（推翻旧决定请新写一条 ADR，旧记录由 [编排] PR 注明已被取代）");
  }
  if (LOCK_FILES.includes(path)) return ok("锁文件");
  if (matches(`fixtures/samples/${task.id}/**`, path)) return ok("本任务的样例数据");
  if (input.ownManifests.has(path)) {
    return input.onlyDependenciesChanged(path)
      ? ok("本任务所在包的依赖清单（只改了依赖段）")
      : no("本任务所在包的依赖清单只允许改依赖相关的段");
  }

  const [first] = owners;
  if (first !== undefined) {
    const others = owners.map((claim) => claim.taskId).join("、");
    const alsoMatchesMine = task.owns.some((pattern) => matches(pattern, path));
    return no(
      alsoMatchesMine
        ? `归 ${others}（更具体的 ${first.pattern}）`
        : `归 ${others}（${first.pattern}）`,
    );
  }
  return no("不在本任务的 owns、scaffolds、sharedEdits 和公共文件范围内");
}

/** 从 PR 标题取身份：[T21] → 任务；[C] → 契约；[编排] → 编排者。 */
export function subjectFromTitle(title: string): Subject | undefined {
  const match = /^\s*\[(T\d+|C|编排)\]/.exec(title);
  if (match?.[1] === undefined) return undefined;
  if (match[1] === "编排") return { kind: "orchestrator" };
  return match[1] === "C" ? { kind: "contract" } : { kind: "task", id: match[1] };
}

/** 从分支名取任务号：task/T21-xxx → T21。 */
export function subjectFromBranch(branch: string): Subject | undefined {
  const match = /^task\/(T\d+)-/.exec(branch);
  return match?.[1] === undefined ? undefined : { kind: "task", id: match[1] };
}
