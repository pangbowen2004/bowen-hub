import { afterEach, describe, expect, it } from "vitest";
import { runOwnershipCheck } from "../src/check-ownership.ts";
import type { Change } from "../src/git.ts";
import {
  checkOwnership,
  parseSharedEdit,
  type Subject,
  subjectFromBranch,
  subjectFromTitle,
  type Verdict,
} from "../src/ownership.ts";
import {
  commitAll,
  fixtureTasks,
  git,
  initRepo,
  removeDir,
  runBin,
  writeFiles,
} from "./helpers.ts";

// 断言只针对测试夹具 test/fixtures/graph.yaml 里的条目
const tasks = fixtureTasks();

function judge(
  subject: Subject,
  changes: Array<Change | string>,
  extra: { ownManifests?: string[]; depsOnly?: boolean } = {},
): Verdict[] {
  return checkOwnership({
    tasks,
    subject,
    changes: changes.map((change) =>
      typeof change === "string" ? { path: change, status: "M" } : change,
    ),
    ownManifests: new Set(extra.ownManifests ?? []),
    onlyDependenciesChanged: () => extra.depsOnly ?? false,
  });
}

function one(id: string, change: Change | string, extra = {}): Verdict {
  const [verdict] = judge({ kind: "task", id }, [change], extra);
  if (verdict === undefined) throw new Error("没有结果");
  return verdict;
}

describe("越界改动被拒绝", () => {
  it("改别的任务拥有的文件", () => {
    const verdict = one("T21", "services/api/src/app.ts");
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("归 T02");
  });

  it("改没有任何任务拥有的规格文档", () => {
    const verdict = one("T21", "docs/03-市场观测台.md");
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("不在本任务");
  });

  it("删除别人的文件也算越界", () => {
    expect(one("T21", { path: "apps/markets/src/pages/index.astro", status: "D" }).ok).toBe(false);
  });

  it("别的任务的进度记录和样例数据", () => {
    expect(one("T21", "docs/progress/T22.md").ok).toBe(false);
    const sample = one("T21", { path: "fixtures/samples/T22/day.json", status: "A" });
    expect(sample.ok).toBe(false);
    expect(sample.reason).toContain("归 T01");
  });
});

describe("更具体的 glob 优先", () => {
  it("services/api/src/lib/auth/** 归 T40，T02 不能改", () => {
    const verdict = one("T02", "services/api/src/lib/auth/session.ts");
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("归 T40（更具体的 services/api/src/lib/auth/**）");
    expect(one("T40", "services/api/src/lib/auth/session.ts").ok).toBe(true);
  });

  it("services/api/src/lib/ 下的其他文件仍归 T02", () => {
    expect(one("T02", "services/api/src/lib/r2.ts").ok).toBe(true);
    expect(one("T40", "services/api/src/lib/r2.ts").ok).toBe(false);
  });

  it("精确路径比目录 glob 具体：platform/export.ts 归 T42", () => {
    expect(one("T02", "services/api/src/modules/platform/export.ts").ok).toBe(false);
    expect(one("T42", "services/api/src/modules/platform/export.ts").ok).toBe(true);
    expect(one("T02", "services/api/src/modules/platform/runs.ts").ok).toBe(true);
  });

  it("hub-core 里的 tests/export/** 归 T42，其余归 T03", () => {
    const verdict = one("T03", "py/packages/hub-core/tests/export/test_run.py");
    expect(verdict.ok).toBe(false);
    expect(verdict.reason).toContain("归 T42（更具体的 py/packages/hub-core/tests/export/**）");
    expect(one("T42", "py/packages/hub-core/tests/export/test_run.py").ok).toBe(true);
    expect(one("T03", "py/packages/hub-core/src/hub_core/http.py").ok).toBe(true);
    // src/hub_core/export/** 归 T42，但它也在 T03 的 scaffolds 里，T03 的骨架 PR 可以建它
    expect(one("T42", "py/packages/hub-core/src/hub_core/export/run.py").reason).toContain("owns");
    expect(one("T03", "py/packages/hub-core/src/hub_core/export/run.py").reason).toContain(
      "scaffolds",
    );
  });
});

