// 第 2 步：Orval → packages/contracts/src/generated/ 的 types.ts、zod.ts、client.ts、hooks.ts、msw.ts。
import { readdirSync, readFileSync, renameSync, rmSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { generate, type OpenApiDocument, type Options } from "orval";
import { SLASH_HEADER } from "./notice.ts";
import { PATHS, ROOT } from "./paths.ts";

/** Orval 写进每个文件开头的内容（原样使用）。 */
const header = (): string => `${SLASH_HEADER}\n`;

const out = (name: string): string => join(PATHS.tsGenerated, name);

/** 基础地址在运行时取（控制台同源为空串；公开站构建时用 HUB_API_URL），见 packages/contracts/src/runtime/base-url.ts */
const baseUrl = {
  runtime: "getBaseUrl()",
  imports: [{ name: "getBaseUrl", importPath: "../runtime/base-url" }],
};

/** fetch 函数直接返回响应正文，非 2xx 抛错（错误对象带 status 和 info = problem+json 正文） */
const fetchOverride = { includeHttpResponseReturnType: false, forceSuccessResponse: true };

/**
 * OpenAPI 3.1 里 TypeSpec 用 contentMediaType（如 application/pdf、image/png）表示二进制正文，
 * 而 Orval 的模拟生成器只认 format: binary，会给 Blob 类型生成字符串、tsc 报错。
 * 这里在交给 Orval 的副本上补 type: string、format: binary（不改 contracts/generated/openapi.yaml）。
 */
export function markBinarySchemas<T>(value: T): T {
  if (Array.isArray(value)) return value.map((item: unknown) => markBinarySchemas(item)) as T;
  if (typeof value !== "object" || value === null) return value;
  const entries = Object.entries(value).map(
    ([key, item]) => [key, markBinarySchemas(item)] as const,
  );
  const result: Record<string, unknown> = Object.fromEntries(entries);
  const binary =
    typeof result.contentMediaType === "string" &&
    result.contentEncoding === undefined &&
    result.type === undefined &&
    result.$ref === undefined;
  return (binary ? { type: "string", format: "binary", ...result } : result) as T;
}

const transformer = (spec: OpenApiDocument): OpenApiDocument => markBinarySchemas(spec);

/** Zod 的生成设置（测试里也用它检查 x- 标注不会变成校验） */
export function zodProject(openapi: string, target: string): Options {
  return {
    input: { target: openapi, override: { transformer } },
    output: {
      target,
      client: "zod",
      mode: "single",
      override: {
        header,
        zod: {
          version: 4,
          // 每个模型一个可复用的 schema（能力的输入输出模型也有，即使没有接口引用）
          generateReusableSchemas: true,
          // 时间允许 +08:00 这样的偏移（默认只认 Z）
          dateTimeOptions: { offset: true },
          // 路径和查询参数到手都是字符串：数字要先转换；布尔和日期不转（"false" 会被转成 true）
          coerce: { param: ["number", "bigint"], query: ["number", "bigint"] },
        },
      },
    },
  };
}

// client 与 hooks 用 split 模式：Orval 把实现写进 <名字>.ts，类型写进 <名字>.schemas.ts，模拟写进 <名字>.msw.ts。
// 生成后（finishTypeScript）：client.schemas.ts 改名为 types.ts，client.msw.ts 改名为 msw.ts，
// hooks.schemas.ts（与 types.ts 内容相同）删掉，各文件对 *.schemas 的导入改成 ./types。
export function orvalProjects(): Record<string, Options> {
  const input = { target: PATHS.openapi, override: { transformer } };
  return {
    client: {
      input,
      output: {
        target: out("client.ts"),
        client: "fetch",
        mode: "split",
        baseUrl,
        urlEncodeParameters: true,
        mock: { generators: [{ type: "msw" }] },
        override: { header, fetch: fetchOverride },
      },
    },
    hooks: {
      input,
      output: {
        target: out("hooks.ts"),
        client: "react-query",
        httpClient: "fetch",
        mode: "split",
        baseUrl,
        urlEncodeParameters: true,
        override: { header, fetch: fetchOverride, query: { version: 5 } },
      },
    },
    zod: zodProject(PATHS.openapi, out("zod.ts")),
  };
}

/** 把对 Orval 类型文件（client.schemas、hooks.schemas）的导入改成 ./types。 */
export function rewriteSchemaImports(source: string, file: string): string {
  const pattern = /from '\.\/(client|hooks)\.schemas'/g;
  if (source.match(pattern) === null) {
    throw new Error(`${file} 里找不到对 *.schemas 的导入，Orval 的输出格式变了？`);
  }
  return source.replace(pattern, "from './types'");
}

/**
 * Orval 8.38 的复用 schema 无条件生成 XOutput 推导别名，会撞契约里的能力模型 XOutput。
 * TS 类型已由 types.ts 提供；保留 schema 及其同名输入类型，删除冗余输出推导别名。
 * 只删除 Orval 的固定别名形态，不改任何模型、schema 常量或递归类型声明。
 */
export function removeZodOutputAliases(source: string): string {
  return source.replace(
    /^export type ([A-Za-z_$][\w$]*) = zod\.output<typeof ([A-Za-z_$][\w$]*)>;\r?\n/gm,
    (line: string, alias: string, schema: string) => (alias === `${schema}Output` ? "" : line),
  );
}

/** 生成目录里最终应当只有这几个文件 */
export const TS_FILES = ["client.ts", "hooks.ts", "msw.ts", "types.ts", "zod.ts"];

function finishTypeScript(): void {
  const rename = (from: string, to: string): void => {
    renameSync(out(from), out(to));
  };
  rename("client.schemas.ts", "types.ts");
  rename("client.msw.ts", "msw.ts");
  rmSync(out("hooks.schemas.ts"));
  for (const file of ["client.ts", "hooks.ts", "msw.ts"]) {
    writeFileSync(out(file), rewriteSchemaImports(readFileSync(out(file), "utf8"), file));
  }
  const zodPath = out("zod.ts");
  writeFileSync(zodPath, removeZodOutputAliases(readFileSync(zodPath, "utf8")));
  const files = readdirSync(PATHS.tsGenerated).sort();
  if (files.join(",") !== TS_FILES.join(",")) {
    throw new Error(`生成目录里应当是 ${TS_FILES.join("、")}，实际是 ${files.join("、")}`);
  }
}

export async function generateTypeScript(): Promise<void> {
  for (const [name, options] of Object.entries(orvalProjects())) {
    console.log(`Orval：${name}`);
    await generate(options, ROOT, { throwOnError: true, logLevel: "warn" });
  }
  finishTypeScript();
}
