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
    ...paths.map((path) => `--collect.url=http://localhost${path}`),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
