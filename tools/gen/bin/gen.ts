// mise run gen：契约 → 两种语言的代码（docs/08 第 3 节）。
//   1. tsp compile → contracts/generated/（openapi.yaml + schemas/*.json）
//   2. Orval → packages/contracts/src/generated/（types、zod、client、hooks、msw）
//   3. datamodel-code-generator → py/packages/hub-contracts/src/hub_contracts/generated/（Pydantic v2）
//   4. 有 services/api/scripts/gen-routes.* 就生成 API 路由骨架
// 每次先清空三个生成目录，删掉的模型不会留下旧文件；输出排序稳定、不写时间戳，连续运行没有差异。
import { mkdirSync, rmSync } from "node:fs";
import { generateTypeScript } from "../src/orval.ts";
import { PATHS, relative } from "../src/paths.ts";
import { generatePython } from "../src/python.ts";
import { generateRoutes } from "../src/routes-hook.ts";
import { compileTypeSpec, postprocessTypeSpec } from "../src/typespec.ts";

async function main(): Promise<void> {
  for (const dir of [PATHS.contractsGenerated, PATHS.tsGenerated, PATHS.pyGenerated]) {
    rmSync(dir, { recursive: true, force: true });
    mkdirSync(dir, { recursive: true });
  }
  console.log(`1/4 TypeSpec → ${relative(PATHS.contractsGenerated)}`);
  compileTypeSpec();
  postprocessTypeSpec();
  console.log(`2/4 Orval → ${relative(PATHS.tsGenerated)}`);
  await generateTypeScript();
  console.log(`3/4 datamodel-code-generator → ${relative(PATHS.pyGenerated)}`);
  generatePython();
  console.log("4/4 API 路由骨架");
  generateRoutes();
  console.log("生成完成。");
}

main().catch((error: unknown) => {
  console.error(`gen 失败：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
});
