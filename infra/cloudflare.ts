export const resources = {
  database: "bowen-hub",
  bucket: "bowen-hub-files",
  console: "bowen-console",
  worker: "bowen-hub-api",
  gateway: "bowen-hub",
};
export function required(name: string, env: NodeJS.ProcessEnv = process.env): string {
  const value = env[name];
  if (!value) throw new Error(`缺少环境变量：${name}`);
  return value;
}
export class CloudflareError extends Error {
  readonly status: number;
  constructor(message: string, status: number) {
    super(message);
    this.status = status;
  }
}
export class Cloudflare {
  private readonly token: string;
  readonly account: string;
  private readonly fetcher: typeof fetch;
  constructor(token: string, account: string, fetcher: typeof fetch = fetch) {
    this.token = token;
    this.account = account;
    this.fetcher = fetcher;
  }
  async request<T>(path: string, method = "GET", body?: unknown): Promise<T> {
    let response: Response;
    try {
      response = await this.fetcher(
        `https://api.cloudflare.com/client/v4/accounts/${this.account}/${path}`,
        {
          method,
          headers: { Authorization: `Bearer ${this.token}`, "Content-Type": "application/json" },
          ...(body === undefined ? {} : { body: JSON.stringify(body) }),
          signal: AbortSignal.timeout(30_000),
        },
      );
    } catch {
      throw new Error(`Cloudflare请求未完成：${method} ${path}`);
    }
    // 错误正文可能携带私人内容，仅保留状态和固定资源路径。
    if (!response.ok)
      throw new CloudflareError(
        `Cloudflare请求失败：${method} ${path} HTTP ${response.status}`,
        response.status,
      );
    let data: { success: boolean; result: T };
    try {
      data = (await response.json()) as { success: boolean; result: T };
    } catch {
      throw new Error(`Cloudflare响应格式错误：${method} ${path}`);
    }
    if (!data.success) throw new Error(`Cloudflare操作失败：${method} ${path}`);
    return data.result;
  }
}
export function client(env: NodeJS.ProcessEnv = process.env): Cloudflare {
  return new Cloudflare(
    required("CLOUDFLARE_API_TOKEN", env),
    required("CLOUDFLARE_ACCOUNT_ID", env),
  );
}
