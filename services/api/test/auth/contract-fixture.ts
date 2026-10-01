// 仅用于临时D1中的契约随机测试；虚拟WebAuthn真实登记另行验收。
import { serializeSigned } from "hono/utils/cookie";
export async function contractFixture(secret: string) {
  const now = Date.now();
  const token = "offline-contract-session-token";
  const sql = `INSERT INTO user (id,name,email,email_verified,created_at,updated_at)
    VALUES ('owner','契约测试','owner@hub.invalid',0,${now},${now});
    INSERT INTO passkey (id,name,public_key,user_id,credential_id,counter,device_type,backed_up,created_at)
    VALUES ('contract-key','契约测试','offline-public-key','owner','offline-credential',0,'singleDevice',0,${now});
    INSERT INTO session (id,expires_at,token,created_at,updated_at,user_id,bootstrap)
    VALUES ('contract-session',${now + 3600000},'${token}',${now},${now},'owner',0);`;
  const cookie = await serializeSigned("better-auth.session_token", token, secret, {
    path: "/",
    httpOnly: true,
    sameSite: "Lax",
  });
  return { sql, cookie: cookie.split(";")[0] ?? "" };
}
