import { defineConfig } from "@playwright/test";

const realAuth = process.env.AUTH_E2E === "1";
export default defineConfig({
  testDir: "./e2e",
  fullyParallel: true,
  use: { baseURL: realAuth ? "http://localhost:5275" : "http://localhost:5173" },
  projects: realAuth
    ? [
        {
          name: "真实鉴权",
          testMatch: "auth/real.spec.ts",
          use: { browserName: "chromium", baseURL: "http://localhost:5275" },
        },
      ]
    : [
        {
          name: "手机",
          testIgnore: ["auth/real.spec.ts", "papers/real.spec.ts"],
          use: { viewport: { width: 390, height: 844 } },
        },
        {
          name: "平板",
          testIgnore: ["auth/real.spec.ts", "papers/real.spec.ts"],
          use: { viewport: { width: 768, height: 1024 } },
        },
        {
          name: "桌面",
          testIgnore: ["auth/real.spec.ts", "papers/real.spec.ts"],
          use: { viewport: { width: 1440, height: 900 } },
        },
        {
          name: "真实鉴权",
          testMatch: "auth/real.spec.ts",
          use: { browserName: "chromium", baseURL: "http://localhost:5275" },
        },
      ],
  webServer: [
    ...(!realAuth
      ? [
          {
            command: "pnpm exec vite preview --host 127.0.0.1 --port 5173",
            port: 5173,
            reuseExistingServer: !process.env.CI,
          },
        ]
      : []),
    {
      command: "node e2e/auth/worker.ts",
      url: "http://localhost:8787/v1/health",
      timeout: 60000,
    },
    {
      command: "pnpm exec vite --host localhost --port 5275",
      url: "http://localhost:5275",
      env: { VITE_USE_MOCKS: "0" },
    },
  ],
});
