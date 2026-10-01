import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { cloudflareTest, readD1Migrations } from "@cloudflare/vitest-plugin";
import { defineConfig } from "vitest/config";
import { parse } from "yaml";
export default defineConfig({
  plugins: [
    cloudflareTest(async () => ({
      wrangler: { configPath: "./wrangler.jsonc" },
      miniflare: {
        bindings: {
          APP_MODE: "local",
          BETTER_AUTH_SECRET: "test-auth-secret-long-enough-for-tests",
          HUB_BOOTSTRAP_TOKEN: "test-bootstrap-token",
          AUTH_BASE_URL: "http://localhost",
          AUTH_RP_ID: "localhost",
          AUTH_TRUSTED_ORIGINS: "http://localhost",
          HUB_SERVICE_TOKEN: "test-service-token",
          GH_AUTOMATION_TOKEN: "test-dispatch-token",
          TEST_MIGRATIONS: await readD1Migrations(resolve("migrations")),
          TEST_OPENAPI: parse(
            readFileSync(resolve("../../contracts/generated/openapi.yaml"), "utf8"),
          ),
        },
      },
    })),
  ],
  test: {
    setupFiles: ["./test/setup/migrations.ts"],
    include: ["test/**/*.test.ts"],
    testTimeout: 30000,
  },
});
