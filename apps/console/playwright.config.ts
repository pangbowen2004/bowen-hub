import { defineConfig } from "@playwright/test";
import {
  CONSOLE_ORIGIN,
  CONSOLE_PORT,
  INSPECTOR_API_TOKEN,
  INSPECTOR_ORIGIN,
  WORKER_PORT,
} from "./e2e/mcp/shared";

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
          testIgnore: ["auth/real.spec.ts", "papers/real.spec.ts", "mcp/inspector.spec.ts"],
          use: { viewport: { width: 390, height: 844 } },
        },
        {
          name: "平板",
          testIgnore: ["auth/real.spec.ts", "papers/real.spec.ts", "mcp/inspector.spec.ts"],
          use: { viewport: { width: 768, height: 1024 } },
        },
        {
          name: "桌面",
          testIgnore: ["auth/real.spec.ts", "papers/real.spec.ts", "mcp/inspector.spec.ts"],
          use: { viewport: { width: 1440, height: 900 } },
        },
        {
          name: "真实鉴权",
          testMatch: "auth/real.spec.ts",
          use: { browserName: "chromium", baseURL: "http://localhost:5275" },
        },
        {
          name: "官方Inspector",
          testMatch: "mcp/inspector.spec.ts",
          use: { browserName: "chromium", baseURL: CONSOLE_ORIGIN },
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
    // 官方 MCP Inspector 验收：独立的 API（全新本地 D1）、控制台同源入口与 Inspector，端口和状态都与上面互不相干。
    ...(!realAuth
      ? [
          {
            command: "node e2e/mcp/worker.ts",
            url: `http://localhost:${WORKER_PORT}/v1/health`,
            timeout: 120000,
          },
          {
            command: `pnpm exec vite --host localhost --port ${CONSOLE_PORT}`,
            url: CONSOLE_ORIGIN,
            env: { VITE_USE_MOCKS: "0", HUB_LOCAL_API_URL: `http://localhost:${WORKER_PORT}` },
          },
          {
            command: "node e2e/mcp/inspector.ts",
            url: `${INSPECTOR_ORIGIN}/?MCP_INSPECTOR_API_TOKEN=${INSPECTOR_API_TOKEN}`,
            timeout: 60000,
          },
        ]
      : []),
  ],
});
