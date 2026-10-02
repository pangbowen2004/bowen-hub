import { resolve } from "node:path";
import { defineConfig } from "@playwright/test";

const cwd = resolve(import.meta.dirname, "../..");
export default defineConfig({
  testDir: import.meta.dirname,
  testMatch: "real.spec.ts",
  workers: 1,
  use: { baseURL: "http://localhost:5276", browserName: "chromium" },
  webServer: [
    {
      command: "node e2e/papers/worker.ts",
      cwd,
      url: "http://localhost:8796/v1/health",
      timeout: 60000,
    },
    {
      command: "pnpm exec vite --host localhost --port 5276",
      cwd,
      url: "http://localhost:5276",
      env: { VITE_USE_MOCKS: "0", HUB_LOCAL_API_URL: "http://localhost:8796" },
    },
  ],
});
