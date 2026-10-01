// 运行外部命令：输出直接打到终端，失败就抛错（生成链任何一步失败都要明确失败）。
import { spawnSync } from "node:child_process";

export function run(command: string, args: string[], cwd: string): void {
  const result = spawnSync(command, args, { cwd, stdio: "inherit" });
  if (result.error) {
    throw new Error(`无法运行 ${command}：${result.error.message}（先运行 mise run setup？）`);
  }
  if (result.status !== 0) {
    throw new Error(`${command} ${args.join(" ")} 失败，退出码 ${String(result.status)}`);
  }
}

/** 运行命令并取得标准输出；失败时返回 undefined（用于 git 这类“查询”）。 */
export function capture(command: string, args: string[], cwd: string): string | undefined {
  const result = spawnSync(command, args, { cwd, encoding: "utf8", maxBuffer: 64 * 1024 * 1024 });
  if (result.error || result.status !== 0) return undefined;
  return result.stdout;
}
