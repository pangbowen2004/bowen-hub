import { mcp } from "@better-auth/mcp";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { drizzleAdapter } from "better-auth/adapters/drizzle";
import { jwt } from "better-auth/plugins";
import * as schema from "../../db/schema/auth";
import { database } from "../db";
import type { Bindings } from "../env";
import { bootstrapPlugin } from "./bootstrap";

export function createAuth(env: Bindings) {
  if (!env.BETTER_AUTH_SECRET) throw new Error("未配置会话签名密钥");
  const origins = env.AUTH_TRUSTED_ORIGINS.split(",")
    .map((value) => value.trim())
    .filter(Boolean);
  return betterAuth({
    baseURL: env.AUTH_BASE_URL,
    basePath: "/auth",
    secret: env.BETTER_AUTH_SECRET,
    trustedOrigins: origins,
    database: drizzleAdapter(database(env.DB), { provider: "sqlite", schema }),
    emailAndPassword: { enabled: false, disableSignUp: true },
    disabledPaths: [
      "/sign-up/email",
      "/sign-in/email",
      "/delete-user",
      "/forget-password",
      "/request-password-reset",
      "/reset-password",
    ],
    user: {
      additionalFields: {
        bootstrapCompleted: { type: "boolean", defaultValue: false, input: false },
        bootstrapRegistrationSession: { type: "string", required: false, input: false },
      },
    },
    session: {
      additionalFields: { bootstrap: { type: "boolean", defaultValue: false, input: false } },
      cookieCache: { enabled: false },
    },
    advanced: {
      useSecureCookies: new URL(env.AUTH_BASE_URL).protocol === "https:",
      defaultCookieAttributes: { httpOnly: true, sameSite: "lax", path: "/" },
    },
    plugins: [
      passkey({
        rpID: env.AUTH_RP_ID,
        rpName: "研究控制台",
        origin: origins,
        registration: { requireSession: true },
      }),
      jwt(),
      mcp({
        loginPage: "/login",
        consentPage: "/consent",
        resource: `${env.AUTH_BASE_URL}/mcp`,
        allowDynamicClientRegistration: true,
        allowUnauthenticatedClientRegistration: true,
        scopes: ["openid", "profile", "offline_access", "mcp"],
      }),
      bootstrapPlugin(env),
    ],
  });
}

const cache = new WeakMap<Bindings, ReturnType<typeof createAuth>>();
export function getAuth(env: Bindings) {
  let auth = cache.get(env);
  if (!auth) {
    auth = createAuth(env);
    cache.set(env, auth);
  }
  return auth;
}
