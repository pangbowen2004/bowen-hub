import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { detectAreas } from "../src/changes.ts";
import { commitAll, git, initRepo, removeDir, runBin, tempDir, writeFiles } from "./helpers.ts";

describe("改动区域", () => {
  it("智能平面：能力清单、提示词、评测集、模型档位、两边的运行时", () => {
    for (const path of [
      "capabilities/news.brief.yaml",
      "prompts/news_brief.md",
      "evals/news.brief/cases.yaml",
      "config/llm.yaml",
      "packages/ai/src/runtime.ts",
      "py/packages/hub-ai/src/hub_ai/runtime.py",
    ]) {
      expect(detectAreas([path])).toEqual({ ai: true, sites: false });
    }
  });

  it("两个公开站", () => {
    expect(detectAreas(["apps/markets/src/pages/index.astro"])).toEqual({ ai: false, sites: true });
    expect(detectAreas(["apps/papers/astro.config.mjs"])).toEqual({ ai: false, sites: true });
  });

  it("其他改动两步都不跑", () => {
    expect(detectAreas(["config/market.yaml", "apps/console/src/main.tsx", "mise.toml"])).toEqual({
      ai: false,
      sites: false,
    });
    expect(detectAreas([])).toEqual({ ai: false, sites: false });
  });
});

describe("ci:changes 命令行", () => {
  const created: string[] = [];
  afterEach(() => {
    for (const dir of created.splice(0)) removeDir(dir);
  });

  it("写出 GitHub Actions 的步骤输出", () => {
    const repo = initRepo();
    const out = tempDir("out");
    created.push(repo, out);
    git(repo, "switch", "--quiet", "-c", "task/T33-papers-site");
    writeFiles(repo, { "apps/papers/src/pages/index.astro": "---\n---\n" });
    commitAll(repo, "论文站首页");
    const outputFile = join(out, "github-output");
    const result = runBin("ci-changes.ts", { cwd: repo, env: { GITHUB_OUTPUT: outputFile } });
    expect(result.code).toBe(0);
    expect(readFileSync(outputFile, "utf8")).toBe("ai=false\nsites=true\n");
  });
});
