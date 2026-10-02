// 原生SSE字节直接转发；模型结束后只解析一次，仍由共享运行时校验和记账。
import {
  type Adapter,
  type Request,
  registry,
  retryAfterMs,
  TransportError,
  type Usage,
} from "@bowen-hub/ai";
import type { Bindings } from "../../lib/env";
import { ApiError } from "../../lib/problem";
import { prepare, runtime } from "./qa";

export function parseSse(
  raw: string,
  onUsage?: (usage: Usage) => void,
): { answer: string; usage: Usage; complete: boolean } {
  const parts: string[] = [];
  let usage: Usage | undefined;
  let done = false;
  let finished = false;
  let failure = false;
  let data = "";
  let hasData = false;
  const dispatch = () => {
    if (!data) return;
    if (data === "[DONE]") {
      done = true;
      return;
    }
    let chunk: {
      error?: unknown;
      choices?: { delta?: { content?: unknown }; finish_reason?: string | null }[];
      usage?: {
        prompt_tokens: number;
        completion_tokens: number;
        prompt_tokens_details?: { cached_tokens?: number };
      };
    };
    try {
      chunk = JSON.parse(data);
    } catch {
      throw new Error("问答流格式无效");
    }
    if (!chunk || typeof chunk !== "object") throw new Error("问答流格式无效");
    if (chunk.error) failure = true;
    for (const choice of chunk.choices ?? []) {
      if (typeof choice.delta?.content === "string") parts.push(choice.delta.content);
      if (choice.finish_reason) {
        finished = true;
        if (choice.finish_reason !== "stop") failure = true;
      }
    }
    if (chunk.usage) {
      const u = chunk.usage;
      const values: [number, number, number] = [
        u.prompt_tokens,
        u.completion_tokens,
        u.prompt_tokens_details?.cached_tokens ?? 0,
      ];
      if (values.some((n) => !Number.isSafeInteger(n) || n < 0) || values[2] > values[0])
        throw new Error("问答用量格式无效");
      usage = { inputTokens: values[0], outputTokens: values[1], cachedInputTokens: values[2] };
      onUsage?.(usage);
    }
  };
  let offset = 0;
  while (offset < raw.length) {
    const newline = raw.indexOf("\n", offset);
    const end = newline < 0 ? raw.length : newline;
    const lineEnd = end > offset && raw.charCodeAt(end - 1) === 13 ? end - 1 : end;
    if (lineEnd === offset) {
      dispatch();
      data = "";
      hasData = false;
    } else if (raw.startsWith("data:", offset)) {
      const value = raw.slice(offset + 5, lineEnd).trimStart();
      data = hasData ? `${data}\n${value}` : value;
      hasData = true;
    }
    offset = end + 1;
  }
  dispatch();
  if (!usage) throw new Error("问答流缺少真实用量");
  return { answer: parts.join(""), usage, complete: done && finished && !failure };
}

