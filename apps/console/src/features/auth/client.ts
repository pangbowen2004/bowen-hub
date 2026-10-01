import { oauthProviderClient } from "@better-auth/oauth-provider/client";
import { passkeyClient } from "@better-auth/passkey/client";
import { inferAdditionalFields } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

export const authClient = createAuthClient({
  basePath: "/auth",
  plugins: [
    passkeyClient(),
    oauthProviderClient(),
    inferAdditionalFields({
      session: { bootstrap: { type: "boolean", defaultValue: false, input: false } },
    }),
  ],
});

export function safeReturn(search = location.search): string {
  const value = new URLSearchParams(search).get("returnTo") ?? "/";
  if (
    !value.startsWith("/") ||
    value.startsWith("//") ||
    [...value].some((character) => character.charCodeAt(0) <= 32 || character === "\\")
  )
    return "/";
  const base = typeof location === "undefined" ? "http://localhost" : location.origin;
  const url = new URL(value, base);
  return url.origin === base ? `${url.pathname}${url.search}${url.hash}` : "/";
}
