import { timingSafeEqual } from "node:crypto";
import { APIError, createAuthEndpoint } from "better-auth/api";
import { setSessionCookie } from "better-auth/cookies";
import { z } from "zod";
import type { Bindings } from "../env";

export const OWNER_ID = "owner";

export function matchesToken(provided: string, expected: string | undefined): boolean {
  const left = new TextEncoder().encode(provided);
  const right = new TextEncoder().encode(expected ?? "");
  return Boolean(expected && left.length === right.length && timingSafeEqual(left, right));
}

export const bootstrapPlugin = (env: Bindings) => ({
  id: "owner-bootstrap",
  endpoints: {
    bootstrapOwner: createAuthEndpoint(
      "/bootstrap",
      { method: "POST", body: z.object({ token: z.string().min(1).max(512) }) },
      async (ctx) => {
        const origin = ctx.headers?.get("origin");
        if (
          !origin ||
          !env.AUTH_TRUSTED_ORIGINS.split(",")
            .map((value) => value.trim())
            .includes(origin)
        )
          throw new APIError("FORBIDDEN", { message: "注册来源无效" });
        if (!matchesToken(ctx.body.token, env.HUB_BOOTSTRAP_TOKEN))
          throw new APIError("UNAUTHORIZED", { message: "首次注册口令无效" });
        const now = Date.now();
        // 固定主键和条件插入共同限制并发首次登记，只创建一个使用者。
        await env.DB.prepare(
          `INSERT INTO user (id,name,email,email_verified,created_at,updated_at)
           SELECT ?,?,?,0,?,? WHERE NOT EXISTS (SELECT 1 FROM user)
           AND NOT EXISTS (SELECT 1 FROM passkey) ON CONFLICT(id) DO NOTHING`,
        )
          .bind(OWNER_ID, "使用者", "owner@hub.invalid", now, now)
          .run();
        const state = await env.DB.prepare(
          "SELECT bootstrap_completed AS completed FROM user WHERE id=?",
        )
          .bind(OWNER_ID)
          .first<{ completed: number }>();
        const credential = await env.DB.prepare("SELECT id FROM passkey LIMIT 1").first();
        const owner = await ctx.context.internalAdapter.findUserById(OWNER_ID);
        if (state?.completed || credential || !owner)
          throw new APIError("FORBIDDEN", { message: "首次注册已经完成" });
        // overrideAll 防止适配器的附加字段默认值覆盖这个受限会话标记。
        const session = await ctx.context.internalAdapter.createSession(
          OWNER_ID,
          false,
          { bootstrap: true },
          true,
        );
        if (!session) throw new APIError("INTERNAL_SERVER_ERROR", { message: "无法开始登记" });
        await setSessionCookie(ctx, { session, user: owner });
        return ctx.json({ registered: false });
      },
    ),
  },
});
