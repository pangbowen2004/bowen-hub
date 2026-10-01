// 真实鉴权验收使用隔离的本地D1与假测试口令，不加载本机或生产密钥。
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cwd = resolve("../../services/api");
const persist = mkdtempSync(join(tmpdir(), "hub-auth-e2e-"));
const environment = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
};
const migration = spawnSync(
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
);
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
    "--local",
    "--port",
    "8787",
    "--inspector-port",
    "0",
    "--persist-to",
    persist,
    "--var",
    "APP_MODE:local",
    "--var",
    "BETTER_AUTH_SECRET:e2e-local-signature-secret-only",
    "--var",
    "HUB_BOOTSTRAP_TOKEN:e2e-bootstrap-only",
    "--var",
    "AUTH_BASE_URL:http://localhost:5275",
    "--var",
    "AUTH_RP_ID:localhost",
    "--var",
    "AUTH_TRUSTED_ORIGINS:http://localhost:5275",
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
