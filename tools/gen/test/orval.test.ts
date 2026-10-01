import { describe, expect, it } from "vitest";
import { markBinarySchemas, rewriteSchemaImports } from "../src/orval.ts";

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
