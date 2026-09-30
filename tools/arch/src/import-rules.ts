// import-linter 的外层。规则写全在 py/.importlinter；这里只把“已经存在的包和模块”交给 import-linter，
// 还不存在的跳过（import-linter 遇到不存在的包或模块会直接报错），包出现后规则自动生效。
import { spawnSync } from "node:child_process";
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { delimiter, join } from "node:path";
import { fileURLToPath } from "node:url";
import { type IniSection, parseIni, serializeIni } from "./ini.ts";
import type { RunResult } from "./result.ts";

export const CONFIG_PATH = "py/.importlinter";

/** 运行 lint-imports 用真实仓库 py/ 的虚拟环境（import-linter 在它的 dev 依赖组里）。 */
const TOOLS_PROJECT = fileURLToPath(new URL("../../../py", import.meta.url));

type Layout = {
  /** 顶层包 → 所在的源码根（src 布局是 py/packages/<包>/src，平铺布局是 py/packages/<包>）。 */
  sourceRoots: Map<string, string>;
  /** 有目录却没有 __init__.py：import-linter 看不到它们，不能悄悄跳过。 */
  problems: string[];
};

/** 在 py/packages/* 与 py/apps/* 里找 import-linter 配置里列出的顶层包。 */
export function findRootPackages(root: string, names: string[]): Layout {
  const sourceRoots = new Map<string, string>();
  const problems: string[] = [];
  for (const group of ["packages", "apps"]) {
    const groupDir = join(root, "py", group);
    if (!existsSync(groupDir)) continue;
    for (const dist of readdirSync(groupDir, { withFileTypes: true })) {
      if (!dist.isDirectory()) continue;
      for (const sourceRoot of [join(groupDir, dist.name, "src"), join(groupDir, dist.name)]) {
        for (const name of names) {
          const packageDir = join(sourceRoot, name);
          if (!existsSync(packageDir) || sourceRoots.has(name)) continue;
          if (existsSync(join(packageDir, "__init__.py"))) sourceRoots.set(name, sourceRoot);
          else problems.push(`${relative(root, packageDir)} 缺少 __init__.py`);
        }
      }
    }
  }
  return { sourceRoots, problems };
}

function relative(root: string, path: string): string {
  return path.startsWith(root) ? path.slice(root.length).replace(/^\/+/, "") : path;
}

type Effective = {
  sections: IniSection[];
  rootPackages: string[];
  /** 给 PYTHONPATH 用的源码根。 */
  sourceRoots: string[];
  notes: string[];
  problems: string[];
};

/** 按现有的包和模块裁剪配置：没有的顶层包去掉；规则里的源模块都不存在就整条跳过。 */
export function effectiveConfig(root: string, sections: IniSection[]): Effective {
  const settings = sections.find((section) => section.name === "importlinter");
  if (settings === undefined) throw new Error(`${CONFIG_PATH} 里没有 [importlinter] 节`);
  const listed = settings.entries.get("root_packages") ?? [];
  const layout = findRootPackages(root, listed);
  const problems = [...layout.problems];
  const rootPackages = listed.filter((name) => layout.sourceRoots.has(name));

  const exists = (module: string): boolean => {
    const [top = "", ...rest] = module.split(".");
    const sourceRoot = layout.sourceRoots.get(top);
    if (sourceRoot === undefined) return false;
    const base = join(sourceRoot, top, ...rest);
    if (existsSync(join(base, "__init__.py")) || existsSync(`${base}.py`)) return true;
    if (existsSync(base)) problems.push(`${relative(root, base)} 缺少 __init__.py`);
    return false;
  };

  const notes: string[] = [];
  const kept: IniSection[] = [];
  for (const section of sections) {
    if (section === settings) {
      kept.push({
        name: section.name,
        entries: new Map([...section.entries, ["root_packages", rootPackages]]),
      });
      continue;
    }
    const type = section.entries.get("type")?.[0];
    const field =
      type === "forbidden" ? "source_modules" : type === "independence" ? "modules" : undefined;
    if (field === undefined) {
      kept.push(section);
      continue;
    }
    const modules = (section.entries.get(field) ?? []).filter(exists);
    const label = section.entries.get("name")?.[0] ?? section.name;
    if (modules.length < (type === "independence" ? 2 : 1)) {
      notes.push(`暂时跳过“${label}”（涉及的模块还不存在）`);
      continue;
    }
    kept.push({ name: section.name, entries: new Map([...section.entries, [field, modules]]) });
  }
  const sourceRoots = [...new Set(rootPackages.map((name) => layout.sourceRoots.get(name) ?? ""))];
  return { sections: kept, rootPackages, sourceRoots, notes, problems: [...new Set(problems)] };
}

export function runImportRules(root: string): RunResult {
  const sections = parseIni(readFileSync(join(root, CONFIG_PATH), "utf8"));
  const effective = effectiveConfig(root, sections);
  if (effective.problems.length > 0) {
    return {
      code: 1,
      output: [
        "import-linter：下面的目录缺少 __init__.py，import-linter 看不到它们：",
        ...effective.problems.map((problem) => `  ✗ ${problem}`),
      ],
    };
  }
  if (effective.rootPackages.length === 0) {
    return { code: 0, output: ["import-linter：跳过（py/packages、py/apps 下还没有 Python 包）"] };
  }

  const dir = mkdtempSync(join(tmpdir(), "bowen-hub-importlinter-"));
  try {
    const configFile = join(dir, "importlinter.ini");
    writeFileSync(configFile, serializeIni(effective.sections));
    const result = spawnSync(
      "uv",
      [
        "run",
        "--project",
        TOOLS_PROJECT,
        "--no-sync",
        "lint-imports",
        "--config",
        configFile,
        "--no-cache",
        "--no-logo",
      ],
      {
        cwd: root,
        encoding: "utf8",
        env: { ...process.env, PYTHONPATH: effective.sourceRoots.join(delimiter) },
      },
    );
    if (result.error) throw result.error;
    const lines = `${result.stdout}${result.stderr}`.trim().split("\n");
    return {
      code: result.status ?? 1,
      output: [
        `import-linter：检查 ${effective.rootPackages.join("、")}`,
        ...effective.notes.map((n) => `  ${n}`),
        ...lines,
      ],
    };
  } finally {
    rmSync(dir, { recursive: true, force: true });
  }
}
