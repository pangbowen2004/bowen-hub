import { DurableObject } from "cloudflare:workers";
import { app } from "../app";
import type { Bindings } from "./env";

// SQLite Durable Objects are available on Free; each invocation has its own CPU budget.
// The original request is authenticated by the same app, inside this invocation.
export class PaperQaRuntime extends DurableObject<Bindings> {
  override async fetch(request: Request) {
    return app.fetch(request, this.env, {
      props: {},
      waitUntil: (promise) => this.ctx.waitUntil(promise),
      passThroughOnException: () => {},
    });
  }
}
