// 官方 Inspector 验收的共用常量与路径：启动器（Node 直接执行）和测试文件都读这里。
// 独立端口、假口令、临时目录，不与默认的真实鉴权验收（8787/5275）共用任何进程或数据库。
import { createRequire } from "node:module";
import { tmpdir } from "node:os";
import { dirname, join, resolve } from "node:path";

export const WORKER_PORT = 8788;
export const CONSOLE_PORT = 5277;
export const INSPECTOR_PORT = 6284;
/** Inspector 的 MCP 应用沙箱端口；显式指定，免得与本机别的 Inspector 抢默认端口。 */
export const INSPECTOR_SANDBOX_PORT = 6285;
export const CONSOLE_ORIGIN = `http://localhost:${CONSOLE_PORT}`;
export const MCP_URL = `${CONSOLE_ORIGIN}/mcp`;
export const INSPECTOR_ORIGIN = `http://127.0.0.1:${INSPECTOR_PORT}`;
/** 只用于本地隔离验收：一次性登记口令与 Inspector 本地接口令牌。 */
export const BOOTSTRAP_TOKEN = "mcp-e2e-bootstrap-only";
export const INSPECTOR_API_TOKEN = "mcp-e2e-inspector-token-only";
export const SERVICE_TOKEN = "mcp-e2e-service-only";

/** Inspector 的全部状态（OAuth 登记、令牌、会话记录）都在这个临时目录里，不碰本机的 ~/.mcp-inspector。 */
export const INSPECTOR_HOME = join(tmpdir(), "hub-mcp-e2e-inspector");
export const INSPECTOR_STORAGE = join(INSPECTOR_HOME, "storage");
export const INSPECTOR_SECRETS = join(INSPECTOR_STORAGE, "secrets.json");

/** Inspector 随 API 包安装并锁定版本（services/api 的开发依赖）；返回统一启动入口。 */
export function inspectorLauncher(): string {
  const require = createRequire(
    resolve(import.meta.dirname, "../../../../services/api/package.json"),
  );
  const root = dirname(require.resolve("@modelcontextprotocol/inspector/package.json"));
  return join(root, "clients/launcher/build/index.js");
}

/** 运行 Inspector（网页或命令行）时的环境：状态与密钥只用临时目录，不开浏览器，不用系统钥匙串。 */
export function inspectorEnvironment(): NodeJS.ProcessEnv {
  return {
    ...process.env,
    HOME: INSPECTOR_HOME,
    USERPROFILE: INSPECTOR_HOME,
    CLIENT_PORT: String(INSPECTOR_PORT),
    MCP_SANDBOX_PORT: String(INSPECTOR_SANDBOX_PORT),
    MCP_AUTO_OPEN_ENABLED: "false",
    MCP_INSPECTOR_API_TOKEN: INSPECTOR_API_TOKEN,
    MCP_STORAGE_DIR: INSPECTOR_STORAGE,
    MCP_INSPECTOR_SECRET_STORE: "file",
    MCP_INSPECTOR_SECRET_FILE: INSPECTOR_SECRETS,
  };
}
