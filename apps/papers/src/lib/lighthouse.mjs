import { spawnSync } from "node:child_process";
import { readdirSync } from "node:fs";
import { chromium } from "@playwright/test";

process.env.CHROME_PATH ??= chromium.executablePath();

const paths = readdirSync("dist", { recursive: true })
  .filter((file) => typeof file === "string" && file.endsWith("index.html"))
  .map((file) => "/" + file.replace(/index\.html$/, ""));
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "lhci",
    "autorun",
    "--config=../../lighthouserc.json",
    // CI仅审计本地静态样例；Ubuntu AppArmor不允许该Chromium使用用户命名空间。
    ...(process.env.CI && (process.env.DATA_SOURCE ?? "fixtures") === "fixtures"
      ? ["--collect.settings.chromeFlags=--no-sandbox"]
      : []),
    ...paths.map((path) => `--collect.url=http://localhost${path}`),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
