// 官方 Inspector 验收专用的离线入口（由 apps/console/e2e/mcp/worker.ts 启动）：真实应用、鉴权、D1、R2 与 Durable Object，
// 只把模型网关与 GitHub 派发换成离线夹具（不联网、不花钱）；其余外部请求原样放行。
// 网关响应按 OpenAI 的流式格式写全（含 id、index 和单独的用量块），AI SDK 才能解析。
import worker from "../../src/index";

export { PaperQaRuntime } from "../../src/index";

const originalFetch = globalThis.fetch;
globalThis.fetch = async (...args) => {
  const input = args[0];
  const url = new URL(
    typeof input === "object" && "url" in input ? input.url : String(input),
    "http://local-fixture.invalid",
  );
  if (
    url.hostname === "api.github.com" &&
    url.pathname === "/repos/contract-test/offline/dispatches"
  )
    return new Response(null, { status: 204 });
  if (
    url.hostname === "gateway.ai.cloudflare.com" &&
    url.pathname.startsWith("/v1/offline-fixture/offline-fixture/")
  ) {
    const text = "离线模型传输夹具回答。结论须保留材料边界[论文 p.1]。";
    const chunk = (value) => `data: ${JSON.stringify({ id: "offline", ...value })}\n\n`;
    return new Response(
      [
        chunk({
          choices: [{ index: 0, delta: { role: "assistant", content: text }, finish_reason: null }],
        }),
        chunk({ choices: [{ index: 0, delta: {}, finish_reason: "stop" }] }),
        chunk({
          choices: [],
          usage: {
            prompt_tokens: 100,
            completion_tokens: 20,
            prompt_tokens_details: { cached_tokens: 0 },
          },
        }),
        "data: [DONE]\n\n",
      ].join(""),
      { headers: { "Content-Type": "text/event-stream" } },
    );
  }
  return originalFetch(...args);
};
export default worker;
