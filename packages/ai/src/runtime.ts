import type { AiCall } from "@bowen-hub/contracts/types";
import { type CheckContext, CheckRegistry, type CheckReport } from "./checks";
import { extractCitationPages } from "./citations";
import { expandSchema, type Registry, registry, type Schema, validator } from "./registry";
import { renderPrompt } from "./render";
export interface Usage {
  inputTokens: number;
  outputTokens: number;
  cachedInputTokens: number;
}
export interface Request {
  model: string;
  reasoning: string;
  prompt: { system: string; user: string };
  schema: Schema;
  maxInputTokens: number;
  maxOutputTokens: number;
  timeoutSec: number;
  images: (Uint8Array | string)[];
  repair: boolean;
}
export interface Response {
  output: unknown;
  usage: Usage;
}
export interface StreamResponse {
  text: AsyncIterable<string>;
  usage: Promise<Usage>;
}
export interface Adapter {
  generate(request: Request): Promise<Response>;
  stream?(request: Request): Promise<StreamResponse>;
}
export class TransportError extends Error {}
export class StructureError extends Error {
  constructor(
    public readonly usage: Usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 },
  ) {
    super("模型输出结构不合格");
  }
}
export interface Result {
  ok: boolean;
  output: Record<string, unknown> | null;
  reports: CheckReport[];
  call: AiCall;
  fallback: string;
  status: "shadow" | "draft" | "ready" | "failed";
  reason: string | null;
  rawOutput: Record<string, unknown> | null;
  schemaValid: boolean;
}
export interface RunOptions {
  runId?: string;
  totalPages?: number;
  images?: Record<number, Uint8Array | string>;
  candidate?: string;
}
export class Runtime {
  constructor(
    private readonly adapter: Adapter,
    private readonly options: {
      registry?: Registry;
      checks?: CheckRegistry;
      record?: (call: AiCall) => Promise<void>;
      sleep?: (ms: number) => Promise<void>;
    } = {},
  ) {}
  async run(
    id: string,
    inputs: Record<string, unknown>,
    options: RunOptions = {},
  ): Promise<Result> {
    return this.execute(id, inputs, options);
  }
  async stream(
    id: string,
    inputs: Record<string, unknown>,
    emit: (text: string) => Promise<void>,
    options: RunOptions = {},
  ): Promise<Result> {
    return this.execute(id, inputs, options, emit);
  }
  private async execute(
    id: string,
    inputs: Record<string, unknown>,
    options: RunOptions,
    emit?: (text: string) => Promise<void>,
  ): Promise<Result> {
    const data = this.options.registry ?? registry;
    const cap = data.capabilities[id];
    if (!cap) throw new Error("未知能力");
    const tier = data.llm.tiers[cap.tier];
    if (!tier) throw new Error("未知模型档位");
    const model = options.candidate ?? tier.model;
    const price = data.llm.prices[model];
    if (!price) throw new Error("模型没有登记单价");
    const start = Date.now();
    const at = new Date().toISOString();
    const usage: Usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
    const add = (value: Usage) => {
      usage.inputTokens += value.inputTokens;
      usage.outputTokens += value.outputTokens;
      usage.cachedInputTokens += value.cachedInputTokens;
    };
    const checks = this.options.checks ?? new CheckRegistry();
    let output: Record<string, unknown> | null = null;
    let raw: Record<string, unknown> | null = null;
    let reports: CheckReport[] = [];
    let ok = false;
    let schemaValid = false;
    let reason: string | null = null;
    try {
      validator(cap.io.input).parse(inputs);
      if (
        cap.checks.includes("pages_in_range") &&
        (options.totalPages === undefined || options.totalPages < 1)
      )
        throw new Error("缺少真实 totalPages");
      for (const name of cap.checks)
        if (!checks.has(name)) throw new Error(`领域校验未注册：${name}`);
      const inputSchema = expandSchema(data.schemas[cap.io.input] ?? {}, data.schemas);
      const attachments: (Uint8Array | string)[] = [];
      for (const [key, info] of Object.entries(inputSchema.properties ?? {}))
        if ((info as Schema)["x-image"])
          for (const page of (inputs[key] ?? []) as number[]) {
            const image = options.images?.[page];
            if (image === undefined) throw new Error("图片页码缺少对应附件");
            attachments.push(image);
          }
      const prompt = renderPrompt(data.prompts[id] ?? "", inputs);
      const schema = expandSchema(data.schemas[cap.io.output] ?? {}, data.schemas);
      const request: Request = {
        model,
        reasoning: tier.reasoning,
        prompt,
        schema,
        ...cap.limits,
        images: attachments,
        repair: false,
      };
      const context: CheckContext = {
        inputs,
        schema,
        adviceWords: data.adviceWords,
        ...(options.totalPages === undefined ? {} : { totalPages: options.totalPages }),
      };
      const retry = async <T>(fn: () => Promise<T>): Promise<T> => {
        for (let n = 0; ; n++)
          try {
            return await fn();
          } catch (error) {
            if (
              !(error instanceof TransportError) ||
              n >= Math.min(2, data.llm.defaults.maxRetries)
            )
              throw error;
            await (
              this.options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
            )(1000 * 2 ** n);
          }
      };
      if (emit) {
        if (!this.adapter.stream) throw new Error("适配器没有流式入口");
        // 尚未输出内容时可重试；发送第一块后不重复流。
        let text = "";
        for (let attempt = 0; ; attempt++) {
          let emitted = false;
          try {
            const response = await this.adapter.stream(request);
            let used: Usage = { inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 };
            try {
              for await (const chunk of response.text) {
                emitted = true;
                text += chunk;
                await emit(chunk);
              }
            } finally {
              used = await response.usage;
              add(used);
            }
            if (
              used.inputTokens > request.maxInputTokens ||
              used.outputTokens > request.maxOutputTokens
            )
              throw new Error("超过 token 上限");
            break;
          } catch (error) {
            if (
              emitted ||
              !(error instanceof TransportError) ||
              attempt >= Math.min(2, data.llm.defaults.maxRetries)
            )
              throw error;
            await (
              this.options.sleep ?? ((ms) => new Promise((resolve) => setTimeout(resolve, ms)))
            )(1000 * 2 ** attempt);
          }
        }
        const pages = extractCitationPages(text, options.totalPages!);
        schemaValid = true;
        raw = validator(cap.io.output).parse({ answer: text, pages }) as Record<string, unknown>;
        const checked = checks.run(cap.checks, raw, context);
        reports = checked.reports;
        // 页码等终态元数据可修正；发出的 answer 保持逐字原样。
        output = { ...checked.output, answer: text };
      } else {
        for (let repair = 0; repair < 2; repair++) {
          try {
            const response = await retry(() => this.adapter.generate(request));
            add(response.usage);
            if (
              response.usage.inputTokens > request.maxInputTokens ||
              response.usage.outputTokens > request.maxOutputTokens
            )
              throw new Error("超过 token 上限");
            const validated = validator(cap.io.output).safeParse(response.output);
            if (!validated.success) throw new StructureError();
            schemaValid = repair === 0;
            raw = validated.data as Record<string, unknown>;
            break;
          } catch (error) {
            if (!(error instanceof StructureError)) throw error;
            add(error.usage);
            if (repair === 1) throw error;
            request.repair = true;
            request.prompt = { ...prompt, user: `${prompt.user}\n修复输出结构：schema_invalid` };
          }
        }
        if (!raw) throw new StructureError();
        const checked = checks.run(cap.checks, raw, context);
        output = checked.output;
        reports = checked.reports;
        if (reports.some((report) => report.failed)) throw new Error("确定性校验后没有可用内容");
      }
      if (!output) throw new StructureError();
      output.generatedBy = {
        capability: id,
        version: cap.version,
        model,
        at: new Date().toISOString(),
      };
      validator(cap.io.output).parse(output);
      ok = true;
    } catch (error) {
      // 不暴露上游正文、输入与验证异常；已知本层错误才保留中文原因。
      reason =
        error instanceof TransportError
          ? "模型传输失败"
          : error instanceof StructureError
            ? "结构修复后仍不合格"
            : error instanceof Error &&
                /^(缺少真实|领域校验未注册|图片页码缺少|确定性校验后|适配器没有|超过 token)/.test(
                  error.message,
                )
              ? error.message
              : "输入输出契约或执行失败";
    }
    const cached = Math.min(usage.cachedInputTokens, usage.inputTokens);
    const call: AiCall = {
      capability: id,
      version: cap.version,
      model,
      inputTokens: usage.inputTokens,
      outputTokens: usage.outputTokens,
      costUsd:
        ((usage.inputTokens - cached) * price.input +
          cached * price.cachedInput +
          usage.outputTokens * price.output) /
        1e6,
      durationMs: Date.now() - start,
      ok,
      runId: options.runId ?? null,
      at,
    };
    await this.options.record?.(call);
    const status = ok
      ? cap.autonomy === "L0"
        ? "shadow"
        : cap.autonomy === "L1"
          ? "draft"
          : "ready"
      : "failed";
    return {
      ok,
      output: ok && cap.autonomy !== "L0" ? output : null,
      reports,
      call,
      fallback: cap.fallback,
      status,
      reason,
      rawOutput: raw,
      schemaValid,
    };
  }
}