describe("公共文件、骨架、生成物、sharedEdits 被允许", () => {
  it("自己的进度记录、新增 ADR、锁文件、自己的样例数据", () => {
    const verdicts = judge({ kind: "task", id: "T21" }, [
      "docs/progress/T21.md",
      { path: "docs/adr/ADR-0013-市场口径.md", status: "A" },
      "pnpm-lock.yaml",
      "py/uv.lock",
      { path: "fixtures/samples/T21/day.json", status: "A" },
    ]);
    expect(verdicts.filter((v) => !v.ok)).toEqual([]);
  });

  it("修改或删除已有的 ADR 被拒绝", () => {
    const modified = one("T21", "docs/adr/ADR-0001-多语言单仓.md");
    expect(modified.ok).toBe(false);
    expect(modified.reason).toContain("只增不改");
    expect(
      one("T21", { path: "docs/adr/ADR-0002-契约优先-TypeSpec为唯一事实源.md", status: "D" }).ok,
    ).toBe(false);
  });

  it("自己包的依赖清单：只改依赖段允许，改了别的段拒绝", () => {
    const manifest = "py/packages/hub-market/pyproject.toml";
    expect(one("T21", manifest, { ownManifests: [manifest], depsOnly: true }).ok).toBe(true);
    const other = one("T21", manifest, { ownManifests: [manifest], depsOnly: false });
    expect(other.ok).toBe(false);
    expect(other.reason).toContain("只允许改依赖相关的段");
    // 不是自己包的清单，即使只改依赖也不行
    expect(one("T21", "py/packages/hub-papers/pyproject.toml", { depsOnly: true }).ok).toBe(false);
  });

  it("骨架 PR 可以越过所有权（不受更具体优先限制）", () => {
    expect(one("T03", "py/packages/hub-market/pyproject.toml").ok).toBe(true);
    expect(one("T03", "py/packages/hub-market/src/hub_market/compute/commands.py").ok).toBe(true);
    expect(one("T02", "services/api/src/modules/news/routes.ts").ok).toBe(true);
    // 骨架合并之后，这些文件归 owns 覆盖它们的任务
    expect(one("T02", "services/api/src/modules/news/routes.ts").reason).toContain("scaffolds");
    expect(one("T14", "services/api/src/modules/news/routes.ts").reason).toContain("owns");
  });

  it("生成物任何任务都可以带上", () => {
    for (const path of [
      "contracts/generated/openapi.yaml",
      "packages/contracts/src/generated/client.ts",
      "py/packages/hub-contracts/src/hub_contracts/models.py",
      "services/api/src/routes.gen.ts",
      "apps/console/src/routeTree.gen.ts",
    ]) {
      expect(one("T24", path).ok).toBe(true);
    }
  });

  it("sharedEdits：T06 可以改 T02 的 wrangler.jsonc，范围交给人工审查", () => {
    const verdict = one("T06", "services/api/wrangler.jsonc");
    expect(verdict.ok).toBe(true);
    expect(verdict.reason).toContain("只改资源 ID 和 vars");
    expect(one("T14", "services/api/wrangler.jsonc").ok).toBe(false);
  });

  it("sharedEdits 的路径可以是 glob，和 owns 一样匹配", () => {
    const migration = one("T40", {
      path: "services/api/migrations/0007_auth_sessions.sql",
      status: "A",
    });
    expect(migration.ok).toBe(true);
    expect(migration.reason).toContain("sharedEdits：services/api/migrations/**");
    expect(migration.reason).toContain("只新增 auth 相关迁移文件");
    expect(one("T40", "services/api/src/db/schema/auth.ts").ok).toBe(true);
    // glob 之外的文件仍归 T02
    const other = one("T40", "services/api/src/db/schema/papers.ts");
    expect(other.ok).toBe(false);
    expect(other.reason).toContain("归 T02");
    expect(one("T14", "services/api/migrations/0008_news.sql").ok).toBe(false);
  });

  it("T00 自己的文件", () => {
    const verdicts = judge({ kind: "task", id: "T00" }, [
      "mise.toml",
      ".github/workflows/ci.yml",
      "packages/config/tsconfig/node.json",
      "tools/tasks/src/ready.ts",
      "py/.importlinter",
      "docs/progress/T00.md",
    ]);
    expect(verdicts.filter((v) => !v.ok)).toEqual([]);
  });
});

describe("[C] 契约 PR", () => {
  it("只允许 contracts/** 和生成物", () => {
    const verdicts = judge({ kind: "contract" }, [
      "contracts/models/paper.tsp",
      "packages/contracts/src/generated/client.ts",
      "py/packages/hub-contracts/src/hub_contracts/models.py",
      "services/api/src/app.ts",
      "pnpm-lock.yaml",
    ]);
    expect(verdicts.filter((v) => !v.ok).map((v) => v.path)).toEqual([
      "services/api/src/app.ts",
      "pnpm-lock.yaml",
    ]);
  });
});

describe("任务号的来源", () => {
  it("PR 标题", () => {
    expect(subjectFromTitle("[T21] 市场指标计算")).toEqual({ kind: "task", id: "T21" });
    expect(subjectFromTitle("[T00] 仓库骨架与工具链 (#1)")).toEqual({ kind: "task", id: "T00" });
    expect(subjectFromTitle("[C] 给 Paper 加可选字段")).toEqual({ kind: "contract" });
    expect(subjectFromTitle("修复市场指标")).toBeUndefined();
    expect(subjectFromTitle("市场指标 [T21]")).toBeUndefined();
  });

  it("分支名", () => {
    expect(subjectFromBranch("task/T21-market-compute")).toEqual({ kind: "task", id: "T21" });
    expect(subjectFromBranch("main")).toBeUndefined();
    expect(subjectFromBranch("task/T21")).toBeUndefined();
  });

  it("sharedEdits 取全角冒号之前的路径", () => {
    expect(parseSharedEdit("services/api/wrangler.jsonc：只改资源 ID 和 vars")).toEqual({
      path: "services/api/wrangler.jsonc",
      scope: "只改资源 ID 和 vars",
    });
    expect(parseSharedEdit("a/b.ts")).toEqual({ path: "a/b.ts", scope: "" });
  });
});

