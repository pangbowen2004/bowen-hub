import { createOpenAI } from "@ai-sdk/openai";
import {
  APICallError,
  generateObject,
  jsonSchema,
  type LanguageModel,
  type LanguageModelUsage,
  NoObjectGeneratedError,
  streamText,
} from "ai";
import type { LlmConfig, Schema } from "./registry";
import {
  type Adapter,
  type Request,
  type Response,
  retryAfterMs,
  type StreamResponse,
  StructureError,
  TransportError,
  type Usage,
} from "./runtime";

function transport(error: unknown, message: string): TransportError {
  if (error instanceof TransportError) return error;
  return new TransportError(
    message,
    APICallError.isInstance(error)
      ? retryAfterMs(error.statusCode ?? 0, error.responseHeaders?.["retry-after"])
      : undefined,
  );
}
function usage(value: LanguageModelUsage): Usage {
  return {
    inputTokens: value.inputTokens ?? 0,
    outputTokens: value.outputTokens ?? 0,
    cachedInputTokens: value.inputTokenDetails.cacheReadTokens ?? 0,
  };
}
/** 只转换供应商传输格式；业务校验仍用生成 Zod，不把运行时注解交给模型服务。 */
export function strictOutputSchema(schema: Schema): Schema {
  const clean = (value: unknown, root = false): unknown => {
    if (Array.isArray(value)) return value.map((item) => clean(item));
    if (!value || typeof value !== "object") return value;
    const node = value as Schema;
    const result: Schema = Object.fromEntries(
      Object.entries(node)
        .filter(([key]) => !key.startsWith("x-") && !["$id", "$schema", "$comment"].includes(key))
        .map(([key, item]) => [key, clean(item)]),
    );
    if (node.properties) {
      const properties = { ...(result.properties as Record<string, Schema>) };
      if (root) delete properties.generatedBy;
      const required = (node.required ?? []) as string[];
      for (const [key, property] of Object.entries(properties))
        if (!required.includes(key) && key !== "generatedBy")
          properties[key] = { anyOf: [property, { type: "null" }] };
      result.properties = properties;
      result.required = Object.keys(properties);
      result.additionalProperties = false;
    }
    return result;
  };
  return clean(schema, true) as Schema;
}
export function createGatewayAdapter(
  config: LlmConfig,
  env: { CLOUDFLARE_ACCOUNT_ID: string; AI_GATEWAY_ID: string; OPENAI_API_KEY: string },
  modelOverride?: (name: string) => LanguageModel,
): Adapter {
  if (!env.CLOUDFLARE_ACCOUNT_ID || !env.AI_GATEWAY_ID || !env.OPENAI_API_KEY)
    throw new Error("缺少网关环境变量");
  const baseURL = config.gateway.baseUrl
    .replace("{CLOUDFLARE_ACCOUNT_ID}", env.CLOUDFLARE_ACCOUNT_ID)
    .replace("{AI_GATEWAY_ID}", env.AI_GATEWAY_ID);
  const provider = createOpenAI({ baseURL, apiKey: env.OPENAI_API_KEY });
  const options = (request: Request) => {
    // Gateway 的供应商前缀使 SDK 无法识别 OpenAI 推理模型；明确传正确预算字段。
    const prefixedReasoning = /^openai\/(?:gpt-(?:[5-9]|[1-9]\d)(?:[.-]|$)|o[1-9](?:[.-]|$))/.test(
      request.model,
    );
    return {
      model: modelOverride?.(request.model) ?? provider.chat(request.model),
      system: request.prompt.system,
      messages: [
        {
          role: "user" as const,
          content: [
            { type: "text" as const, text: request.prompt.user },
            ...request.images.map((image) => ({ type: "image" as const, image })),
          ],
        },
      ],
      maxOutputTokens: prefixedReasoning ? undefined : request.maxOutputTokens,
      maxRetries: 0,
      abortSignal: AbortSignal.timeout(request.timeoutSec * 1000),
      providerOptions: {
        openai: {
          reasoningEffort: request.reasoning,
          ...(prefixedReasoning ? { maxCompletionTokens: request.maxOutputTokens } : {}),
        },
      },
    };
  };
  return {
    async generate(request: Request): Promise<Response> {
      try {
        const result = await generateObject({
          ...options(request),
          schema: jsonSchema<Record<string, unknown>>(strictOutputSchema(request.schema)),
        });
        return { output: result.object, usage: usage(result.usage) };
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error))
          throw new StructureError(error.usage ? usage(error.usage) : undefined);
        if (error instanceof StructureError) throw error;
        throw transport(error, "网关请求失败");
      }
    },
    async stream(request: Request): Promise<StreamResponse> {
      const result = streamText({ ...options(request), onError: () => {} });
      const text = (async function* () {
        try {
          for await (const part of result.fullStream) {
            if (part.type === "error") throw transport(part.error, "网关流失败");
            if (part.type === "abort") throw new TransportError("网关流失败");
            if (part.type === "text-delta") yield part.text;
          }
        } catch (error) {
          throw transport(error, "网关流失败");
        }
      })();
      return {
        text,
        usage: Promise.resolve(result.totalUsage)
          .then(usage)
          .catch(() => ({ inputTokens: 0, outputTokens: 0, cachedInputTokens: 0 })),
      };
    },
  };
}
