import { Problem } from "@bowen-hub/contracts/zod";

/** 区分已接线资源不存在与Hono的未挂载路由，后者不能跳过验收。 */
export async function isDeclaredResourceMissing(
  response: Response,
  responses: Record<string, unknown>,
): Promise<boolean> {
  if (
    response.status !== 404 ||
    !("404" in responses || "default" in responses) ||
    !response.headers.get("content-type")?.includes("application/problem+json")
  )
    return false;
  try {
    const parsed = Problem.safeParse(await response.clone().json());
    return parsed.success && parsed.data.status === 404 && parsed.data.detail !== "接口不存在";
  } catch {
    return false;
  }
}
