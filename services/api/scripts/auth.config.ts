// 仅供官方CLI生成表；T40在固定入口接入真实鉴权，不在此读取任何密钥。

import { mcp } from "@better-auth/mcp";
import { passkey } from "@better-auth/passkey";
import { betterAuth } from "better-auth";
import { jwt } from "better-auth/plugins";
export const auth = betterAuth({
  baseURL: "https://bowen-console.pages.dev",
  basePath: "/auth",
  user: {
    additionalFields: {
      bootstrapCompleted: { type: "boolean", defaultValue: false, input: false },
      bootstrapRegistrationSession: { type: "string", required: false, input: false },
    },
  },
  session: {
    additionalFields: { bootstrap: { type: "boolean", defaultValue: false, input: false } },
  },
  plugins: [
    passkey(),
    jwt(),
    mcp({
      loginPage: "/login",
      consentPage: "/consent",
      resource: "https://bowen-console.pages.dev/mcp",
    }),
  ],
});
