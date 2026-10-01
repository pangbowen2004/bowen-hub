// 第 3 步：datamodel-code-generator → py/packages/hub-contracts/src/hub_contracts/generated/（Pydantic v2）。
import { readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { HASH_HEADER, NOTICE } from "./notice.ts";
import { PATHS, ROOT } from "./paths.ts";
import { run } from "./run.ts";

const MODELS = join(PATHS.pyGenerated, "models.py");

export function datamodelArgs(openapi: string, output: string): string[] {
  return [
    "--input",
    openapi,
    "--input-file-type",
    "openapi",
    "--output",
    output,
    "--output-model-type",
    "pydantic_v2.BaseModel",
    "--target-python-version",
    "3.14",
    "--use-union-operator",
    "--use-standard-collections",
    "--use-annotated",
    "--field-constraints",
    // 契约要求时间带时区
    "--output-datetime-class",
    "AwareDatetime",
    // 字符串联合 → Literal（不生成 Enum 类）
    "--enum-field-as-literal",
    "all",
    // 具名的联合、标量不单独成类，直接展开到字段类型里
    "--collapse-root-models",
    "--use-schema-description",
    "--use-field-description",
    "--use-double-quotes",
    // 不写时间戳，保证两次生成没有差异
    "--disable-timestamp",
    "--custom-file-header",
    HASH_HEADER,
    "--formatters",
    "ruff-format",
  ];
}

/** 生成文件里的全部类名（顶层 class 定义）。 */
export function classNames(source: string): string[] {
  return [...source.matchAll(/^class (\w+)\(/gm)].map((match) => match[1] ?? "").filter(Boolean);
}

/**
 * Python 字段名和 JSON 字段名必须一致（不允许别名）：否则 model_dump() 忘了 by_alias=True 就会写出错的键。
 * 出现别名通常是字段名用了 Python 关键字（from、class、in……），改契约里的字段名。
 */
export function findAliases(source: string): string[] {
  return source
    .split("\n")
    .filter((line) => /\balias=/.test(line))
    .map((line) => line.trim());
}

export function initModule(names: string[]): string {
  const sorted = [...names].sort();
  return [
    HASH_HEADER,
    `"""契约生成的 Pydantic v2 模型（${NOTICE}）。用法：from hub_contracts import Run"""`,
    "",
    "from .models import (",
    ...sorted.map((name) => `    ${name} as ${name},`),
    ")",
    "",
    "__all__ = [",
    ...sorted.map((name) => `    "${name}",`),
    "]",
    "",
  ].join("\n");
}

/** 用 py 工作区里的 datamodel-code-generator（hub-contracts 的 dev 依赖组）生成 Pydantic 模型 */
export function runDatamodelCodegen(openapi: string, output: string): void {
  const args = ["run", "--project", PATHS.pyProject, "--no-sync", "datamodel-codegen"];
  run("uv", [...args, ...datamodelArgs(openapi, output)], ROOT);
}

export function generatePython(): void {
  runDatamodelCodegen(PATHS.openapi, MODELS);
  const source = readFileSync(MODELS, "utf8");
  const aliases = findAliases(source);
  if (aliases.length > 0) {
    throw new Error(
      [
        "生成的 Pydantic 模型里出现了字段别名（Python 字段名和 JSON 字段名不一致）：",
        ...aliases.map((line) => `  ${line}`),
        "多半是字段名用了 Python 关键字或 BaseModel 的属性名，请在契约里换个字段名。",
      ].join("\n"),
    );
  }
  writeFileSync(join(PATHS.pyGenerated, "__init__.py"), initModule(classNames(source)));
}
