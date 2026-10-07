import { createHandlers } from "@bowen-hub/contracts/mocks";
import type { RequestHandler } from "msw";
import { setupWorker } from "msw/browser";
import { authHandlers } from "./auth";
import { marketHandlers } from "./markets";
import { newsHandlers } from "./news";

const paperModules = import.meta.glob<{ paperHandlers: RequestHandler[] }>("./papers/index.ts", {
  eager: true,
});
export const worker = setupWorker(
  ...Object.values(paperModules).flatMap((module) => module.paperHandlers),
  ...authHandlers,
  ...newsHandlers,
  ...marketHandlers,
  ...createHandlers(),
);
