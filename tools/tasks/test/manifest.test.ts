import { describe, expect, it } from "vitest";
import type { Task } from "../src/graph.ts";
import { onlyDependencySectionsChanged, ownManifestPaths } from "../src/manifest.ts";
import { fixtureTasks } from "./helpers.ts";

const tasks = fixtureTasks();

function task(id: string): Task {
  const found = tasks.find((candidate) => candidate.id === id);
  if (found === undefined) throw new Error(`没有 ${id}`);
  return found;
}

describe("自己包的依赖清单", () => {
  const existing = new Set([
    "package.json",
    "py/pyproject.toml",
    "apps/markets/package.json",
    "py/packages/hub-market/pyproject.toml",
    "py/packages/hub-providers/pyproject.toml",
  ]);
  const exists = (path: string): boolean => existing.has(path);

  it("T21 的包是 hub-market；工作区根的清单不算", () => {
    expect([...ownManifestPaths(task("T21"), exists)]).toEqual([
      "py/packages/hub-market/pyproject.toml",
    ]);
  });

  it("T24 的包是 apps/markets", () => {
    expect([...ownManifestPaths(task("T24"), exists)]).toEqual(["apps/markets/package.json"]);
  });

  it("T20 的包是 hub-providers（fixtures/tushare/** 不在任何包里）", () => {
    expect([...ownManifestPaths(task("T20"), exists)]).toEqual([
      "py/packages/hub-providers/pyproject.toml",
    ]);
  });
});

describe("只改了依赖相关的段", () => {
  const pkg = (extra: Record<string, unknown>): string =>
    JSON.stringify({
      name: "@bowen-hub/ui",
      private: true,
      scripts: { test: "vitest run" },
      ...extra,
    });

  it("package.json：增删依赖、换键的顺序都算只改依赖", () => {
    const before = pkg({ dependencies: { react: "19.0.0" } });
    expect(
      onlyDependencySectionsChanged(
        "packages/ui/package.json",
        before,
        pkg({
          dependencies: { react: "19.1.0", clsx: "2.1.1" },
          devDependencies: { vitest: "5.0.2" },
        }),
      ),
    ).toBe(true);
    const reordered = JSON.stringify({
      scripts: { test: "vitest run" },
      private: true,
      name: "@bowen-hub/ui",
    });
    expect(onlyDependencySectionsChanged("packages/ui/package.json", pkg({}), reordered)).toBe(
      true,
    );
  });

  it("package.json：改 scripts、name 或新建、删除都不算", () => {
    const before = pkg({});
    expect(
      onlyDependencySectionsChanged("x/package.json", before, pkg({ scripts: { test: "x" } })),
    ).toBe(false);
    expect(onlyDependencySectionsChanged("x/package.json", before, pkg({ name: "other" }))).toBe(
      false,
    );
    expect(onlyDependencySectionsChanged("x/package.json", undefined, before)).toBe(false);
    expect(onlyDependencySectionsChanged("x/package.json", before, undefined)).toBe(false);
    expect(onlyDependencySectionsChanged("x/package.json", before, "{ 不是 JSON")).toBe(false);
  });

  const toml = (lines: string[]): string =>
    [
      "[project]",
      'name = "hub-market"',
      'version = "0.1.0"',
      ...lines,
      "",
      '[project.entry-points."hub.commands"]',
      'market-compute = "hub_market.compute.commands"',
      "",
    ].join("\n");

  it("pyproject.toml：project.dependencies、optional-dependencies、dependency-groups、tool.uv.sources", () => {
    const before = toml(["dependencies = []"]);
    const after = [
      toml([
        'dependencies = ["polars==1.44.2", "hub-core"]',
        'optional-dependencies = { x = ["httpx"] }',
      ]),
      "[dependency-groups]",
      'dev = ["pytest"]',
      "",
      "[tool.uv.sources]",
      "hub-core = { workspace = true }",
      "",
    ].join("\n");
    expect(
      onlyDependencySectionsChanged("py/packages/hub-market/pyproject.toml", before, after),
    ).toBe(true);
  });

  it("pyproject.toml：改版本号、entry point 或工具配置都不算", () => {
    const before = toml(["dependencies = []"]);
    expect(
      onlyDependencySectionsChanged(
        "a/pyproject.toml",
        before,
        before.replace('version = "0.1.0"', 'version = "0.2.0"'),
      ),
    ).toBe(false);
    expect(
      onlyDependencySectionsChanged(
        "a/pyproject.toml",
        before,
        before.replace("market-compute", "market-x"),
      ),
    ).toBe(false);
    expect(
      onlyDependencySectionsChanged(
        "a/pyproject.toml",
        before,
        `${before}\n[tool.ruff]\nline-length = 80\n`,
      ),
    ).toBe(false);
  });
});
