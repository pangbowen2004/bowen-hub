// “自己包的依赖清单”（docs/11 第 4 节）：
// 包含本任务某条 owns 路径的那个包的 package.json / pyproject.toml，且只改了依赖相关的段。
// 仓库根的 package.json 和 py/pyproject.toml 是工作区根、不是某个任务的包，不算在内。
import { parse as parseToml } from "smol-toml";
import { literalBaseDir } from "./glob.ts";
import type { Task } from "./graph.ts";

const MANIFESTS = [
  { file: "package.json", workspaceRoot: "" },
  { file: "pyproject.toml", workspaceRoot: "py" },
] as const;

const PACKAGE_JSON_DEPENDENCY_KEYS = [
  "dependencies",
  "devDependencies",
  "optionalDependencies",
  "peerDependencies",
  "peerDependenciesMeta",
];

/** 本任务每条 owns 往上找最近的依赖清单（到工作区根为止，不含根）。 */
export function ownManifestPaths(task: Task, exists: (path: string) => boolean): Set<string> {
  const found = new Set<string>();
  for (const pattern of task.owns) {
    for (const { file, workspaceRoot } of MANIFESTS) {
      let dir = literalBaseDir(pattern);
      while (dir !== "" && dir !== workspaceRoot) {
        const candidate = `${dir}/${file}`;
        if (exists(candidate)) {
          found.add(candidate);
          break;
        }
        dir = dir.includes("/") ? dir.slice(0, dir.lastIndexOf("/")) : "";
      }
    }
  }
  return found;
}

/** 改动前后只差在依赖相关的段。新建或删除的清单不算。 */
export function onlyDependencySectionsChanged(
  path: string,
  before: string | undefined,
  after: string | undefined,
): boolean {
  if (before === undefined || after === undefined) return false;
  try {
    if (path.endsWith("package.json")) {
      return sameJson(withoutPackageJsonDeps(before), withoutPackageJsonDeps(after));
    }
    if (path.endsWith("pyproject.toml")) {
      return sameJson(withoutPyprojectDeps(before), withoutPyprojectDeps(after));
    }
  } catch {
    return false;
  }
  return false;
}

function withoutPackageJsonDeps(text: string): unknown {
  const data: unknown = JSON.parse(text);
  if (!isRecord(data)) return data;
  const rest: Record<string, unknown> = { ...data };
  for (const key of PACKAGE_JSON_DEPENDENCY_KEYS) delete rest[key];
  return rest;
}

/** 依赖相关：project.dependencies、project.optional-dependencies、dependency-groups、tool.uv.sources。 */
function withoutPyprojectDeps(text: string): unknown {
  const data: Record<string, unknown> = { ...parseToml(text) };
  delete data["dependency-groups"];
  if (isRecord(data.project)) {
    const project: Record<string, unknown> = { ...data.project };
    delete project.dependencies;
    delete project["optional-dependencies"];
    data.project = project;
  }
  if (isRecord(data.tool) && isRecord(data.tool.uv)) {
    const uv: Record<string, unknown> = { ...data.tool.uv };
    delete uv.sources;
    const tool: Record<string, unknown> = { ...data.tool, uv };
    // 删掉 sources 后空了的表也去掉，这样“第一次加 [tool.uv.sources]”仍算只改依赖
    if (Object.keys(uv).length === 0) delete tool.uv;
    if (Object.keys(tool).length === 0) delete data.tool;
    else data.tool = tool;
  }
  return data;
}

function sameJson(a: unknown, b: unknown): boolean {
  return JSON.stringify(canonical(a)) === JSON.stringify(canonical(b));
}

/** 对象按键排序，键的顺序不同不算改动。 */
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value instanceof Date) return value.toISOString();
  if (isRecord(value)) {
    return Object.fromEntries(
      Object.keys(value)
        .sort()
        .map((key) => [key, canonical(value[key])]),
    );
  }
  return value;
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === "object" && value !== null && !Array.isArray(value);
}
