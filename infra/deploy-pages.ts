import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { client } from "./cloudflare.ts";

const projects = {
  console: "bowen-console",
  markets: "bowen-market-observatory",
  papers: "bowen-paper-library",
} as const;
export function deploymentBranch(
  site: keyof typeof projects,
  target: string,
  productionBranch: string,
  live: string | undefined,
): string {
  if (target !== "preview" && target !== "production")
    throw new Error("target只支持preview或production");
  if (target === "production" && site !== "console" && live !== "true")
    throw new Error("SITES_LIVE未开启，公开站不能发布生产");
  if (target === "preview" && productionBranch === "preview")
    throw new Error("preview是已有生产分支，请根核对项目配置；未发布");
  if (!productionBranch) throw new Error("Pages缺少生产分支信息；未发布");
  return target === "preview" ? "preview" : productionBranch;
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const [site, target] = process.argv.slice(2);
    if (!site || !Object.hasOwn(projects, site))
      throw new Error("站点只支持console、markets、papers");
    const key = site as keyof typeof projects,
      project = projects[key];
    const metadata = await client().request<{ production_branch: string }>(
      `pages/projects/${project}`,
    );
    const branch = deploymentBranch(
      key,
      target ?? "preview",
      metadata.production_branch,
      process.env.SITES_LIVE,
    );
    execFileSync(
      fileURLToPath(new URL("./node_modules/.bin/wrangler", import.meta.url)),
      [
        "pages",
        "deploy",
        "dist",
        "--project-name",
        project,
        "--branch",
        branch,
        ...(site === "console" ? ["--config", "wrangler.jsonc"] : []),
      ],
      {
        cwd: fileURLToPath(new URL(`../apps/${site}`, import.meta.url)),
        stdio: "inherit",
        env: { ...process.env, CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false" },
      },
    );
  } catch (error) {
    console.error(
      error instanceof Error && !("status" in error)
        ? error.message
        : "Pages发布失败；请检查部署状态",
    );
    process.exitCode = 1;
  }
}
