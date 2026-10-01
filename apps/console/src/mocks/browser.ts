import { createHandlers } from "@bowen-hub/contracts/mocks";
import { setupWorker } from "msw/browser";
export const worker = setupWorker(...createHandlers());
