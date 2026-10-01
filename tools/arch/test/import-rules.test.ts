import { readFileSync, writeFileSync } from "node:fs";
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
    "client.py": "import httpx\n",
    "protocols/__init__.py": "",
    "protocols/calendar.py": "",
  }),
  ...pkg("hub-ai", "hub_ai", {
    "__init__.py": "import hub_core\nimport hub_contracts\nimport httpx\n",
  }),
  ...pkg("hub-providers", "hub_providers", { "__init__.py": "import hub_core\nimport httpx\n" }),
  ...pkg("hub-market", "hub_market", {
    "__init__.py": "",
    "common/__init__.py": "from hub_core import protocols\n",
    "compute/__init__.py":
      "import hub_core.protocols\nfrom hub_core.protocols import calendar\nimport hub_ai\nimport hub_contracts\nimport polars\n",
    "eod/__init__.py":
      "import hub_core.client\nimport hub_providers\nimport httpx\nfrom hub_market import compute\n",
    "compare/__init__.py": "import hub_providers\n",
    "compute/commands.py": "import hub_core.client\nimport hub_market.eod\nimport httpx\n",
  }),
  ...pkg("hub-newsroom", "hub_newsroom", {
    "__init__.py": "",
    "common/__init__.py": "import hub_core.protocols\n",
    "pipeline/__init__.py": "import hub_ai\n",
    "editions/__init__.py": "import hub_providers\nimport smtplib\n",
  }),
  ...pkg("hub-papers", "hub_papers", {
    "__init__.py": "",
    "common/__init__.py": "from hub_core.protocols import calendar\n",
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
    expect(
      pure?.entries.get("source_modules")?.filter((module) => !module.endsWith(".**")),
    ).toEqual([
      "hub_market.common",
      "hub_market.compute",
      "hub_market.summary",
      "hub_market.hypotheses",
      "hub_market.evolution",
      "hub_market.weekly",
      "hub_newsroom.common",
      "hub_newsroom.pipeline",
      "hub_newsroom.ai",
      "hub_papers.common",
      "hub_papers.check",
      "hub_papers.derive",
      "hub_papers.excerpt",
      "hub_papers.ai",
      "hub_papers.ids",
    ]);
    expect(pure?.entries.get("forbidden_modules")).toEqual(
      expect.arrayContaining(["hub_core", "hub_providers", "httpx", "smtplib"]),
    );
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

  it("仅有 hub-contracts 时仍把唯一根包当作列表，T01 可以独立通过", () => {
    const result = runImportRules(
      tree(pkg("hub-contracts", "hub_contracts", { "__init__.py": "" })),
    );
    expect(result.code).toBe(0);
    expect(result.output.join("\n")).toContain("import-linter：检查 hub_contracts");
    expect(result.output.join("\n")).toContain("Contracts: 0 kept, 0 broken.");
  });

  it("单项来源、禁用目标和忽略列表仍由真实检查器正确执行", () => {
    const root = tree({
      ...pkg("hub-contracts", "hub_contracts", {
        "__init__.py": "",
        "pure/__init__.py": "from hub_contracts import io\n",
        "io.py": "",
      }),
      [CONFIG_PATH]: [
        "[importlinter]",
        "root_packages =",
        "    hub_contracts",
        "",
        "[importlinter:contract:single-lists]",
        "name = 单项列表检查",
        "type = forbidden",
        "source_modules =",
        "    hub_contracts.pure",
        "forbidden_modules =",
        "    hub_contracts.io",
        "ignore_imports =",
        "    hub_contracts.pure -> hub_contracts.io",
        "",
      ].join("\n"),
    });
    const clean = runImportRules(root);
    expect(clean.code).toBe(0);
    expect(clean.output.join("\n")).toContain("Contracts: 1 kept, 0 broken.");
    writeFileSync(
      join(root, "py/packages/hub-contracts/src/hub_contracts/pure/bad.py"),
      "from hub_contracts import io\n",
    );
    const dirty = runImportRules(root);
    expect(dirty.code).toBe(1);
    expect(dirty.output.join("\n")).toContain("hub_contracts.pure.bad -> hub_contracts.io");
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
        "compute/__init__.py": "",
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

  it.each(["hub_market", "hub_newsroom", "hub_papers"])(
    "%s.common 与子模块属于纯逻辑：联网模块和非协议 hub-core 导入会被拦住",
    (module) => {
      const root = tree({
        ...allowed,
        ...pkg(module.replace("_", "-"), module, {
          "common/__init__.py": "import hub_core\n",
          "common/bad.py":
            "import hub_core.client\nimport hub_providers\nimport httpx\nimport smtplib\n",
        }),
      });
      const result = runImportRules(root);
      expect(result.code).toBe(1);
      for (const imported of ["hub_core.client", "hub_providers", "httpx", "smtplib"]) {
        expect(result.output.join("\n")).toContain(`${module}.common.bad -> ${imported}`);
      }
      expect(result.output.join("\n")).toContain(`${module}.common -> hub_core`);
    },
  );

  it.each(["import hub_core", "from hub_core import client"])(
    "既有纯逻辑模块也只能使用 hub_core.protocols：拒绝 %s",
    (statement) => {
      const result = runImportRules(
        tree({ ...allowed, ...pkg("hub-market", "hub_market", { "compute/bad.py": statement }) }),
      );
      expect(result.code).toBe(1);
      expect(result.output.join("\n")).toContain("hub_market.compute.bad -> hub_core");
    },
  );

  it.each([
    ["hub_market", "compute", "eod"],
    ["hub_market", "summary", "compare"],
    ["hub_newsroom", "pipeline", "editions"],
    ["hub_newsroom", "ai", "render"],
    ["hub_papers", "check", "pdf"],
    ["hub_papers", "derive", "ingest"],
    ["hub_papers", "excerpt", "revise"],
    ["hub_papers", "ai", "localtask"],
    ["hub_papers", "ids", "migrate"],
  ])("%s.%s 不能绕到编排模块 %s 执行 IO", (domain, source, target) => {
    const result = runImportRules(
      tree({
        ...allowed,
        ...pkg(domain.replace("_", "-"), domain, {
          [`${source}/__init__.py`]: `from ${domain}.${target} import load_data\n`,
          [`${target}/__init__.py`]: "import httpx\ndef load_data(): ...\n",
        }),
      }),
    );
    expect(result.code).toBe(1);
    expect(result.output.join("\n")).toContain(`${domain}.${source} -> ${domain}.${target}`);
  });

  it.each(["__init__.py", "logic.py"])("纯逻辑 %s 不能通过同包 commands.py 绕到编排层", (file) => {
    const result = runImportRules(
      tree({
        ...allowed,
        ...pkg("hub-market", "hub_market", {
          [`compute/${file}`]: "from hub_market.compute import commands\n",
        }),
      }),
    );
    expect(result.code).toBe(1);
    expect(result.output.join("\n")).toContain("-> hub_market.compute.commands");
  });

  it("hub-core 还不存在时纯逻辑规则照样检查其他违规", () => {
    const partial = pkg("hub-papers", "hub_papers", {
      "__init__.py": "",
      "common/__init__.py": "",
    });
    expect(runImportRules(tree(partial)).code).toBe(0);
    const result = runImportRules(
      tree({
        ...partial,
        ...pkg("hub-papers", "hub_papers", { "common/net.py": "import httpx\n" }),
      }),
    );
    expect(result.code).toBe(1);
    expect(result.output.join("\n")).toContain("hub_papers.common.net -> httpx");
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
