import type { D1Migration } from "cloudflare:test";
import type { Bindings } from "../../src/lib/env";

declare global {
  namespace Cloudflare {
    interface Env extends Bindings {
      TEST_MIGRATIONS: D1Migration[];
      TEST_OPENAPI: {
        paths: Record<
          string,
          Record<
            string,
            {
              operationId: string;
              "x-task": string;
              parameters?: { name: string; in: string; schema?: { enum?: string[] } }[];
              requestBody?: { content: Record<string, { schema: unknown }> };
            }
          >
        >;
      };
    }
  }
}
