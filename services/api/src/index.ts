import { app } from "./app";
import type { Bindings } from "./lib/env";

export { PaperQaRuntime } from "./lib/paper-qa-object";

export default {
  fetch(request: Request, env: Bindings, ctx: ExecutionContext) {
    const path = new URL(request.url).pathname;
    if (
      request.method === "POST" &&
      /^\/v1\/papers\/[^/]+\/ask$/.test(path) &&
      env.PAPER_QA_RUNTIME
    ) {
      // 每个回答用独立对象，避免串行阻塞其他读者。
      const id = env.PAPER_QA_RUNTIME.idFromName(crypto.randomUUID());
      return env.PAPER_QA_RUNTIME.get(id).fetch(request);
    }
    return app.fetch(request, env, ctx);
  },
};
