// 测试共用：仓库里的路径、样例的发现与命名、JSON Schema 校验器。
import { readdirSync, readFileSync } from "node:fs";
import { join, relative, sep } from "node:path";
import { fileURLToPath } from "node:url";
import { Ajv2020 } from "ajv/dist/2020.js";
import addFormatsModule from "ajv-formats";
import { parse } from "yaml";

export const ROOT = fileURLToPath(new URL("../../../../", import.meta.url));
export const SAMPLES = join(ROOT, "fixtures", "samples");
export const SCHEMAS = join(ROOT, "contracts", "generated", "schemas");
export const OPENAPI = join(ROOT, "contracts", "generated", "openapi.yaml");
export const GRAPH = join(ROOT, "tasks", "graph.yaml");

/** fixtures/samples 下不参与模型校验的目录（另有格式） */
export const NOT_MODEL_SAMPLES = ["prompt-render"];

/** 样例文件名：<模型名>.<变体>.json（变体里可以有点，如 Paper.arxiv-2505.07078.json） */
const SAMPLE_NAME = /^([A-Z][A-Za-z0-9]*)\.(.+)\.json$/;

export function parseSampleName(fileName: string): { model: string; variant: string } | undefined {
  const match = SAMPLE_NAME.exec(fileName);
  if (match?.[1] === undefined || match[2] === undefined) return undefined;
  return { model: match[1], variant: match[2] };
}

/** fixtures/samples 下全部要做模型校验的 JSON（相对 fixtures/samples，用 / 分隔，排好序） */
export function listSampleFiles(dir = SAMPLES): string[] {
  const found: string[] = [];
  const walk = (current: string): void => {
    for (const entry of readdirSync(current, { withFileTypes: true })) {
      const path = join(current, entry.name);
      const rel = relative(dir, path).split(sep).join("/");
      if (entry.isDirectory()) {
        if (!NOT_MODEL_SAMPLES.includes(rel)) walk(path);
      } else if (entry.name.endsWith(".json")) {
        found.push(rel);
      }
    }
  };
  walk(dir);
  return found.sort();
}

export function readJson(path: string): unknown {
  return JSON.parse(readFileSync(path, "utf8"));
}

export function readYaml(path: string): unknown {
  return parse(readFileSync(path, "utf8"));
}

// ajv-formats 是 CommonJS，默认导入在不同解析方式下可能多包一层 default
const addFormats = ((addFormatsModule as unknown as { default?: typeof addFormatsModule })
  .default ?? addFormatsModule) as typeof addFormatsModule;

/** 载入 contracts/generated/schemas 的全部 JSON Schema；x- 扩展登记为“只是注解”，不做校验 */
export function createAjv(): Ajv2020 {
  const ajv = new Ajv2020({ allErrors: true, strict: true, strictTypes: false });
  addFormats(ajv);
  ajv.addVocabulary(["x-max-chars", "x-source-quote", "x-image"]);
  for (const name of readdirSync(SCHEMAS)
    .filter((file) => file.endsWith(".json"))
    .sort()) {
    ajv.addSchema(readJson(join(SCHEMAS, name)) as object);
  }
  return ajv;
}
