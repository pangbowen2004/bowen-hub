import type { Bindings } from "./env";
import { ApiError } from "./problem";
/** repository_dispatch薄封装；不记录令牌、响应正文或请求正文。 */
export async function dispatch(
  env: Bindings,
  eventType: string,
  payload: Record<string, unknown>,
): Promise<void> {
  if (!env.GH_AUTOMATION_TOKEN) throw new ApiError(503, "GitHub触发令牌未配置");
  const response = await fetch(`https://api.github.com/repos/${env.GITHUB_REPO}/dispatches`, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${env.GH_AUTOMATION_TOKEN}`,
      Accept: "application/vnd.github+json",
      "X-GitHub-Api-Version": "2022-11-28",
      "User-Agent": "bowen-hub",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ event_type: eventType, client_payload: payload }),
  });
  if (!response.ok) throw new ApiError(502, "GitHub任务触发失败");
}
