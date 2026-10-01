import { describe, expect, it } from "vitest";
import { type Git, mainRef, oasdiffArgs, planBase } from "../src/contracts-check.ts";

/** 假的 git：按命令返回预设结果，没有预设的当作失败 */
function fakeGit(answers: Record<string, string>): Git {
  return (args) => answers[args.join(" ")];
}

const FILE = "contracts/generated/openapi.yaml";

describe("contracts:check 的比较基准", () => {
  it("优先用 origin/main", () => {
    const git = fakeGit({
      "rev-parse --verify --quiet refs/remotes/origin/main": "abc\n",
      "rev-parse --verify --quiet refs/heads/main": "def\n",
    });
    expect(mainRef(git)).toBe("origin/main");
  });

  it("main 上还没有 openapi.yaml 时通过并说明", () => {
    const git = fakeGit({
      "rev-parse --verify --quiet refs/heads/main": "def\n",
      "merge-base main HEAD": "df8713a0000\n",
    });
    const plan = planBase(git, FILE);
    expect(plan.kind).toBe("skip");
    expect(plan.kind === "skip" && plan.message).toMatch(/第一次引入契约/);
  });

  it("有旧版本时和合并基点上的文件比较", () => {
    const git = fakeGit({
      "rev-parse --verify --quiet refs/remotes/origin/main": "abc\n",
      "merge-base origin/main HEAD": "1234567890\n",
      [`show 1234567890:${FILE}`]: "openapi: 3.1.0\n",
    });
    expect(planBase(git, FILE)).toEqual({
      kind: "compare",
      ref: "origin/main",
      base: "1234567890",
      content: "openapi: 3.1.0\n",
    });
  });

  it("找不到 main 时跳过", () => {
    expect(planBase(fakeGit({}), FILE).kind).toBe("skip");
  });

  it("oasdiff 遇到 ERR 级别的破坏性变更就失败", () => {
    const args = oasdiffArgs("base.yaml", "rev.yaml");
    expect(args.slice(0, 3)).toEqual(["breaking", "base.yaml", "rev.yaml"]);
    expect(args[args.indexOf("--fail-on") + 1]).toBe("ERR");
  });
});
