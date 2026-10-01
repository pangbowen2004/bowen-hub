import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { client, resources } from "./cloudflare.ts";
import { workerSecrets } from "./configure-worker.ts";
export const githubRequired = [
  "CLOUDFLARE_API_TOKEN",
  "CLOUDFLARE_ACCOUNT_ID",
  "AI_GATEWAY_ID",
  "HUB_API_URL",
  "OPENAI_API_KEY",
  "HUB_SERVICE_TOKEN",
  "GH_AUTOMATION_TOKEN",
];
export const githubLater = [
  "TUSHARE_TOKEN",
  "ALPACA_API_KEY_ID",
  "ALPACA_API_SECRET_KEY",
  "TIINGO_API_KEY",
  "FINNHUB_API_KEY",
  "FRED_API_KEY",
  "SEC_USER_AGENT",
  "EMAIL_FROM",
  "EMAIL_TO",
  "EMAIL_SMTP_HOST",
  "EMAIL_SMTP_PORT",
  "EMAIL_SMTP_USER",
  "EMAIL_SMTP_PASSWORD",
];
export const workerVars = [
  "GITHUB_REPO",
  "AUTH_BASE_URL",
  "AUTH_RP_ID",
  "AUTH_TRUSTED_ORIGINS",
  "CLOUDFLARE_ACCOUNT_ID",
  "AI_GATEWAY_ID",
  "APP_MODE",
];
export function missingVars(bindings: { name: string; type: string; text?: string }[]): string[] {
  return workerVars.filter(
    (name) =>
      !bindings.some(
        (binding) =>
          binding.name === name && binding.type === "plain_text" && Boolean(binding.text),
      ),
  );
}
export function missing(
  names: readonly string[],
  available: readonly { name: string }[],
): string[] {
  return names.filter((name) => !available.some((item) => item.name === name));
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const github = JSON.parse(
      execFileSync(
        "gh",
        ["secret", "list", "--repo", "pangbowen2004/bowen-hub", "--json", "name"],
        { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
      ),
    ) as { name: string }[];
    const api = client();
    const worker = await api.request<{ name: string }[]>(
      `workers/scripts/${resources.worker}/secrets`,
    );
    const settings = await api.request<{
      bindings: { name: string; type: string; text?: string }[];
    }>(`workers/scripts/${resources.worker}/settings`);
    const absentVars = missingVars(settings.bindings);
    const live = execFileSync(
      "gh",
      ["variable", "get", "SITES_LIVE", "--repo", "pangbowen2004/bowen-hub"],
      { encoding: "utf8", stdio: ["ignore", "pipe", "pipe"] },
    ).trim();
    if (live !== "false" && live !== "true") throw new Error("SITES_LIVE配置无效");
    const absentGithub = missing(githubRequired, github),
      absentWorker = missing(workerSecrets, worker);
    console.log(`GitHub缺少：${absentGithub.join("、") || "无"}`);
    console.log(`Worker缺少：${absentWorker.join("、") || "无"}`);
    console.log(`Worker普通变量缺少：${absentVars.join("、") || "无"}`);
    console.log(`SITES_LIVE：${live}`);
    console.log(
      `后续计算任务GitHub尚缺：${missing(githubLater, github).join("、") || "无"}（不阻塞T06基础部署）`,
    );
    console.log(
      worker.some((item) => item.name === "HUB_BOOTSTRAP_TOKEN")
        ? "HUB_BOOTSTRAP_TOKEN：已设置；注册后应删除"
        : "HUB_BOOTSTRAP_TOKEN：待Kevin设置（G2前）/注册后已作废；不阻塞T06",
    );
    if (absentGithub.length || absentWorker.length || absentVars.length) process.exitCode = 1;
  } catch {
    console.error("密钥名称检查失败，请根确认CLI认证与Cloudflare资源权限；未输出外部错误正文");
    process.exitCode = 1;
  }
}
