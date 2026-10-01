// 直接运行 mise.toml 中的评测命令，uv 用临时假程序，测试不联网。
import { spawnSync } from "node:child_process";
import { chmodSync, readFileSync } from "node:fs";
import { delimiter, join } from "node:path";
import { parse } from "smol-toml";
import { afterEach, describe, expect, it } from "vitest";
import { REPO_ROOT, removeDir, tempDir, writeFiles } from "./helpers.ts";

const config = parse(readFileSync(join(REPO_ROOT, "mise.toml"), "utf8")) as {
  tasks: { evals: { run: string } };
};
const created: string[] = [];
afterEach(() => {
  for (const dir of created.splice(0)) removeDir(dir);
});

function runEvals(files: Record<string, string>, exitCode = 2) {
  const root = tempDir("evals");
  created.push(root);
  writeFiles(root, {
    "py/pyproject.toml": "[tool.uv]\npackage = false\n",
    "bin/uv": `#!/bin/sh\nprintf '%s\\n' "$@"\nexit ${exitCode}\n`,
    ...files,
  });
  chmodSync(join(root, "bin/uv"), 0o755);
  return spawnSync("/bin/sh", ["-c", config.tasks.evals.run], {
    cwd: join(root, "py"),
    encoding: "utf8",
    env: {
      ...process.env,
      PATH: `${join(root, "bin")}${delimiter}${process.env.PATH ?? ""}`,
      usage_args: "--changed --offline",
    },
  });
}

describe("评测的逐波接线", () => {
  it("hub CLI 未建时说明由 T03 提供并跳过", () => {
    const result = runEvals({});
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("hub 命令由 T03");
  });

  it("T03 只有 CLI 和评测命令占位，T04 runner 未接入时跳过", () => {
    const result = runEvals({
      "py/apps/hub-cli/pyproject.toml": "[project]\nname = 'hub-cli'\n",
      "py/packages/hub-ai/src/hub_ai/commands.py": "# T03 的命令占位，未实现时退出码为 2。\n",
    });
    expect(result.status).toBe(0);
    expect(result.stdout).toContain("T04 在 py/packages/hub-ai/src/hub_ai/evals/runner.py");
  });

  it.each([0, 2, 3])("实际入口已接入时，参数和退出码 %i 原样传递", (exitCode) => {
    const result = runEvals(
      {
        "py/apps/hub-cli/pyproject.toml": "[project]\nname = 'hub-cli'\n",
        "py/packages/hub-ai/src/hub_ai/evals/runner.py": "# T04 的实际评测实现。\n",
      },
      exitCode,
    );
    expect(result.status).toBe(exitCode);
    expect(result.stdout.trim().split("\n")).toEqual([
      "run",
      "hub",
      "evals",
      "run",
      "--changed",
      "--offline",
    ]);
    expect(result.stderr).toBe("");
  });
});
