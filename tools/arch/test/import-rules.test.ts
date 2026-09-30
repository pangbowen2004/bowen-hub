import { readFileSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { CONFIG_PATH, runImportRules } from "../src/import-rules.ts";
import { parseIni, serializeIni } from "../src/ini.ts";
import { cleanup, REPO_ROOT, tree } from "./helpers.ts";

afterEach(cleanup);

/** 一个 Python 包（src 布局）：pkg("hub-core", "hub_core", { "__init__.py": "…" })。 */
function pkg(
  dist: string,
  module: string,
  files: Record<string, string>,
  group = "packages",
): Record<string, string> {
  return Object.fromEntries(
    Object.entries(files).map(([path, content]) => [
      `py/${group}/${dist}/src/${module}/${path}`,
      content,
    ]),
  );
}

// 允许的依赖（docs/01 第 7 节 + 编排者裁定：compare、pdf 是编排模块，ids 是纯逻辑模块）
const allowed: Record<string, string> = {
  ...pkg("hub-contracts", "hub_contracts", { "__init__.py": "" }),
  ...pkg("hub-core", "hub_core", {
    "__init__.py": "import hub_contracts\nimport httpx\nimport smtplib\n",
  }),
  ...pkg("hub-ai", "hub_ai", {
    "__init__.py": "import hub_core\nimport hub_contracts\nimport httpx\n",
  }),
  ...pkg("hub-providers", "hub_providers", { "__init__.py": "import hub_core\nimport httpx\n" }),
  ...pkg("hub-market", "hub_market", {
    "__init__.py": "",
    "compute/__init__.py": "import hub_core\nimport hub_ai\nimport hub_contracts\nimport polars\n",
    "eod/__init__.py": "import hub_providers\nimport httpx\nfrom hub_market import compute\n",
    "compare/__init__.py": "import hub_providers\n",
  }),
  ...pkg("hub-newsroom", "hub_newsroom", {
    "__init__.py": "",
    "pipeline/__init__.py": "import hub_ai\n",
    "editions/__init__.py": "import hub_providers\nimport smtplib\n",
  }),
  ...pkg("hub-papers", "hub_papers", {
    "__init__.py": "",
    "pdf/__init__.py": "import hub_providers\n",
    "ids/__init__.py": "import hub_contracts\n",
  }),
  ...pkg(
    "hub-cli",
    "hub_cli",
    { "__init__.py": "import hub_market\nimport hub_newsroom\nimport hub_papers\n" },
    "apps",
  ),
};

describe("py/.importlinter 的内容", () => {
  it("docs/01 第 7 节的每一条都在，纯逻辑模块按裁定补全", () => {
    const sections = parseIni(readFileSync(join(REPO_ROOT, CONFIG_PATH), "utf8"));
    expect(sections.map((section) => section.name)).toEqual([
      "importlinter",
      "importlinter:contract:hub-core",
      "importlinter:contract:hub-ai",
      "importlinter:contract:hub-providers",
      "importlinter:contract:domain-independence",
      "importlinter:contract:domain-not-cli",
      "importlinter:contract:pure-modules",
    ]);
    const pure = sections.find((section) => section.name.endsWith("pure-modules"));
    expect(pure?.entries.get("source_modules")).toEqual([
      "hub_market.compute",
      "hub_market.summary",
      "hub_market.hypotheses",
      "hub_market.evolution",
      "hub_market.weekly",
      "hub_newsroom.pipeline",
      "hub_newsroom.ai",
      "hub_papers.check",
      "hub_papers.derive",
      "hub_papers.excerpt",
      "hub_papers.ai",
      "hub_papers.ids",
    ]);
    expect(pure?.entries.get("forbidden_modules")).toEqual(["hub_providers", "httpx", "smtplib"]);
    // 读进来再写出去，内容不变
    expect(parseIni(serializeIni(sections))).toEqual(sections);
  });
});

describe("import-linter 规则", () => {
  it("还没有 Python 包：跳过", () => {
    const result = runImportRules(tree({}));
    expect(result.code).toBe(0);
    expect(result.output.join("\n")).toContain("跳过");
  });

  it("允许的依赖：通过", () => {
    const result = runImportRules(tree(allowed));
    expect(result.output.join("\n")).toContain("Contracts: 6 kept, 0 broken.");
    expect(result.code).toBe(0);
  });

  it("每条规则都能拦住违规的导入", () => {
    const root = tree({
      ...allowed,
      ...pkg("hub-core", "hub_core", { "bad.py": "import hub_ai\n" }),
      ...pkg("hub-ai", "hub_ai", { "bad.py": "import hub_providers\n" }),
      ...pkg("hub-providers", "hub_providers", { "bad.py": "import hub_market\n" }),
      ...pkg("hub-market", "hub_market", {
        "eod/bad.py": "import hub_papers\n",
        "compute/bad.py": "import httpx\n",
      }),
      ...pkg("hub-newsroom", "hub_newsroom", {
        "editions/bad.py": "import hub_cli\n",
        "ai.py": "import smtplib\n",
      }),
      ...pkg("hub-papers", "hub_papers", { "ids/bad.py": "from hub_providers import tushare\n" }),
    });
    const result = runImportRules(root);
    const output = result.output.join("\n");
    expect(result.code).toBe(1);
    expect(output).toContain("Contracts: 0 kept, 6 broken.");
    for (const text of [
      "hub_core.bad -> hub_ai",
      "hub_ai.bad -> hub_providers",
      "hub_providers.bad -> hub_market",
      "hub_market.eod.bad -> hub_papers",
      "hub_newsroom.editions.bad -> hub_cli",
      "hub_market.compute.bad -> httpx",
      "hub_newsroom.ai -> smtplib",
      "hub_papers.ids.bad -> hub_providers",
    ]) {
      expect(output).toContain(text);
    }
  });

  it("只有部分包和模块时只检查存在的，不报“模块不存在”", () => {
    const partial = {
      ...pkg("hub-core", "hub_core", { "__init__.py": "" }),
      ...pkg("hub-market", "hub_market", {
        "__init__.py": "",
        "compute/__init__.py": "import hub_core\n",
      }),
    };
    const clean = runImportRules(tree(partial));
    expect(clean.code).toBe(0);
    expect(clean.output.join("\n")).toContain("暂时跳过“hub-ai 只能依赖 hub-contracts、hub-core”");
    const dirty = runImportRules(
      tree({
        ...partial,
        ...pkg("hub-market", "hub_market", { "compute/net.py": "import httpx\n" }),
      }),
    );
    expect(dirty.code).toBe(1);
    expect(dirty.output.join("\n")).toContain("hub_market.compute.net -> httpx");
    expect(dirty.output.join("\n")).not.toContain("does not exist");
  });

  it("目录缺少 __init__.py 时报错，而不是悄悄跳过", () => {
    const result = runImportRules(
      tree({
        ...pkg("hub-market", "hub_market", {
          "__init__.py": "",
          "compute/net.py": "import httpx\n",
        }),
      }),
    );
    expect(result.code).toBe(1);
    expect(result.output.join("\n")).toContain(
      "py/packages/hub-market/src/hub_market/compute 缺少 __init__.py",
    );
  });
});
