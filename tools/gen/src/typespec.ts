// 第 1 步：tsp compile → contracts/generated/openapi.yaml + schemas/*.json，然后做后处理。
import { readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { parse } from "yaml";
import { formatJson, HASH_HEADER, withHeader, withJsonNotice } from "./notice.ts";
import { PATHS } from "./paths.ts";
import { run } from "./run.ts";

export function compileTypeSpec(): void {
  // tspconfig.yaml 里开了 warn-as-error：契约里的警告也算失败
  run(PATHS.tsp, ["compile", "."], PATHS.contracts);
}

export type SchemaMismatch = { onlyInOpenapi: string[]; onlyInSchemas: string[] };

/**
 * JSON Schema 文件应当和 OpenAPI 的 components.schemas 一一对应（都是 namespace BowenHub 里的具名类型）。
 * 对不上通常是把具名模型写进了 routes/ 的命名空间，或者在 BowenHub 里声明了带 @query / @header 的 HTTP 模型。
 */
export function findSchemaMismatch(
  componentNames: string[],
  schemaNames: string[],
): SchemaMismatch {
  const components = new Set(componentNames);
  const schemas = new Set(schemaNames);
  return {
    onlyInOpenapi: componentNames.filter((name) => !schemas.has(name)).sort(),
    onlyInSchemas: schemaNames.filter((name) => !components.has(name)).sort(),
  };
}

export function componentSchemaNames(openapiText: string): string[] {
  const doc: unknown = parse(openapiText);
  if (typeof doc !== "object" || doc === null || !("components" in doc)) return [];
  const { components } = doc;
  if (typeof components !== "object" || components === null || !("schemas" in components)) {
    return [];
  }
  const { schemas } = components;
  return typeof schemas === "object" && schemas !== null ? Object.keys(schemas) : [];
}

export function postprocessTypeSpec(): void {
  const openapiText = readFileSync(PATHS.openapi, "utf8");
  writeFileSync(PATHS.openapi, withHeader(openapiText, HASH_HEADER));

  const files = readdirSync(PATHS.schemas)
    .filter((name) => name.endsWith(".json"))
    .sort();
  for (const name of files) {
    const path = join(PATHS.schemas, name);
    const schema: unknown = JSON.parse(readFileSync(path, "utf8"));
    if (typeof schema !== "object" || schema === null || Array.isArray(schema)) {
      throw new Error(`${name} 不是 JSON 对象`);
    }
    writeFileSync(path, formatJson(withJsonNotice(schema as Record<string, unknown>)));
  }

  const mismatch = findSchemaMismatch(
    componentSchemaNames(openapiText),
    files.map((name) => name.slice(0, -".json".length)),
  );
  if (mismatch.onlyInOpenapi.length > 0 || mismatch.onlyInSchemas.length > 0) {
    throw new Error(
      [
        "OpenAPI 的 components.schemas 和 JSON Schema 文件对不上：",
        `  只在 OpenAPI 里：${mismatch.onlyInOpenapi.join("、") || "（无）"}`,
        `  只在 schemas/ 里：${mismatch.onlyInSchemas.join("、") || "（无）"}`,
        "具名模型只能声明在 namespace BowenHub 里（不要写进 routes/ 的命名空间）；",
        "带 @query / @header / @body 的 HTTP 包装直接写在操作签名里，见 contracts/README.md。",
      ].join("\n"),
    );
  }
}