export async function nativeResponse(
  env: Bindings,
  id: string,
  question: string,
  waitUntil?: (task: Promise<unknown>) => void,
): Promise<Response> {
  const p = await prepare(env, id, question);
  if (!env.OPENAI_API_KEY) throw new ApiError(503, "问答网关未配置");
  let publish!: (body: ReadableStream<Uint8Array>) => void;
  let reject!: (error: Error) => void;
  const incoming = new Promise<ReadableStream<Uint8Array>>((resolve, fail) => {
    publish = resolve;
    reject = fail;
  });
  let published = false;
  let hasUsage = false;
  const adapter: Adapter = {
    generate: async () => {
      throw new Error("原生问答只允许流");
    },
    stream: async (request: Request) => {
      const base = registry.llm.gateway.baseUrl
        .replace("{CLOUDFLARE_ACCOUNT_ID}", env.CLOUDFLARE_ACCOUNT_ID)
        .replace("{AI_GATEWAY_ID}", env.AI_GATEWAY_ID);
      const reasoning = /^openai\/(?:gpt-(?:[5-9]|[1-9]\d)(?:[.-]|$)|o[1-9](?:[.-]|$))/.test(
        request.model,
      );
      let upstream: Response;
      try {
        upstream = await fetch(`${base.replace(/\/$/, "")}/chat/completions`, {
          method: "POST",
          headers: {
            Authorization: `Bearer ${env.OPENAI_API_KEY}`,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({
            model: request.model,
            messages: [
              { role: "system", content: request.prompt.system },
              { role: "user", content: request.prompt.user },
            ],
            reasoning_effort: request.reasoning,
            ...(reasoning
              ? { max_completion_tokens: request.maxOutputTokens }
              : { max_tokens: request.maxOutputTokens }),
            stream: true,
            stream_options: { include_usage: true },
          }),
          signal: AbortSignal.timeout(request.timeoutSec * 1000),
        });
      } catch {
        throw new TransportError("问答网关请求失败");
      }
      if (
        !upstream.ok ||
        !upstream.body ||
        !upstream.headers.get("Content-Type")?.includes("text/event-stream")
      ) {
        const wait = retryAfterMs(upstream.status, upstream.headers.get("Retry-After"));
        await upstream.body?.cancel();
        throw new TransportError("问答网关请求失败", wait);
      }
      const [forward, collect] = upstream.body.tee();
      published = true;
      publish(forward);
      let actualUsage: Usage | undefined;
      const completed = new Response(collect).text().then((raw) =>
        parseSse(raw, (value) => {
          actualUsage = value;
          hasUsage = true;
        }),
      );
      // 同时挂上拒绝处理，不让缺用量/中断造成未处理Promise；不是伪造零用量。
      const used = completed.then(
        (v) => v.usage,
        (error: unknown) => {
          if (actualUsage) return actualUsage;
          throw error;
        },
      );
      void used.catch(() => {});
      return {
        text: (async function* () {
          const result = await completed;
          if (result.answer) yield result.answer;
          if (!result.complete) throw new Error("问答流未完整结束");
        })(),
        usage: used,
      };
    },
  };
  const result = runtime(env, adapter, () => hasUsage).stream(
    "papers.qa",
    { ...p.input },
    async () => {},
    { totalPages: p.totalPages },
  );
  void result.then(
    () => {
      if (!published) reject(new ApiError(502, "这次没答上来，可以重试"));
    },
    () => {
      if (!published) reject(new ApiError(500, "问答执行失败"));
    },
  );
  const source = await incoming;
  // 无transform回调的原生pipeTo只转发字节，不逐delta解析或二次编码。
  const output = new TransformStream<Uint8Array, Uint8Array>();
  const forwarding = (async () => {
    try {
      await source.pipeTo(output.writable, { preventClose: true, preventAbort: true });
    } catch {
      /* 上游中断由运行时终态标注，已发正文保持原样。 */
    }
    const tail = output.writable.getWriter();
    try {
      const final = await result;
      await tail.write(
        new TextEncoder().encode(
          `\n\nevent: paper-qa\ndata: ${JSON.stringify({
            type: "data-paper-qa",
            data: {
              pages: final.output?.pages ?? [],
              generatedBy: final.output?.generatedBy ?? null,
              validation: final.reports,
              ok: final.ok,
              error: final.ok ? null : "这次没答上来，可以重试",
            },
          })}\n\n`,
        ),
      );
      await tail.close();
    } catch {
      await tail.abort(new Error("问答执行失败"));
    }
  })().catch(() => {
    // 客户端取消后的writer拒绝不泄漏异常，后台仍由waitUntil保留记账。
  });
  waitUntil?.(forwarding);
  return new Response(output.readable, {
    headers: {
      "Content-Type": "text/event-stream; charset=utf-8",
      "Cache-Control": "no-cache",
      "x-paper-qa-stream": "openai-sse-v1",
    },
  });
}
