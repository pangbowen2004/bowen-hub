// 四个自定义装饰器的整条链路（docs/10 第 5 节、预检 Q07）：
// x-max-chars / x-source-quote / x-image 同时出现在 OpenAPI 和 JSON Schema，x-task 出现在 OpenAPI 的操作上；
// 用正式的 Zod 与 Pydantic 生成设置生成后，都不据此做校验（字数上限由运行时的 length_within 截断）。
import { mkdtempSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generate } from "orval";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { parse } from "yaml";
import { zodProject } from "../src/orval.ts";
import { PATHS, ROOT } from "../src/paths.ts";
import { runDatamodelCodegen } from "../src/python.ts";
import { run } from "../src/run.ts";

const FIXTURE = join(PATHS.contracts, "test", "annotations");

type Json = Record<string, unknown>;

let dir = "";
let openapi: Json = {};
let schema: Json = {};

function property(container: Json, name: string): Json {
  const properties = container.properties as Record<string, Json>;
  const found = properties[name];
  if (found === undefined) throw new Error(`没有属性 ${name}`);
  return found;
}

beforeAll(() => {
  dir = mkdtempSync(join(tmpdir(), "bowen-hub-annotations-"));
  run(PATHS.tsp, ["compile", FIXTURE, "--output-dir", dir], PATHS.contracts);
  openapi = parse(readFileSync(join(dir, "openapi.yaml"), "utf8")) as Json;
  schema = JSON.parse(readFileSync(join(dir, "schemas", "AnnotatedOutput.json"), "utf8")) as Json;
}, 120_000);

afterAll(() => {
  rmSync(dir, { recursive: true, force: true });
});

describe("装饰器写进 OpenAPI 与 JSON Schema", () => {
  it("OpenAPI：属性上的 x- 扩展、操作上的 x-task", () => {
    const components = (openapi.components as Json).schemas as Record<string, Json>;
    const model = components.AnnotatedOutput as Json;
    expect(property(model, "whatHappened")["x-max-chars"]).toBe(80);
    expect(property(model, "points")["x-max-chars"]).toBe(60);
    expect(property(model, "quote")["x-source-quote"]).toBe(true);
    expect(property(model, "pageImages")["x-image"]).toBe(true);
    const operation = ((openapi.paths as Json)["/fixture"] as Json).post as Json;
    expect(operation["x-task"]).toBe("T01");
  });

  it("JSON Schema：同样的 x- 扩展，且没有变成 maxLength", () => {
    expect(property(schema, "whatHappened")).toEqual({ type: "string", "x-max-chars": 80 });
    expect(property(schema, "points")["x-max-chars"]).toBe(60);
    expect(property(schema, "quote")["x-source-quote"]).toBe(true);
    expect(property(schema, "pageImages")["x-image"]).toBe(true);
    expect(JSON.stringify(schema)).not.toMatch(/maxLength|maxItems/);
  });
});

describe("生成的校验器不强制这些标注", () => {
  it("Zod：没有 .max()、不认识 x- 扩展", async () => {
    const target = join(dir, "zod.ts");
    await generate(zodProject(join(dir, "openapi.yaml"), target), ROOT, {
      throwOnError: true,
      logLevel: "error",
    });
    const source = readFileSync(target, "utf8");
    const model = source.slice(source.indexOf("export const AnnotatedOutput"));
    expect(model).toMatch(/"whatHappened": zod\.string\(\)/);
    expect(model.slice(0, model.indexOf("});"))).not.toMatch(/\.max\(|\.length\(/);
    expect(source).not.toMatch(/x-max-chars|x-source-quote|x-image/);
  }, 120_000);

  it("Pydantic：普通 str 字段，没有 max_length", () => {
    const target = join(dir, "models.py");
    runDatamodelCodegen(join(dir, "openapi.yaml"), target);
    const source = readFileSync(target, "utf8");
    expect(source).toMatch(/^ {4}whatHappened: str$/m);
    expect(source).toMatch(/^ {4}points: list\[str\]$/m);
    expect(source).not.toMatch(/max_length|maxLength|x-max-chars|json_schema_extra/);
  }, 120_000);
});
