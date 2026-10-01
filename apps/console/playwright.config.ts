import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./e2e/_setup",
  fullyParallel: true,
  use: { baseURL: "http://localhost:5173" },
  projects: [
    { name: "手机", use: { viewport: { width: 390, height: 844 } } },
    { name: "桌面", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "pnpm exec vite preview --host 127.0.0.1 --port 5173",
    port: 5173,
    reuseExistingServer: !process.env.CI,
  },
});
