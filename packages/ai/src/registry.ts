import * as validators from "@bowen-hub/contracts/zod";
import type { ZodType } from "zod";
import { registryData } from "./generated/registry";
export interface Capability {
  id: string;
  version: number;
  summary: string;
  owner: string;
  runtime: "python" | "typescript";
  tier: "fast" | "balanced" | "frontier";
  autonomy: "L0" | "L1" | "L2";
  prompt: string;
  io: { input: string; output: string };
  limits: { maxInputTokens: number; maxOutputTokens: number; timeoutSec: number };
  checks: string[];
  fallback: string;
  params?: Record<string, unknown>;
  evals: { dataset: string; schedule?: string; thresholds: Record<string, number> };
}
export interface LlmConfig {
  gateway: { baseUrl: string };
  tiers: Record<string, { model: string; reasoning: string }>;
  candidates: string[];
  defaults: { timeoutSec: number; maxRetries: number };
  prices: Record<string, { input: number; cachedInput: number; output: number }>;
  monthlyBudgetUsd: number;
}
export type Schema = Record<string, unknown>;
export interface Registry {
  capabilities: Record<string, Capability>;
  prompts: Record<string, string>;
  llm: LlmConfig;
  schemas: Record<string, Schema>;
  adviceWords: string[];
}
export const registry = registryData as Registry;
export function validator(name: string): ZodType {
  const schemas = validators as unknown as Record<string, ZodType>;
  // TypeSpec 模型名直接对应生成 Zod 导出。
  const found = schemas[name];
  if (!found) throw new Error(`未生成契约校验器：${name}`);
  return found;
}
export function expandSchema(
  schema: Schema,
  schemas: Record<string, Schema>,
  seen = new Set<string>(),
): Schema {
  function expand(value: unknown): unknown {
    if (Array.isArray(value)) return value.map(expand);
    if (!value || typeof value !== "object") return value;
    const node = value as Schema;
    const ref = node.$ref;
    if (typeof ref === "string" && ref.endsWith(".json") && !seen.has(ref)) {
      const target = schemas[ref.slice(0, -5)];
      if (!target) throw new Error("缺少引用契约");
      return expandSchema(target, schemas, new Set([...seen, ref]));
    }
    return Object.fromEntries(Object.entries(node).map(([key, item]) => [key, expand(item)]));
  }
  return expand(schema) as Schema;
}
