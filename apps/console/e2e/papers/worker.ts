import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";

const cwd = resolve("../../services/api");
const entry = join(cwd, "test/papers-console-entry.mjs");
const persist = mkdtempSync(join(tmpdir(), "hub-papers-e2e-"));
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
const child = spawn(
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
    "8796",
    "--inspector-port",
    "0",
    "--persist-to",
    persist,
    "--var",
    "APP_MODE:local",
    "--var",
    "BETTER_AUTH_SECRET:paper-e2e-signature-secret-only",
    "--var",
    "HUB_BOOTSTRAP_TOKEN:paper-e2e-bootstrap-only",
    "--var",
    "HUB_SERVICE_TOKEN:paper-e2e-service-only",
    "--var",
    "AUTH_BASE_URL:http://localhost:5276",
    "--var",
    "AUTH_RP_ID:localhost",
    "--var",
    "AUTH_TRUSTED_ORIGINS:http://localhost:5276",
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
  child.kill("SIGTERM");
  rmSync(persist, { recursive: true, force: true });
}
process.on("SIGTERM", stop);
process.on("SIGINT", stop);
child.once("exit", (code) => {
  rmSync(persist, { recursive: true, force: true });
  process.exit(code ?? 0);
});
