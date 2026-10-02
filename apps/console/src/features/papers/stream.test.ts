import { describe, expect, it } from "vitest";
import { readAnswer } from "./stream";

const provenance = {
  capability: "papers.qa",
  version: 1,
  model: "fixture/fake",
  at: "2026-10-02T00:00:00Z",
};
const event = (value: unknown) => `data: ${JSON.stringify(value)}\r\n\r\n`;
const meta = (ok = true) =>
  event({ type: "data-paper-qa", data: { ok, pages: [2], generatedBy: provenance } });
function response(text: string, native = false) {
  const bytes = new TextEncoder().encode(text);
  return new Response(
    new ReadableStream({
      start(controller) {
        // 故意逐字节切开中文与 CRLF，验证网络分块。
        for (const byte of bytes) controller.enqueue(new Uint8Array([byte]));
        controller.close();
      },
    }),
    { headers: native ? { "x-paper-qa-stream": "openai-sse-v1" } : {} },
  );
}
describe("论文问答的实际流协议", () => {
  it("提供商DONE之后仍读取业务校验和出处", async () => {
    const updates: string[] = [];
    const result = await readAnswer(
      response(
        event({ choices: [{ delta: { content: "中文回答" } }] }) + "data: [DONE]\r\n\r\n" + meta(),
        true,
      ),
      (value) => updates.push(value),
    );
    expect(updates).toEqual(["中文回答"]);
    expect(result).toEqual({ answer: "中文回答", pages: [2], generatedBy: provenance });
  });
  it("兼容能力运行时SDK消息格式", async () => {
    expect(
      (await readAnswer(response(event({ type: "text-delta", delta: "原文" }) + meta()), () => {}))
        .answer,
    ).toBe("原文");
  });
  it.each([
    "",
    meta(false),
    meta().replace('"pages":[2]', '"pages":[0]'),
    meta().replace('"generatedBy":', '"missing":'),
  ])("缺失或失败终态不能保存解释卡", async (terminal) => {
    await expect(
      readAnswer(response(event({ type: "text-delta", delta: "未确认回答" }) + terminal), () => {}),
    ).rejects.toThrow("未完成或未通过校验");
  });
});
