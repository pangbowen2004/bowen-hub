import { createHandlers } from "@bowen-hub/contracts/mocks";
import { setupWorker } from "msw/browser";
import { authHandlers } from "./auth";
import { marketHandlers } from "./markets";
export const worker = setupWorker(...authHandlers, ...marketHandlers, ...createHandlers());
