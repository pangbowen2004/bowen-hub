import { env } from "cloudflare:workers";
import { serializeSigned } from "hono/utils/cookie";
import { OWNER_ID } from "../../src/lib/auth/bootstrap";
import { getAuth } from "../../src/lib/auth/runtime";

export async function authenticatedCookie(): Promise<string> {
  const auth = getAuth(env);
  const context = await auth.$context;
  let owner = await context.internalAdapter.findUserById(OWNER_ID);
  if (!owner)
    owner = await context.internalAdapter.createUser(
      {
        id: OWNER_ID,
        name: "测试使用者",
        email: "owner@hub.invalid",
        emailVerified: false,
        createdAt: new Date(),
        updatedAt: new Date(),
      },
      { method: "fixture" },
    );
  await env.DB.prepare(`INSERT OR IGNORE INTO passkey
    (id,name,public_key,user_id,credential_id,counter,device_type,backed_up,created_at)
    VALUES ('fixture-passkey','测试凭据','fixture-public-key',?,'fixture-credential',0,'singleDevice',0,?)`)
    .bind(OWNER_ID, Date.now())
    .run();
  const session = await context.internalAdapter.createSession(owner.id);
  if (!session) throw new Error("未创建测试会话");
  const cookie = context.authCookies.sessionToken;
  return (
    await serializeSigned(cookie.name, session.token, context.secret, cookie.attributes)
  ).split(";")[0]!;
}