describe("check:ownership 在真实 git 仓库里", () => {
  const created: string[] = [];
  afterEach(() => {
    for (const dir of created.splice(0)) removeDir(dir);
  });

  function repoWithBase(): string {
    const dir = initRepo();
    created.push(dir);
    writeFiles(dir, {
      "py/packages/hub-market/pyproject.toml": [
        "[project]",
        'name = "hub-market"',
        'version = "0.1.0"',
        "dependencies = []",
        "",
      ].join("\n"),
    });
    commitAll(dir, "[T03] Python 底座与命令行预接线 (#4)");
    return dir;
  }

  it("任务分支上只改自己的文件：通过（未提交、未跟踪的文件也算在内）", () => {
    const dir = repoWithBase();
    git(dir, "switch", "--quiet", "-c", "task/T21-market-compute");
    writeFiles(dir, {
      "py/packages/hub-market/src/hub_market/compute/breadth.py": "X = 1\n",
      "docs/progress/T21.md": "# T21\n",
    });
    const result = runOwnershipCheck(dir, undefined);
    expect(result.output.join("\n")).toContain("2 个改动文件");
    expect(result.code).toBe(0);
  });

  it("越界时失败并列出文件和原因", () => {
    const dir = repoWithBase();
    git(dir, "switch", "--quiet", "-c", "task/T21-market-compute");
    writeFiles(dir, { "services/api/src/app.ts": "export {};\n" });
    commitAll(dir, "改了别人的文件");
    const result = runOwnershipCheck(dir, undefined);
    expect(result.code).toBe(1);
    expect(result.output.join("\n")).toContain("services/api/src/app.ts —— 归 T02");
  });

  it("依赖清单：只加依赖通过，改版本号失败", () => {
    const dir = repoWithBase();
    git(dir, "switch", "--quiet", "-c", "task/T21-market-compute");
    const manifest = "py/packages/hub-market/pyproject.toml";
    writeFiles(dir, {
      [manifest]:
        '[project]\nname = "hub-market"\nversion = "0.1.0"\ndependencies = ["polars==1.44.2"]\n',
    });
    expect(runOwnershipCheck(dir, undefined).code).toBe(0);
    writeFiles(dir, {
      [manifest]:
        '[project]\nname = "hub-market"\nversion = "0.2.0"\ndependencies = ["polars==1.44.2"]\n',
    });
    const result = runOwnershipCheck(dir, undefined);
    expect(result.code).toBe(1);
    expect(result.output.join("\n")).toContain("只允许改依赖相关的段");
  });

  it("PR 标题优先于分支名；标题没有任务号就失败", () => {
    const dir = repoWithBase();
    git(dir, "switch", "--quiet", "-c", "some-branch");
    writeFiles(dir, { "services/api/src/app.ts": "export {};\n" });
    expect(runOwnershipCheck(dir, "[T02] API 骨架与预接线").code).toBe(0);
    expect(runOwnershipCheck(dir, "[T21] 市场指标计算").code).toBe(1);
    const noId = runOwnershipCheck(dir, "改一下 API");
    expect(noId.code).toBe(1);
    expect(noId.output.join("\n")).toContain("没有可识别的任务号");
    const unknown = runOwnershipCheck(dir, "[T99] 不存在的任务");
    expect(unknown.code).toBe(1);
  });

  it("在 main 上、没有 PR 标题：跳过并说明", () => {
    const dir = repoWithBase();
    const result = runOwnershipCheck(dir, undefined);
    expect(result.code).toBe(0);
    expect(result.output.join("\n")).toContain("跳过");
  });

  it("CI 里的分离头指针 + PR 标题；命令行入口能直接用 Node 运行", () => {
    const dir = repoWithBase();
    git(dir, "switch", "--quiet", "-c", "task/T21-market-compute");
    writeFiles(dir, { "apps/markets/src/pages/index.astro": "---\n---\n" });
    commitAll(dir, "越界");
    git(dir, "switch", "--quiet", "--detach", "HEAD");
    const bad = runBin("check-ownership.ts", { cwd: dir, env: { PR_TITLE: "[T21] 市场指标计算" } });
    expect(bad.code).toBe(1);
    expect(bad.stdout).toContain("apps/markets/src/pages/index.astro —— 归 T24");
    const good = runBin("check-ownership.ts", {
      cwd: dir,
      env: { PR_TITLE: "[T24] A 股观测台网站" },
    });
    expect(good.stderr).toBe("");
    expect(good.code).toBe(0);
  });
});
