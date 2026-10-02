// 仅隔离离线验收：真实API/鉴权/D1/R2，外部模型与GitHub由明确夹具替代。
import worker from "../src/index";

export { PaperQaRuntime } from "../src/index";

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
    const data = (value) => `data: ${JSON.stringify(value)}\n\n`;
    return new Response(
      `${data({ choices: [{ delta: { content: text }, finish_reason: null }] })}${data({ choices: [{ delta: {}, finish_reason: "stop" }], usage: { prompt_tokens: 100, completion_tokens: 20, prompt_tokens_details: { cached_tokens: 0 } } })}data: [DONE]\n\n`,
      { headers: { "Content-Type": "text/event-stream" } },
    );
  }
  return originalFetch(...args);
};
export default worker;
