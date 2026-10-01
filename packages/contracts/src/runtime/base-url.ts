// 生成的 fetch 客户端与 hooks 的基础地址（docs/08 第 3 节）。生成的代码在每个请求前调用 getBaseUrl()。
// - 控制台：同源（Pages Function 把 /v1 原样代理给 API），什么都不用配置，基础地址是空串。
// - 公开站构建、Node 脚本：调用 configureClient({ baseUrl })；没调用时读环境变量 HUB_API_URL。
//   Node 的 fetch 不接受相对地址，所以在 Node 里一定要有其中之一。
let configured: string | undefined;

export type ClientConfig = {
  /** API 的地址，不含 /v1，如 https://bowen-hub-api.<子域>.workers.dev；空串表示同源 */
  baseUrl: string;
};

export function configureClient(config: ClientConfig): void {
  configured = trimSlash(config.baseUrl);
}

export function getBaseUrl(): string {
  if (configured !== undefined) return configured;
  const env = (globalThis as { process?: { env?: Record<string, string | undefined> } }).process
    ?.env;
  return trimSlash(env?.HUB_API_URL ?? "");
}

function trimSlash(url: string): string {
  return url.replace(/\/+$/, "");
}
