// 原生传输回放证明真流到达与末态校验，不能作为Cloudflare CPU证据。
import { env } from "cloudflare:workers";
import { beforeEach, expect, it, vi } from "vitest";
import { prepare, response } from "../../src/modules/papers/qa";
import { nativeResponse, parseSse } from "../../src/modules/papers/qa-native";

const frame = (value: unknown) => `data: ${JSON.stringify(value)}\n\n`;
const delta = (text: string) =>
  frame({ choices: [{ delta: { content: text }, finish_reason: null }] });
const end = (tokens = 3000) =>
  `${frame({
    choices: [{ delta: {}, finish_reason: "stop" }],
    usage: {
      prompt_tokens: 100,
      completion_tokens: tokens,
      prompt_tokens_details: { cached_tokens: 20 },
    },
  })}data: [DONE]\n\n`;
beforeEach(async () => {
  await env.DB.prepare("DELETE FROM papers").run();
  await env.DB.prepare("DELETE FROM ai_calls").run();
  await env.DB.prepare(
    "INSERT INTO papers(id,visibility,review,reading_depth,spaces,updated_at,summary,doc) VALUES(?,?,?,?,?,?,?,?)",
  )
    .bind(
      "native",
      "private",
      "passed",
      "R1",
      "[]",
      "2026-10-02",
      "{}",
      JSON.stringify({
        guide: { article: "导读" },
        evidence: { claims: [{ id: "c1", claim: "结果", kind: "result", pdfPage: 2 }] },
        structure: { pageCount: 2 },
        privateIgnored: "无关大文档".repeat(20000),
      }),
    )
    .run();
  await env.FILES.put("papers/native/pages.txt", "=== p.1 ===\n方法\n=== p.2 ===\n结果");
  await env.FILES.delete("papers/native/pages.jsonl");
});
it("原生字节第一片先到，末态才给校验页码/真实用量且原回答不删改", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const upstream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const spy = vi.spyOn(globalThis, "fetch").mockImplementation(async (_url, init) => {
    const req = JSON.parse(String(init?.body));
    expect(req.model).toBe("openai/gpt-6-luna");
    expect(req.max_completion_tokens).toBe(3000);
    expect(req.max_tokens).toBeUndefined();
    expect(req.reasoning_effort).toBe("medium");
    expect(req.stream_options).toEqual({ include_usage: true });
    expect(init?.signal).toBeInstanceOf(AbortSignal);
    return new Response(upstream, { headers: { "Content-Type": "text/event-stream" } });
  });
  try {
    const res = await response({ ...env, OPENAI_API_KEY: "fixture" }, "native", "问题");
    expect(res.headers.get("x-paper-qa-stream")).toBe("openai-sse-v1");
    expect(res.headers.has("x-vercel-ai-ui-message-stream")).toBe(false);
    const reader = res.body?.getReader();
    if (!reader) throw new Error("响应没有流");
    const first = delta("原文事实[论文 p.2]，错误[论文 p.99]");
    controller.enqueue(new TextEncoder().encode(first));
    const part = await reader.read();
    expect(new TextDecoder().decode(part.value)).toBe(first);
    expect(await env.DB.prepare("SELECT count(*) AS n FROM ai_calls").first()).toMatchObject({
      n: 0,
    });
    controller.enqueue(new TextEncoder().encode(end()));
    controller.close();
    let tail = "";
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      tail += new TextDecoder().decode(part.value);
    }
    expect(tail).toContain("event: paper-qa");
    const metadata = JSON.parse(tail.split("event: paper-qa\ndata: ")[1]?.trim() ?? "null");
    expect(metadata.data).toMatchObject({
      pages: [2],
      ok: true,
      generatedBy: { capability: "papers.qa", version: 2 },
    });
    expect(metadata.data.validation[0].changes.length).toBeGreaterThan(0);
    expect(
      await env.DB.prepare("SELECT input_tokens,output_tokens,ok FROM ai_calls").first(),
    ).toMatchObject({ input_tokens: 100, output_tokens: 3000, ok: 1 });
    expect(spy).toHaveBeenCalledTimes(1);
  } finally {
    spy.mockRestore();
  }
});
it.each(["missing", "limit", "truncated"])("%s流末失败不重发、不伪造用量", async (kind) => {
  const raw =
    delta("已发正文") +
    (kind === "missing"
      ? "data: [DONE]\n\n"
      : kind === "limit"
        ? end(3001)
        : end().replace("data: [DONE]\n\n", ""));
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(raw, { headers: { "Content-Type": "text/event-stream" } }));
  try {
    const rawResult = await (
      await nativeResponse({ ...env, OPENAI_API_KEY: "fixture" }, "native", "问题")
    ).text();
    expect(rawResult.startsWith(delta("已发正文"))).toBe(true);
    const meta = JSON.parse(rawResult.split("event: paper-qa\ndata: ")[1]?.trim() ?? "null");
    expect(meta.data.ok).toBe(false);
    expect(meta.data.error).toBe("这次没答上来，可以重试");
    expect(spy).toHaveBeenCalledTimes(1);
    const row = await env.DB.prepare(
      "SELECT count(*) AS n,sum(output_tokens) AS used FROM ai_calls",
    ).first();
    expect(row).toMatchObject(
      kind === "missing" ? { n: 0 } : { n: 1, used: kind === "limit" ? 3001 : 3000 },
    );
  } finally {
    spy.mockRestore();
  }
});
it("一次解析支持CRLF、真实缓存用量，拒绝缺用量或负数", () => {
  expect(parseSse((delta("事实") + end()).replace(/\n/g, "\r\n"))).toMatchObject({
    answer: "事实",
    usage: { cachedInputTokens: 20 },
    complete: true,
  });
  expect(() => parseSse(delta("事实"))).toThrow("真实用量");
  expect(() => parseSse(delta("事实") + end(-1))).toThrow("用量格式");
});
it("SQL问答投影不读大文档私人字段/JSONL，仍核对物理页元数据", async () => {
  expect((await prepare(env, "native", "问题")).totalPages).toBe(2);
  await env.DB.prepare(
    "UPDATE papers SET doc=json_set(doc,'$.structure.pageCount',3) WHERE id='native'",
  ).run();
  await expect(prepare(env, "native", "问题")).rejects.toMatchObject({ status: 422 });
});

