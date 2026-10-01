// 用法：
//   node tools/tasks/bin/delegate.ts script <目录> <script> <负责任务> [参数…]
//   node tools/tasks/bin/delegate.ts turbo <script> <目录>=<负责任务> [<目录>=<负责任务> …]
import { spawnSync } from "node:child_process";
import { type Plan, planScript, planTurbo } from "../src/delegate.ts";

function plan(argv: string[]): Plan {
  const [mode, ...rest] = argv;
  if (mode === "script") {
    const [dir, script, owner, ...args] = rest;
    if (dir !== undefined && script !== undefined && owner !== undefined) {
      return planScript(process.cwd(), { dir, owner }, script, args);
    }
  }
  if (mode === "turbo") {
    const [script, ...pairs] = rest;
    const targets = pairs.map((pair) => {
      const [dir = "", owner = ""] = pair.split("=");
      return { dir, owner };
    });
    if (script !== undefined && targets.length > 0 && targets.every((t) => t.dir && t.owner)) {
      const result = planTurbo(process.cwd(), script, targets);
      for (const note of result.run ? result.notes : []) console.log(note);
      return result;
    }
  }
  throw new Error("参数不对，用法见 tools/tasks/bin/delegate.ts 开头的注释");
}

try {
  const result = plan(process.argv.slice(2));
  if (!result.run) {
    console.log(result.message);
  } else {
    const child = spawnSync(result.command, result.args, { stdio: "inherit" });
    if (child.error) throw child.error;
    process.exitCode = child.status ?? 1;
  }
} catch (error) {
  console.error(`delegate 出错：${error instanceof Error ? error.message : String(error)}`);
  process.exitCode = 1;
}
