/** 将配置与提示词编入模块；Worker 不读取文件。此文件是生成源。 */
import { mkdir, readdir, readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import Ajv2020 from "ajv/dist/2020.js";
import { parse } from "yaml";
import type { Capability } from "../src/registry";

// Node 原生加载 .ts，类型检查仍按无后缀模块解析，不修改项目 tsconfig。
const { atomicWrite }: typeof import("./atomic-write") = await import(
  new URL("./atomic-write.ts", import.meta.url).href
);

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = async (path: string) => readFile(resolve(root, path), "utf8");
const validateManifest = new Ajv2020().compile<Capability>(
  JSON.parse(await read("capabilities/_schema.json")),
);
const schemas: Record<string, unknown> = {};
for (const file of (await readdir(resolve(root, "contracts/generated/schemas"))).sort()) {
  if (file.endsWith(".json"))
    schemas[file.slice(0, -5)] = JSON.parse(await read(`contracts/generated/schemas/${file}`));
}
const capabilities: Record<string, unknown> = {};
const prompts: Record<string, string> = {};
for (const file of (await readdir(resolve(root, "capabilities"))).sort()) {
  if (!file.endsWith(".yaml")) continue;
  const cap = parse(await read(`capabilities/${file}`));
  if (!validateManifest(cap) || cap.id !== file.slice(0, -5))
    throw new Error(`能力清单不合格：${file}`);
  capabilities[cap.id] = cap;
  prompts[cap.id] = await read(cap.prompt);
}
const llm = parse(await read("config/llm.yaml"));
const adviceWords = parse(await read("config/newsroom.yaml")).adviceWords;
const generatedDirectory = resolve(root, "packages/ai/src/generated");
await mkdir(generatedDirectory, { recursive: true });
await atomicWrite(
  resolve(generatedDirectory, "registry.ts"),
  `// 由 scripts/build.ts 生成，勿手改；构建时更新。\nexport const registryData = ${JSON.stringify({ capabilities, prompts, llm, schemas, adviceWords }, null, 2)};\n`,
);
