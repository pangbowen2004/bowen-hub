import { createHandlers } from "@bowen-hub/contracts/mocks";
import { setupWorker } from "msw/browser";
import { authHandlers } from "./auth";
import { marketHandlers } from "./markets";
import { newsHandlers } from "./news";
export const worker = setupWorker(
  ...authHandlers,
  ...newsHandlers,
  ...marketHandlers,
  ...createHandlers(),
);
