import { DurableObject } from "cloudflare:workers";
import { app } from "../app";
import type { Bindings } from "./env";

// 免费方案支持SQLite Durable Object，每次调用有独立CPU预算。
// 原始请求仍在本次调用内通过同一应用的完整鉴权。
export class PaperQaRuntime extends DurableObject<Bindings> {
  override async fetch(request: Request) {
    const response = await app.fetch(request, this.env, {
      props: {},
      waitUntil: (promise) => this.ctx.waitUntil(promise),
      passThroughOnException: () => {},
    });
    // 鉴权拒绝或占位处理可能没有读取RPC请求体，返回前读完，避免响应后继续读取。
    // 逐块丢弃，不累计缓冲；正常JSON处理已读完请求体，不走此分支。
    if (request.body && !request.bodyUsed) {
      const reader = request.body.getReader();
      try {
        while (!(await reader.read()).done) {}
      } finally {
        reader.releaseLock();
      }
    }
    return response;
  }
}