it("客户端取消后tee继续有限读取与真实用量落库，waitUntil保留生命周期", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const upstream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(upstream, { headers: { "Content-Type": "text/event-stream" } }),
    );
  const tasks: Promise<unknown>[] = [];
  try {
    const res = await nativeResponse(
      { ...env, OPENAI_API_KEY: "fixture" },
      "native",
      "问题",
      (task) => tasks.push(task),
    );
    const reader = res.body?.getReader();
    if (!reader) throw new Error("响应没有流");
    controller.enqueue(new TextEncoder().encode(delta("事实[论文 p.2]")));
    await reader.read();
    const cancelled = reader.cancel();
    controller.enqueue(new TextEncoder().encode(end()));
    controller.close();
    await cancelled;
    expect(tasks).toHaveLength(1);
    await Promise.all(tasks);
    expect(await env.DB.prepare("SELECT count(*) AS n FROM ai_calls").first()).toMatchObject({
      n: 1,
    });
    expect(spy).toHaveBeenCalledTimes(1);
  } finally {
    spy.mockRestore();
  }
});

it("发出首片后网络中断保留正文并返回安全失败终态，不重发和不伪造用量", async () => {
  let controller!: ReadableStreamDefaultController<Uint8Array>;
  const upstream = new ReadableStream<Uint8Array>({
    start(c) {
      controller = c;
    },
  });
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(
      new Response(upstream, { headers: { "Content-Type": "text/event-stream" } }),
    );
  try {
    const res = await nativeResponse({ ...env, OPENAI_API_KEY: "fixture" }, "native", "问题");
    const reader = res.body?.getReader();
    if (!reader) throw new Error("响应没有流");
    const first = delta("已发正文");
    controller.enqueue(new TextEncoder().encode(first));
    expect(new TextDecoder().decode((await reader.read()).value)).toBe(first);
    controller.error(new Error("模拟中断"));
    let tail = "";
    for (;;) {
      const part = await reader.read();
      if (part.done) break;
      tail += new TextDecoder().decode(part.value);
    }
    const meta = JSON.parse(tail.split("event: paper-qa\ndata: ")[1]?.trim() ?? "null");
    expect(meta.data).toMatchObject({ ok: false, error: "这次没答上来，可以重试" });
    expect(spy).toHaveBeenCalledTimes(1);
    expect(await env.DB.prepare("SELECT count(*) AS n FROM ai_calls").first()).toMatchObject({
      n: 0,
    });
  } finally {
    spy.mockRestore();
  }
});

