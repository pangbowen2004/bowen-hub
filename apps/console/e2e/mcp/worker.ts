// 官方 Inspector 验收的隔离 API：全新的本地 D1、假签名密钥与假口令；不加载本机或生产密钥。
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const shared: typeof import("./shared") = await import(
  new URL("./shared.ts", import.meta.url).href
);
const cwd = resolve("../../services/api");
// 离线验收入口：真实应用、鉴权、D1、R2 与 Durable Object，仅把模型网关和 GitHub 派发换成离线夹具。
const entry = join(cwd, "test/mcp/offline-entry.mjs");
const persist = mkdtempSync(join(tmpdir(), "hub-mcp-e2e-"));
const environment = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
};
// 能力注册表是构建生成物，Worker 打包时需要它。
const build = spawnSync("pnpm", ["--filter", "@bowen-hub/ai", "build"], {
  env: environment,
  stdio: "inherit",
});
const migration =
  build.status === 0
    ? spawnSync(
        "pnpm",
        [
          "exec",
          "wrangler",
          "d1",
          "migrations",
          "apply",
          "bowen-hub",
          "--local",
          "--persist-to",
          persist,
        ],
        { cwd, env: environment, stdio: "inherit" },
      )
    : build;
if (migration.status !== 0) {
  rmSync(persist, { recursive: true, force: true });
  process.exit(1);
}
const worker = spawn(
  "pnpm",
  [
    "exec",
    "wrangler",
    "dev",
    entry,
    "--config",
    join(cwd, "wrangler.jsonc"),
    "--local",
    "--port",
    String(shared.WORKER_PORT),
    "--inspector-port",
    "0",
    "--persist-to",
    persist,
    "--var",
    "APP_MODE:local",
    "--var",
    "BETTER_AUTH_SECRET:mcp-e2e-signature-secret-only",
    "--var",
    `HUB_BOOTSTRAP_TOKEN:${shared.BOOTSTRAP_TOKEN}`,
    "--var",
    `HUB_SERVICE_TOKEN:${shared.SERVICE_TOKEN}`,
    "--var",
    `AUTH_BASE_URL:${shared.CONSOLE_ORIGIN}`,
    "--var",
    "AUTH_RP_ID:localhost",
    "--var",
    `AUTH_TRUSTED_ORIGINS:${shared.CONSOLE_ORIGIN}`,
    "--var",
    "GH_AUTOMATION_TOKEN:offline-github-fixture",
    "--var",
    "GITHUB_REPO:contract-test/offline",
    "--var",
    "OPENAI_API_KEY:offline-model-fixture",
    "--var",
    "CLOUDFLARE_ACCOUNT_ID:offline-fixture",
    "--var",
    "AI_GATEWAY_ID:offline-fixture",
    "--log-level",
    "error",
  ],
  { cwd, env: environment, stdio: "inherit" },
);
function stop() {
  worker.kill("SIGTERM");
  rmSync(persist, { recursive: true, force: true });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
worker.once("exit", (code) => {
  rmSync(persist, { recursive: true, force: true });
  process.exit(code ?? 0);
});
