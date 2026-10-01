import { Hono, type MiddlewareHandler } from "hono";
import type { AppEnv } from "../env";
import { problem } from "../problem";
import { OWNER_ID } from "./bootstrap";
import { getAuth } from "./runtime";

export const sessionMiddleware: MiddlewareHandler<AppEnv> = async (c, next) => {
  if (!c.req.header("Cookie")) return problem(c, 401, "需要登录");
  const session = await getAuth(c.env).api.getSession({ headers: c.req.raw.headers });
  if (!session || session.user.id !== OWNER_ID || session.session.bootstrap)
    return problem(c, 401, "需要完成通行密钥登录");
  if (!["GET", "HEAD"].includes(c.req.method)) {
    const origin = c.req.header("Origin");
    if (
      !origin ||
      !c.env.AUTH_TRUSTED_ORIGINS.split(",")
        .map((value) => value.trim())
        .includes(origin)
    )
      return problem(c, 403, "写入来源无效");
  }
  const credential = await c.env.DB.prepare("SELECT id FROM passkey WHERE user_id=? LIMIT 1")
    .bind(OWNER_ID)
    .first();
  if (!credential) return problem(c, 401, "需要登记通行密钥");
  await next();
};

const registrationPaths = new Set([
  "/bootstrap",
  "/get-session",
  "/sign-out",
  "/passkey/generate-register-options",
  "/passkey/verify-registration",
]);
export const authRoutes = new Hono<AppEnv>();
authRoutes.all("*", async (c) => {
  const auth = getAuth(c.env);
  const path = c.req.path.slice("/auth".length);
  const session = c.req.header("Cookie")
    ? await auth.api.getSession({ headers: c.req.raw.headers })
    : null;
  if (session && session.user.id !== OWNER_ID) return problem(c, 403, "使用者无效");
  if (session?.session.bootstrap && !registrationPaths.has(path))
    return problem(c, 403, "首次登记会话仅能注册通行密钥");
  const registering = path === "/passkey/verify-registration" && c.req.method === "POST";
  if (session?.session.bootstrap && path.startsWith("/passkey/")) {
    const state = await c.env.DB.prepare(
      "SELECT bootstrap_completed AS completed FROM user WHERE id=?",
    )
      .bind(OWNER_ID)
      .first<{ completed: number }>();
    if (state?.completed) return problem(c, 403, "首次登记已经完成，请重新登录");
    if (registering) {
      const body = (await c.req.raw.clone().json()) as Record<string, unknown>;
      if (body.createSession === true) return problem(c, 400, "首次登记须使用当前受限会话");
      // 数据库条件更新原子选定唯一登记会话，防止并发请求分别升级。
      const claim = await c.env.DB.prepare(`UPDATE user SET bootstrap_registration_session=?
        WHERE id=? AND bootstrap_completed=0 AND (bootstrap_registration_session IS NULL OR bootstrap_registration_session=?
          OR NOT EXISTS (SELECT 1 FROM session WHERE token=user.bootstrap_registration_session AND expires_at>?))`)
        .bind(session.session.token, OWNER_ID, session.session.token, Date.now())
        .run();
      if (!claim.meta.changes) return problem(c, 403, "另一个会话正在完成首次登记");
    }
  }
  if (path === "/passkey/delete-passkey" && c.req.method === "POST") {
    if (!session || session.session.bootstrap) return problem(c, 401, "需要登录");
    const origin = c.req.header("Origin");
    if (
      !origin ||
      !c.env.AUTH_TRUSTED_ORIGINS.split(",")
        .map((value) => value.trim())
        .includes(origin)
    )
      return problem(c, 403, "写入来源无效");
    const body = (await c.req.raw.clone().json()) as { id?: unknown };
    if (typeof body.id !== "string" || !body.id) return problem(c, 400, "密钥标识无效");
    // 单条条件删除原子保留最后一把凭据，并限制固定使用者所有权。
    const deleted = await c.env.DB.prepare(`DELETE FROM passkey WHERE id=? AND user_id=?
      AND (SELECT count(*) FROM passkey WHERE user_id=?)>1`)
      .bind(body.id, OWNER_ID, OWNER_ID)
      .run();
    if (!deleted.meta.changes) return problem(c, 400, "无法删除，请保留至少一把通行密钥");
    return c.json({ status: true });
  }
  const revoking = path === "/oauth2/delete-consent" && c.req.method === "POST";
  const revokeBody = revoking ? ((await c.req.raw.clone().json()) as { id?: unknown }) : null;
  const consent =
    revoking && session && typeof revokeBody?.id === "string"
      ? await c.env.DB.prepare("SELECT client_id FROM oauth_consent WHERE id=? AND user_id=?")
          .bind(revokeBody.id, OWNER_ID)
          .first<{ client_id: string }>()
      : null;
  let response: Response;
  try {
    response = await auth.handler(c.req.raw);
  } catch (error) {
    if (registering && session?.session.bootstrap)
      await c.env.DB.prepare(
        "UPDATE user SET bootstrap_registration_session=NULL WHERE id=? AND bootstrap_completed=0 AND bootstrap_registration_session=?",
      )
        .bind(OWNER_ID, session.session.token)
        .run();
    if (error instanceof Error && error.message.includes("auth_keep_last_passkey"))
      return problem(c, 400, "请保留至少一把通行密钥");
    throw error;
  }
  if (revoking && response.ok && consent) {
    // 官方删除同意记录不会撤销刷新令牌；同步失效该使用者与客户端的全部令牌。
    await c.env.DB.batch([
      c.env.DB.prepare(
        "UPDATE oauth_refresh_token SET revoked=?, rotated_at=NULL, rotation_replay_response=NULL, rotation_replay_expires_at=NULL WHERE user_id=? AND client_id=?",
      ).bind(Date.now(), OWNER_ID, consent.client_id),
      c.env.DB.prepare("DELETE FROM oauth_access_token WHERE user_id=? AND client_id=?").bind(
        OWNER_ID,
        consent.client_id,
      ),
    ]);
  }
  if (registering && session?.session.bootstrap) {
    if (response.ok) {
      await c.env.DB.batch([
        c.env.DB.prepare("UPDATE session SET bootstrap=0 WHERE token=? AND user_id=?").bind(
          session.session.token,
          OWNER_ID,
        ),
        c.env.DB.prepare("DELETE FROM session WHERE user_id=? AND bootstrap=1 AND token<>?").bind(
          OWNER_ID,
          session.session.token,
        ),
      ]);
    } else {
      await c.env.DB.prepare(
        "UPDATE user SET bootstrap_registration_session=NULL WHERE id=? AND bootstrap_completed=0 AND bootstrap_registration_session=?",
      )
        .bind(OWNER_ID, session.session.token)
        .run();
    }
  }
  return response;
});

export const authMetadataRoutes = new Hono<AppEnv>();
authMetadataRoutes.all("*", async (c) => {
  const url = new URL(c.req.url);
  const path = url.pathname.replace(/\/auth$/, "").replace(/\/mcp$/, "");
  if (
    ![
      "/.well-known/oauth-authorization-server",
      "/.well-known/openid-configuration",
      "/.well-known/oauth-protected-resource",
    ].includes(path)
  )
    return problem(c, 404, "元数据不存在");
  if (path === "/.well-known/oauth-authorization-server")
    url.pathname = "/.well-known/oauth-authorization-server/auth";
  else if (path === "/.well-known/openid-configuration")
    url.pathname = "/auth/.well-known/openid-configuration";
  return getAuth(c.env).handler(new Request(url, { headers: c.req.raw.headers }));
});
