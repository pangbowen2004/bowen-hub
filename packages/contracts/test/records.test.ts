// 真实生成的字典校验必须保留数值约束和类型，供 API 直接消费。
import { describe, expect, expectTypeOf, it } from "vitest";
import type { EvalResult as EvalResultType } from "../src/generated/types";
import { CapabilityEvals, EvalResult } from "../src/generated/zod";

const base = {
  capability: "news.brief",
  model: "fixture/fake",
  datasetVersion: "1",
  scores: { schema_valid: 1 },
  passed: true,
  at: "2026-10-01T00:00:00Z",
};
describe("数值字典的生成校验", () => {
  it("得分保留数字且结果类型可直接传 API", () => {
    const result = EvalResult.parse(base);
    expect(result.scores.schema_valid).toBe(1);
    expectTypeOf(result).toMatchTypeOf<EvalResultType>();
    expect(EvalResult.safeParse({ ...base, scores: { schema_valid: "1" } }).success).toBe(false);
    expect(EvalResult.safeParse({ ...base, scores: { schema_valid: {} } }).success).toBe(false);
  });
  it("清单阈值同样拒绝字符串，不剥掉评分器键", () => {
    const config = {
      dataset: "evals/news.brief",
      schedule: "weekly",
      thresholds: { schema_valid: 1 },
    };
    expect(CapabilityEvals.parse(config).thresholds).toEqual({ schema_valid: 1 });
    expect(
      CapabilityEvals.safeParse({ ...config, thresholds: { schema_valid: "1" } }).success,
    ).toBe(false);
  });
});
