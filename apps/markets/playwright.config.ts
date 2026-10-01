import { defineConfig } from "@playwright/test";
export default defineConfig({
  testDir: "./src/lib",
  testMatch: "**/*.spec.ts",
  fullyParallel: true,
  use: { baseURL: "http://localhost:4321" },
  projects: [
    { name: "手机", use: { viewport: { width: 390, height: 844 } } },
    { name: "桌面", use: { viewport: { width: 1440, height: 900 } } },
  ],
  webServer: {
    command: "pnpm exec astro preview --host 127.0.0.1 --port 4321",
    port: 4321,
    reuseExistingServer: !process.env.CI,
  },
});
