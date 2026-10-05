// MCP访问检查：固定使用者与当前有效授权。
// 复用T40的Better Auth实例与固定使用者，不改表、不改登录行为。
// 为什么不能只验签：Better Auth签发的是自包含JWT，没有数据库行；设置页“撤销授权”删除的是
// oauth_consent、撤销刷新令牌，已签发且未过期的JWT仍然签名有效，所以每次调用都必须再核对当前授权。
import { getDpopJktFromPayload, verifyJwsAccessToken } from "better-auth/oauth2";
import type { Bindings } from "../env";
import { OWNER_ID } from "./bootstrap";
import { getAuth } from "./runtime";

/** MCP工具所需的授权范围（runtime.ts 的 mcp 插件 scopes 之一）。 */
export const MCP_SCOPE = "mcp";

/** 令牌的受众：与 runtime.ts 里 mcp({ resource }) 的写法逐字一致，授权服务器签发时已绑定它。 */
export const mcpResource = (env: Bindings): string => `${env.AUTH_BASE_URL}/mcp`;

export type McpAccessErrorCode = "invalid_token" | "insufficient_scope";

/** 访问被拒：invalid_token 对应 401，insufficient_scope 对应 403。基础设施故障不用它，原样抛出。 */
export class McpAccessError extends Error {
  constructor(
    readonly code: McpAccessErrorCode,
    message: string,
  ) {
    super(message);
  }
}

export interface McpAccess {
  clientId: string;
  /** 令牌里的授权范围。 */
  scopes: string[];
  /** 过期时间（秒）。 */
  expiresAt: number;
  /** 签发时间（秒）。 */
  issuedAt: number;
}

/** 授权表里的 scopes 被存成“JSON 字符串里再套一层 JSON 数组”，这里同时兼容数组、单层和双层。 */
export function parseScopes(raw: unknown): string[] {
  let value: unknown = raw;
  for (let depth = 0; depth < 3 && typeof value === "string"; depth++) {
    const text: string = value;
    try {
      value = JSON.parse(text);
    } catch {
      return text.split(/\s+/).filter(Boolean);
    }
  }
  return Array.isArray(value)
    ? value.filter((scope): scope is string => typeof scope === "string")
    : [];
}

interface ConsentRow {
  id: string;
  scopes: unknown;
}

/**
 * 固定使用者对这个客户端当前仍有有效授权：
 * - 授权记录存在（设置页撤销会删除它）且包含 mcp 范围；
 * - 客户端没有被停用；
 * - 令牌绑定这条授权的唯一ID——即使同一秒内撤销再授权，旧令牌也不会复活。
 */
export async function hasCurrentMcpGrant(
  db: D1Database,
  clientId: string,
  grantIds: unknown,
): Promise<boolean> {
  if (!Array.isArray(grantIds) || !grantIds.every((id) => typeof id === "string")) return false;
  const { results } = await db
    .prepare(
      `SELECT c.id AS id, c.scopes AS scopes
       FROM oauth_consent c
       JOIN oauth_client k ON k.client_id = c.client_id
       JOIN user u ON u.id = c.user_id
       WHERE c.user_id = ?1 AND c.client_id = ?2 AND COALESCE(k.disabled, 0) = 0
       LIMIT 20`,
    )
    .bind(OWNER_ID, clientId)
    .all<ConsentRow>();
  return results.some(
    (row) => parseScopes(row.scopes).includes(MCP_SCOPE) && grantIds.includes(row.id),
  );
}

const jwksCacheKeys = new WeakMap<Bindings, object>();

/**
 * 校验MCP访问令牌：签名、签发者、受众、过期、范围，再核对固定使用者与当前授权。
 * 公钥直接从本实例取（不经公网回环请求），并沿用Better Auth的5分钟缓存与按kid重取。
 */
export async function verifyMcpAccess(env: Bindings, token: string): Promise<McpAccess> {
  const auth = getAuth(env);
  const { baseURL } = await auth.$context;
  let cacheKey = jwksCacheKeys.get(env);
  if (!cacheKey) {
    cacheKey = {};
    jwksCacheKeys.set(env, cacheKey);
  }
  let infrastructureFailure: unknown;
  let claims: Awaited<ReturnType<typeof verifyJwsAccessToken>>;
  try {
    claims = await verifyJwsAccessToken(token, {
      jwksFetch: async () => {
        try {
          return await auth.api.getJwks();
        } catch (error) {
          infrastructureFailure = error;
          throw error;
        }
      },
      jwksCacheKey: cacheKey,
      verifyOptions: { issuer: baseURL, audience: mcpResource(env), typ: "at+jwt" },
    });
  } catch {
    // 取公钥失败是服务端故障，不能当作令牌无效让客户端白白重新授权。
    if (infrastructureFailure) throw infrastructureFailure;
    throw new McpAccessError("invalid_token", "访问令牌无效或已过期");
  }
  if (claims.sub !== OWNER_ID) throw new McpAccessError("invalid_token", "令牌不属于固定使用者");
  if (getDpopJktFromPayload(claims))
    throw new McpAccessError("invalid_token", "不支持绑定了发送者的令牌");
  const clientId = typeof claims.azp === "string" ? claims.azp : undefined;
  if (!clientId || typeof claims.exp !== "number" || typeof claims.iat !== "number")
    throw new McpAccessError("invalid_token", "令牌缺少客户端或有效期");
  const scopes = typeof claims.scope === "string" ? claims.scope.split(" ").filter(Boolean) : [];
  if (!scopes.includes(MCP_SCOPE))
    throw new McpAccessError("insufficient_scope", "令牌没有 mcp 范围");
  if (!(await hasCurrentMcpGrant(env.DB, clientId, claims.hub_mcp_grants)))
    throw new McpAccessError("invalid_token", "授权已被撤销或不存在");
  return { clientId, scopes, expiresAt: claims.exp, issuedAt: claims.iat };
}
