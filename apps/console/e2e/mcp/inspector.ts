// 官方 MCP Inspector（Web，版本由 services/api 锁定）的隔离启动器：目录与密钥都在临时目录里，
// 不读写本机的 ~/.mcp-inspector，不打开浏览器，不使用系统钥匙串。
import { spawn } from "node:child_process";
import { mkdirSync, rmSync } from "node:fs";

// Node 原生加载 .ts；类型检查按无后缀模块解析（与 packages/ai/scripts/build.ts 相同做法）。
const shared: typeof import("./shared") = await import(
  new URL("./shared.ts", import.meta.url).href
);
rmSync(shared.INSPECTOR_HOME, { recursive: true, force: true });
mkdirSync(shared.INSPECTOR_STORAGE, { recursive: true });
const child = spawn(
  process.execPath,
  [shared.inspectorLauncher(), "--web", "--server-url", shared.MCP_URL, "--transport", "http"],
  { env: shared.inspectorEnvironment(), stdio: "inherit" },
);
function stop() {
  child.kill("SIGTERM");
  rmSync(shared.INSPECTOR_HOME, { recursive: true, force: true });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.once("exit", (code) => {
  rmSync(shared.INSPECTOR_HOME, { recursive: true, force: true });
  process.exit(code ?? 0);
});
