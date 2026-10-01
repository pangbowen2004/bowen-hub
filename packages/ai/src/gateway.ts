import { createOpenAI } from "@ai-sdk/openai";
import {
  generateObject,
  jsonSchema,
  type LanguageModel,
  type LanguageModelUsage,
  NoObjectGeneratedError,
  streamText,
} from "ai";
import type { LlmConfig } from "./registry";
import {
  type Adapter,
  type Request,
  type Response,
  type StreamResponse,
  StructureError,
  TransportError,
  type Usage,
} from "./runtime";

function usage(value: LanguageModelUsage): Usage {
  return {
    inputTokens: value.inputTokens ?? 0,
    outputTokens: value.outputTokens ?? 0,
    cachedInputTokens: value.inputTokenDetails.cacheReadTokens ?? 0,
  };
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
  const options = (request: Request) => ({
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
    maxOutputTokens: request.maxOutputTokens,
    maxRetries: 0,
    abortSignal: AbortSignal.timeout(request.timeoutSec * 1000),
    providerOptions: { openai: { reasoningEffort: request.reasoning } },
  });
  return {
    async generate(request: Request): Promise<Response> {
      try {
        const result = await generateObject({
          ...options(request),
          schema: jsonSchema<Record<string, unknown>>(request.schema),
        });
        if ((result.usage.inputTokens ?? 0) > request.maxInputTokens)
          throw new StructureError(usage(result.usage));
        return { output: result.object, usage: usage(result.usage) };
      } catch (error) {
        if (NoObjectGeneratedError.isInstance(error))
          throw new StructureError(error.usage ? usage(error.usage) : undefined);
        if (error instanceof StructureError) throw error;
        throw new TransportError("网关请求失败");
      }
    },
    async stream(request: Request): Promise<StreamResponse> {
      const result = streamText({ ...options(request), onError: () => {} });
      const text = (async function* () {
        try {
          for await (const chunk of result.textStream) yield chunk;
        } catch {
          throw new TransportError("网关流失败");
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
