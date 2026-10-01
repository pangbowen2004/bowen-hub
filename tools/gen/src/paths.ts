// 生成链用到的路径（都是绝对路径）。
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..", "..", "..");

export const PATHS = {
  contracts: join(ROOT, "contracts"),
  contractsGenerated: join(ROOT, "contracts", "generated"),
  openapi: join(ROOT, "contracts", "generated", "openapi.yaml"),
  schemas: join(ROOT, "contracts", "generated", "schemas"),
  tsp: join(ROOT, "contracts", "node_modules", ".bin", "tsp"),
  tsGenerated: join(ROOT, "packages", "contracts", "src", "generated"),
  tsPackageJson: join(ROOT, "packages", "contracts", "package.json"),
  pyProject: join(ROOT, "py"),
  pyGenerated: join(ROOT, "py", "packages", "hub-contracts", "src", "hub_contracts", "generated"),
  apiScripts: join(ROOT, "services", "api", "scripts"),
} as const;

/** 仓库里的相对路径（用 / 分隔），用于打印和 git。 */
export function relative(path: string): string {
  return path
    .slice(ROOT.length + 1)
    .split("\\")
    .join("/");
}
