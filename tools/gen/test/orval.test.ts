import { describe, expect, it } from "vitest";
import {
  markBinarySchemas,
  normalizeRecordSchemas,
  removeZodOutputAliases,
  rewriteSchemaImports,
} from "../src/orval.ts";

describe("Orval 类型文件的导入", () => {
  it("client.schemas、hooks.schemas 都改成 ./types", () => {
    const source =
      "import type {\n  Run\n} from './client.schemas';\nimport type { Health } from './hooks.schemas';\n";
    expect(rewriteSchemaImports(source, "x.ts")).toBe(
      "import type {\n  Run\n} from './types';\nimport type { Health } from './types';\n",
    );
  });

  it("找不到对类型文件的导入就报错（Orval 输出格式变了）", () => {
    expect(() => rewriteSchemaImports("import { http } from 'msw';\n", "msw.ts")).toThrow(
      /msw\.ts/,
    );
  });
});

describe("交给 Orval 的副本上标记二进制正文", () => {
  it("contentMediaType 的 schema 补上 type: string、format: binary", () => {
    const spec = {
      paths: {
        "/x": {
          get: {
            responses: {
              "200": {
                content: { "application/pdf": { schema: { contentMediaType: "application/pdf" } } },
              },
            },
          },
        },
      },
      components: { schemas: { Run: { type: "object", properties: { id: { type: "string" } } } } },
    };
    const marked = markBinarySchemas(spec);
    expect(marked.paths["/x"].get.responses["200"].content["application/pdf"].schema).toEqual({
      type: "string",
      format: "binary",
      contentMediaType: "application/pdf",
    });
    expect(marked.components).toEqual(spec.components);
  });

  it("带 contentEncoding（base64 文本）或已有 type 的不动", () => {
    const encoded = { type: "string", contentMediaType: "image/png", contentEncoding: "base64" };
    expect(markBinarySchemas(encoded)).toEqual(encoded);
    expect(markBinarySchemas({ contentMediaType: "image/png", contentEncoding: "base64" })).toEqual(
      {
        contentMediaType: "image/png",
        contentEncoding: "base64",
      },
    );
  });
});

describe("能力输出模型与 Zod 推导类型的重名", () => {
  it("保留两个模型的 schema 和输入类型，去掉自动生成的 Output 别名", () => {
    const source = [
      "export const EarningsCard = zod.object({});",
      "export type EarningsCard = zod.input<typeof EarningsCard>;",
      "export type EarningsCardOutput = zod.output<typeof EarningsCard>;",
      "export const EarningsCardOutput = zod.object({});",
      "export type EarningsCardOutput = zod.input<typeof EarningsCardOutput>;",
      "export type EarningsCardOutputOutput = zod.output<typeof EarningsCardOutput>;",
      "export type Other = zod.output<typeof EarningsCard>;",
      "",
    ].join("\n");
    const result = removeZodOutputAliases(source);
    expect(result).toContain("export const EarningsCardOutput = zod.object({});");
    expect(result).toContain(
      "export type EarningsCardOutput = zod.input<typeof EarningsCardOutput>;",
    );
    expect(result).not.toContain("EarningsCardOutput = zod.output");
    expect(result).not.toContain("EarningsCardOutputOutput");
    expect(result).toContain("export type Other = zod.output<typeof EarningsCard>;");
    expect(removeZodOutputAliases(result)).toBe(result);
  });
});

describe("纯字典的 TypeSpec / Orval 关键字适配", () => {
  it("无值约束的未知字典保持原样", () => {
    for (const unevaluatedProperties of [true, {}]) {
      const input = { type: "object", unevaluatedProperties };
      expect(normalizeRecordSchemas(input)).toEqual(input);
    }
  });
  it("递归保留字典值类型，不修改原文", () => {
    const input = { items: [{ type: "object", unevaluatedProperties: { type: "number" } }] };
    const result = normalizeRecordSchemas(input);
    expect(result.items[0]).toEqual({
      type: "object",
      unevaluatedProperties: { type: "number" },
      additionalProperties: { type: "number" },
    });
    expect(input.items[0]).not.toHaveProperty("additionalProperties");
    expect(normalizeRecordSchemas(result)).toEqual(result);
  });
  it("不把带属性、组合或既有 additionalProperties 的对象当纯字典", () => {
    for (const extra of [
      { properties: { name: { type: "string" } } },
      { allOf: [] },
      { anyOf: [] },
      { oneOf: [] },
      { patternProperties: {} },
      { additionalProperties: false },
    ]) {
      const input = { type: "object", unevaluatedProperties: { type: "number" }, ...extra };
      expect(normalizeRecordSchemas(input)).toEqual(input);
    }
  });
});
