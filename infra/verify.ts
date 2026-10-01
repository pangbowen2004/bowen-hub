import { fileURLToPath } from "node:url";
import { required } from "./cloudflare.ts";
export async function verify(env: NodeJS.ProcessEnv = process.env, fetcher: typeof fetch = fetch) {
  const base = new URL(required("HUB_API_URL", env));
  if (base.protocol !== "https:") throw new Error("线上HUB_API_URL需要HTTPS");
  const targets = [
    ["API健康", new URL("/v1/health", base).href],
    ["控制台代理健康", "https://bowen-console.pages.dev/v1/health"],
    ["控制台模拟预览", "https://preview.bowen-console.pages.dev"],
    ["市场样例预览", "https://preview.bowen-market-observatory.pages.dev"],
    ["论文样例预览", "https://preview.bowen-paper-library.pages.dev"],
  ] as const;
  for (const [name, url] of targets) {
    let response: Response;
    try {
      response = await fetcher(url, { signal: AbortSignal.timeout(30_000) });
    } catch {
      throw new Error(`${name}无法访问`);
    }
    if (response.status !== 200) throw new Error(`${name}HTTP ${response.status}`);
    if (name.endsWith("健康")) {
      let json: unknown;
      try {
        json = await response.json();
      } catch {
        throw new Error(`${name}不是JSON响应`);
      }
      if (!json || typeof json !== "object" || !("status" in json) || json.status !== "ok")
        throw new Error(`${name}正文不匹配`);
    }
    console.log(`${name}：HTTP 200`);
  }
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await verify();
  } catch (error) {
    console.error(error instanceof Error ? error.message : "线上验收失败");
    process.exitCode = 1;
  }
}
