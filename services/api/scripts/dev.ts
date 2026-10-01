// 本地显式覆盖APP_MODE；配置默认production，直接wrangler dev也不会误放行。

import { spawn, spawnSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

// 直接启动API时也生成能力注册表，避免依赖之前在别的入口跑过类型检查。
const build = spawnSync("pnpm", ["--filter", "@bowen-hub/ai", "build"], { stdio: "inherit" });
if (build.error || build.status !== 0) process.exit(build.status ?? 1);
if (!existsSync(".dev.vars")) writeFileSync(".dev.vars", "APP_MODE=local\n");
const child = spawn("wrangler", ["dev", "--port", "8787", ...process.argv.slice(2)], {
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
