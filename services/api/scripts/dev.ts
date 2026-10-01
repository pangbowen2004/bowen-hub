// 本地显式覆盖APP_MODE；配置默认production，直接wrangler dev也不会误放行。

import { spawn } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

if (!existsSync(".dev.vars")) writeFileSync(".dev.vars", "APP_MODE=local\n");
const child = spawn("wrangler", ["dev", "--port", "8787", ...process.argv.slice(2)], {
  stdio: "inherit",
});
for (const signal of ["SIGINT", "SIGTERM"] as const) process.on(signal, () => child.kill(signal));
child.on("exit", (code) => process.exit(code ?? 1));
