/** 模板明确标待补齐，先以 L0 接入；不制造产品用例与业务阈值。 */
import { existsSync } from "node:fs";
import { mkdir, readFile, writeFile } from "node:fs/promises";
import { resolve } from "node:path";
export async function scaffold(root: string, id: string): Promise<string[]> {
  if (!/^[a-z][a-z0-9_]*\.[a-z][a-z0-9_]*$/.test(id)) throw new Error("能力 id 必须为 domain.name");
  const stem = id.replaceAll(".", "_");
  const model = stem
    .split("_")
    .map((word) => word[0]?.toUpperCase() + word.slice(1))
    .join("");
  const paths = [
    `capabilities/${id}.yaml`,
    `prompts/${stem}.md`,
    `evals/${id}/cases.yaml`,
    `evals/${id}/README.md`,
    `contracts/capabilities/${stem}.tsp`,
  ];
  if (paths.some((path) => existsSync(resolve(root, path))))
    throw new Error("能力文件已存在，不覆盖");
  const imports = resolve(root, "contracts/capabilities.tsp");
  const contents = await readFile(imports, "utf8");
  const files = [
    `# 模板：请补齐业务口径、预算和评测，当前仅影子运行\nid: ${id}\nversion: 1\nsummary: 待补齐\nowner: ${id.split(".")[0]}\nruntime: python\ntier: fast\nautonomy: L0\nprompt: prompts/${stem}.md\nio: {input: ${model}Input, output: ${model}Output}\nlimits: {maxInputTokens: 20000, maxOutputTokens: 800, timeoutSec: 60}\nchecks: []\nfallback: fail\nparams: {}\nevals:\n  dataset: evals/${id}/\n  thresholds: {schema_valid: 1}\n`,
    `# ${stem} —— 待补齐\n\n## system\n根据事实包返回契约结构，不补造事实。\n\n## user\n{{ facts }}\n`,
    `# 至少补齐10条真实/边界用例，关键能力至少20条；空集评测会明确失败。\n[]\n`,
    `# ${id} 评测\n\n填写 cases.yaml 的 id/input/expect/tags，主观评分器另写 judge_*.md。\n`,
    `import "../common.tsp";\nnamespace BowenHub;\nmodel ${model}Input { facts: string; }\nmodel ${model}Output { text: string; generatedBy?: GeneratedBy; }\n`,
  ];
  for (let i = 0; i < paths.length; i++) {
    const path = paths[i];
    const text = files[i];
    if (!path || text === undefined) throw new Error("模板缺失");
    await mkdir(resolve(root, path, ".."), { recursive: true });
    await writeFile(resolve(root, path), text, { flag: "wx" });
  }
  await writeFile(imports, `${contents.trimEnd()}\nimport "./capabilities/${stem}.tsp";\n`);
  return [...paths, "contracts/capabilities.tsp"];
}
