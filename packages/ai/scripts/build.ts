/** 将配置与提示词编入模块；Worker 不读取文件。此文件是生成源。 */
import { readdir, readFile, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { parse } from "yaml";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "../../..");
const read = async (path: string) => readFile(resolve(root, path), "utf8");
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
  capabilities[cap.id] = cap;
  prompts[cap.id] = await read(cap.prompt);
}
const llm = parse(await read("config/llm.yaml"));
const adviceWords = parse(await read("config/newsroom.yaml")).adviceWords;
await writeFile(
  resolve(root, "packages/ai/src/generated/registry.ts"),
  `// 由 scripts/build.ts 生成，勿手改；构建时更新。\nexport const registryData = ${JSON.stringify({ capabilities, prompts, llm, schemas, adviceWords }, null, 2)};\n`,
);
