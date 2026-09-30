// 在系统临时目录里造一棵“仓库”：拷贝真实的规则配置，再写入要检查的源码。不在仓库里留任何违规代码。
import { copyFileSync, mkdirSync, mkdtempSync, rmSync, symlinkSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

export const REPO_ROOT = fileURLToPath(new URL("../../../", import.meta.url));

const created: string[] = [];

export function tree(files: Record<string, string>, links: Record<string, string> = {}): string {
  const root = mkdtempSync(join(tmpdir(), "bowen-hub-arch-"));
  created.push(root);
  for (const config of [".dependency-cruiser.cjs", "py/.importlinter"]) {
    mkdirSync(dirname(join(root, config)), { recursive: true });
    copyFileSync(join(REPO_ROOT, config), join(root, config));
  }
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    writeFileSync(join(root, path), content);
  }
  for (const [path, target] of Object.entries(links)) {
    mkdirSync(dirname(join(root, path)), { recursive: true });
    symlinkSync(target, join(root, path));
  }
  return root;
}

export function cleanup(): void {
  for (const dir of created.splice(0)) rmSync(dir, { recursive: true, force: true });
}
