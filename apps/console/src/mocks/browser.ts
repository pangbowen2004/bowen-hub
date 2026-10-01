import { createHandlers } from "@bowen-hub/contracts/mocks";
import { setupWorker } from "msw/browser";
import { marketHandlers } from "./markets";
export const worker = setupWorker(...marketHandlers, ...createHandlers());
