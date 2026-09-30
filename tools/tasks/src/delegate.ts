// 转交给别的任务目录里的入口：入口存在就调用；不存在就说明由哪个任务提供，并按成功返回。
// mise.toml 里指向后续任务目录的命令都经过这里，这样 mise.toml 以后不用再改。
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";

export type Plan = { run: true; command: string; args: string[] } | { run: false; message: string };

export type Target = { dir: string; owner: string };

export function hasScript(root: string, dir: string, script: string): boolean {
  const file = join(root, dir, "package.json");
  if (!existsSync(file)) return false;
  const pkg: unknown = JSON.parse(readFileSync(file, "utf8"));
  if (typeof pkg !== "object" || pkg === null || !("scripts" in pkg)) return false;
  const { scripts } = pkg;
  return typeof scripts === "object" && scripts !== null && script in scripts;
}

function notWired(target: Target, script: string): string {
  return `${target.dir} 尚未接入：由 ${target.owner} 在 ${target.dir}/package.json 里提供 "${script}" script。`;
}

/** 单个包里的一次性命令：pnpm --dir <目录> run <script> [参数…]。 */
export function planScript(root: string, target: Target, script: string, args: string[]): Plan {
  if (!hasScript(root, target.dir, script)) {
    return { run: false, message: `${notWired(target, script)}跳过。` };
  }
  return { run: true, command: "pnpm", args: ["--dir", target.dir, "run", script, ...args] };
}

/** 经 Turborepo 在几个包里同时跑同名 script（先构建它们依赖的包），用于开发服务器。 */
export function planTurbo(
  root: string,
  script: string,
  targets: Target[],
): Plan & { notes: string[] } {
  const present = targets.filter((target) => hasScript(root, target.dir, script));
  const notes = targets
    .filter((target) => !present.includes(target))
    .map((target) => notWired(target, script));
  if (present.length === 0) return { run: false, message: [...notes, "跳过。"].join("\n"), notes };
  return {
    run: true,
    command: "turbo",
    args: ["run", script, ...present.map((target) => `--filter=./${target.dir}`)],
    notes,
  };
}
