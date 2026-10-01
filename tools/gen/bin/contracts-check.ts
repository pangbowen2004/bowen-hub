// mise run contracts:check 的入口：oasdiff 由 mise.toml 安装（github:oasdiff/oasdiff）。
import { spawnSync } from "node:child_process";
import { contractsCheck } from "../src/contracts-check.ts";

try {
  process.exitCode = contractsCheck((args) => {
    const result = spawnSync("oasdiff", args, { stdio: "inherit" });
    if (result.error)
      throw new Error(
        `无法运行 oasdiff：${result.error.message}（用 mise run contracts:check 运行，mise 会装好 oasdiff）`,
      );
    return result.status ?? 1;
  });
} catch (error) {
  console.error(`contracts:check 出错：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
