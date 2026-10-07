import { spawnSync } from "node:child_process";
import { mkdirSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

process.env.CHROME_PATH ??= chromium.executablePath();

// 首页现在是知识宇宙，使用既有250KiB交互页预算；普通阅读页仍50KiB，性能与无障碍仍须90分。
const profile = JSON.parse(readFileSync("../../lighthouserc.json", "utf8"));
for (const rule of profile.ci.assert.assertMatrix) {
  if (rule.assertions["resource-summary:script:size"]?.[1]?.maxNumericValue === 51200) {
    rule.matchingUrlPattern =
      "^https?://[^/]+/(papers/[^/]+/(index\\.html)?|spaces/.*|about/.*|methods/.*|weekly/.*|archive/(index\\.html)?)$";
  }
}
mkdirSync(".lighthouseci", { recursive: true });
writeFileSync(".lighthouseci/papers-config.json", JSON.stringify(profile));

const paths = readdirSync("dist", { recursive: true })
  .filter((file) => typeof file === "string" && file.endsWith("index.html"))
  .map((file) => "/" + file.replace(/index\.html$/, ""));
const result = spawnSync(
  "pnpm",
  [
    "exec",
    "lhci",
    "autorun",
    "--config=.lighthouseci/papers-config.json",
    // CI仅审计本地静态样例；Ubuntu AppArmor不允许该Chromium使用用户命名空间。
    ...(process.env.CI && (process.env.DATA_SOURCE ?? "fixtures") === "fixtures"
      ? ["--collect.settings.chromeFlags=--no-sandbox"]
      : []),
    ...paths.map((path) => `--collect.url=http://localhost${path}`),
  ],
  { stdio: "inherit" },
);
process.exit(result.status ?? 1);
