// mise run check:arch：依赖规则（docs/01 第 7 节）。两个检查器都跑完再汇总结果。
import { runDepcruise } from "../src/depcruise.ts";
import { runImportRules } from "../src/import-rules.ts";

let failed = false;
for (const check of [runDepcruise, runImportRules]) {
  try {
    const result = check(process.cwd());
    for (const line of result.output) console.log(line);
    failed ||= result.code !== 0;
  } catch (error) {
    console.error(`check:arch 出错：${error instanceof Error ? error.message : String(error)}`);
    failed = true;
  }
}
process.exitCode = failed ? 1 : 0;