it("单遍SSE扫描保留多行data/comment/event及2228片，拒绝坏JSON", () => {
  const chunks = Array.from({ length: 2228 }, () => delta("字"));
  const multiline =
    'event: message\n: 注释\ndata: {\ndata: "choices": [{"delta": {"content": "多行"}, "finish_reason": null}]}\n\n';
  expect(parseSse(multiline + chunks.join("") + end())).toMatchObject({
    answer: `多行${"字".repeat(2228)}`,
    complete: true,
  });
  expect(parseSse(`data:\n${delta("空首行后JSON")}${end()}`).answer).toBe("空首行后JSON");
  expect(() => parseSse(`data: invalid\n\n${end()}`)).toThrow("格式无效");
  expect(() => parseSse(`data: {\ndata: invalid\n\n${end()}`)).toThrow("格式无效");
});

it("length即使用量和DONE完整仍失败，保留截断正文并记录真实3000输出用量", async () => {
  const raw = `${delta("已发截断正文[论文 p.2]")}${end().replace('"stop"', '"length"')}`;
  expect(parseSse(raw)).toMatchObject({
    answer: "已发截断正文[论文 p.2]",
    complete: false,
    usage: { inputTokens: 100, outputTokens: 3000 },
  });
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValue(new Response(raw, { headers: { "Content-Type": "text/event-stream" } }));
  try {
    const body = await (
      await nativeResponse({ ...env, OPENAI_API_KEY: "fixture" }, "native", "问题")
    ).text();
    expect(body.startsWith(raw)).toBe(true);
    const meta = JSON.parse(body.split("event: paper-qa\ndata: ")[1]?.trim() ?? "null");
    expect(meta.data).toMatchObject({
      ok: false,
      pages: [],
      generatedBy: null,
      error: "这次没答上来，可以重试",
    });
    expect(
      await env.DB.prepare("SELECT input_tokens,output_tokens,ok FROM ai_calls").first(),
    ).toMatchObject({ input_tokens: 100, output_tokens: 3000, ok: 0 });
    expect(spy).toHaveBeenCalledTimes(1);
  } finally {
    spy.mockRestore();
  }
});

it("原生问答429遵守等待后成功，正文和真实记账不重复", async () => {
  const timer = vi.spyOn(globalThis, "setTimeout");
  const spy = vi
    .spyOn(globalThis, "fetch")
    .mockResolvedValueOnce(
      Response.json(
        { error: "不应泄漏的供应商正文" },
        { status: 429, headers: { "Retry-After": "1.2" } },
      ),
    )
    .mockResolvedValueOnce(
      new Response(delta("方法[论文 p.1]") + end(20), {
        headers: { "Content-Type": "text/event-stream" },
      }),
    );
  try {
    const result = await nativeResponse({ ...env, OPENAI_API_KEY: "fixture" }, "native", "问题");
    const body = await result.text();
    expect(body).toContain('"ok":true');
    expect(body).not.toContain("不应泄漏");
    expect(spy).toHaveBeenCalledTimes(2);
    expect(timer.mock.calls.some((call) => call[1] === 1200)).toBe(true);
    expect(
      await env.DB.prepare("SELECT input_tokens,output_tokens,ok FROM ai_calls").first(),
    ).toMatchObject({ input_tokens: 100, output_tokens: 20, ok: 1 });
  } finally {
    spy.mockRestore();
    timer.mockRestore();
  }
});
