import type { GeneratedBy, PaperAskRequest } from "@bowen-hub/contracts";
import { getPrivatePapersAskUrl } from "@bowen-hub/contracts/client";
import { GeneratedBy as GeneratedBySchema } from "@bowen-hub/contracts/zod";

export interface Answer {
  answer: string;
  pages: number[];
  generatedBy?: GeneratedBy;
}

/** 提供商的 DONE 后仍须读取业务终态；只有校验通过的完整回答可保存。 */
export async function readAnswer(
  response: Response,
  update: (answer: string) => void,
): Promise<Answer> {
  if (!response.ok || !response.body) throw new Error("问答请求失败，请重试");
  const native = response.headers.get("x-paper-qa-stream") === "openai-sse-v1";
  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = "";
  let answer = "";
  let final: Answer | undefined;
  let failed = false;
  function frame(text: string) {
    const data = text
      .split("\n")
      .filter((line) => line.startsWith("data:"))
      .map((line) => line.slice(5).trimStart())
      .join("\n");
    if (!data || data === "[DONE]") return;
    const value = JSON.parse(data);
    const delta = native
      ? value.choices?.[0]?.delta?.content
      : value.type === "text-delta"
        ? value.delta
        : null;
    if (typeof delta === "string") {
      answer += delta;
      update(answer);
    }
    if (value.type === "error") failed = true;
    if (value.type === "data-paper-qa") {
      const metadata = value.data;
      if (
        metadata?.ok !== true ||
        !Array.isArray(metadata.pages) ||
        !metadata.pages.every((page: unknown) => Number.isInteger(page) && Number(page) > 0)
      ) {
        failed = true;
        return;
      }
      const provenance = GeneratedBySchema.safeParse(metadata.generatedBy);
      if (!provenance.success) {
        failed = true;
        return;
      }
      final = { answer: "", pages: metadata.pages, generatedBy: provenance.data };
    }
  }
  try {
    while (true) {
      const { done, value } = await reader.read();
      buffer += decoder.decode(value, { stream: !done });
      buffer = buffer.replace(/\r\n/g, "\n");
      let end = buffer.indexOf("\n\n");
      while (end >= 0) {
        frame(buffer.slice(0, end));
        buffer = buffer.slice(end + 2);
        end = buffer.indexOf("\n\n");
      }
      if (done) {
        if (buffer.trim()) frame(buffer);
        break;
      }
    }
    if (failed || !final || !answer.trim()) throw new Error("回答未完成或未通过校验，请重试");
    return { ...final, answer };
  } finally {
    await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
}

export async function askPaper(
  id: string,
  input: PaperAskRequest,
  update: (answer: string) => void,
  signal: AbortSignal,
) {
  const response = await fetch(getPrivatePapersAskUrl(id), {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "text/event-stream" },
    credentials: "same-origin",
    body: JSON.stringify(input),
    signal,
  });
  return readAnswer(response, update);
}
