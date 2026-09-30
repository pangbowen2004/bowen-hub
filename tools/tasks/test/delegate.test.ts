import { afterEach, describe, expect, it } from "vitest";
import { planScript, planTurbo } from "../src/delegate.ts";
import { removeDir, runBin, tempDir, writeFiles } from "./helpers.ts";

const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) removeDir(dir);
});

function root(files: Record<string, string> = {}): string {
  const dir = tempDir("delegate");
  created.push(dir);
  writeFiles(dir, files);
  return dir;
}

const gen = { dir: "tools/gen", owner: "T01" };

describe("转交给后续任务的入口", () => {
  it("目录或 script 不存在：说明由谁提供，不运行", () => {
    const plan = planScript(root(), gen, "gen", []);
    expect(plan).toEqual({
      run: false,
      message: 'tools/gen 尚未接入：由 T01 在 tools/gen/package.json 里提供 "gen" script。跳过。',
    });
    const noScript = planScript(
      root({ "tools/gen/package.json": '{"scripts":{"build":"x"}}' }),
      gen,
      "gen",
      [],
    );
    expect(noScript.run).toBe(false);
  });

  it("script 存在：用 pnpm 在那个目录运行，参数原样传过去", () => {
    const plan = planScript(
      root({ "tools/gen/package.json": '{"scripts":{"gen":"x"}}' }),
      gen,
      "gen",
      ["--check"],
    );
    expect(plan).toEqual({
      run: true,
      command: "pnpm",
      args: ["--dir", "tools/gen", "run", "gen", "--check"],
    });
  });

  it("开发服务器：只给有 script 的包加 turbo 过滤，其余的说明由谁提供", () => {
    const dir = root({ "apps/console/package.json": '{"scripts":{"dev":"vite"}}' });
    const targets = [
      { dir: "services/api", owner: "T02" },
      { dir: "apps/console", owner: "T05" },
    ];
    const plan = planTurbo(dir, "dev", targets);
    expect(plan.run && plan.args).toEqual(["run", "dev", "--filter=./apps/console"]);
    expect(plan.notes).toEqual([
      'services/api 尚未接入：由 T02 在 services/api/package.json 里提供 "dev" script。',
    ]);
    expect(planTurbo(root(), "dev", targets).run).toBe(false);
  });

  it("命令行入口：没接入时返回 0", () => {
    const result = runBin("delegate.ts", {
      cwd: root(),
      args: ["script", "tools/gen", "gen", "T01"],
    });
    expect(result.code).toBe(0);
    expect(result.stdout).toContain("tools/gen 尚未接入");
    const wrong = runBin("delegate.ts", { cwd: root(), args: ["nonsense"] });
    expect(wrong.code).toBe(1);
  });
});
