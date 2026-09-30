// lighthouserc.json 的阈值与页面归类（docs/05 第 10 节）：用两个公开站的真实路径核对正则。
import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { REPO_ROOT } from "./helpers.ts";

type Entry = {
  matchingUrlPattern: string;
  assertions: Record<string, [string, Record<string, number>]>;
};

const config = JSON.parse(readFileSync(join(REPO_ROOT, "lighthouserc.json"), "utf8")) as {
  ci: { assert: { assertMatrix: Entry[] } };
};

/** 一个地址要满足的全部断言（多条匹配时取最严的）。 */
function limits(path: string): {
  minScores: Record<string, number>;
  maxScriptBytes: number | undefined;
} {
  const url = `http://localhost:43210${path}`;
  const minScores: Record<string, number> = {};
  let maxScriptBytes: number | undefined;
  for (const entry of config.ci.assert.assertMatrix) {
    if (!new RegExp(entry.matchingUrlPattern).test(url)) continue;
    for (const [name, [, options]] of Object.entries(entry.assertions)) {
      if (options.minScore !== undefined) minScores[name] = options.minScore;
      if (name === "resource-summary:script:size" && options.maxNumericValue !== undefined) {
        maxScriptBytes = Math.min(
          maxScriptBytes ?? Number.POSITIVE_INFINITY,
          options.maxNumericValue,
        );
      }
    }
  }
  return { minScores, maxScriptBytes };
}

const scores = { "categories:performance": 0.9, "categories:accessibility": 0.9 };

describe("lighthouserc.json", () => {
  it.each([
    "/",
    "/index.html",
    "/papers/arxiv-2505.07078/",
    "/papers/acl-2021.acl-long.500/index.html",
    "/spaces/quant/",
    "/about/",
    "/methods/",
    "/weekly/",
    "/weekly/2026-08-28/",
    "/archive/",
  ])("普通内容页 %s：性能、可访问性 ≥ 90，首屏 JS ≤ 50 KB", (path) => {
    expect(limits(path)).toEqual({ minScores: scores, maxScriptBytes: 50 * 1024 });
  });

  it.each(["/industries/", "/directions/", "/evolution/", "/validation/", "/archive/2026-08-28/"])(
    "其余页面 %s：性能、可访问性 ≥ 90，首屏 JS ≤ 250 KB",
    (path) => {
      expect(limits(path)).toEqual({ minScores: scores, maxScriptBytes: 250 * 1024 });
    },
  );

  it("2D 图谱不看性能和可访问性分，首屏 JS ≤ 250 KB；3D 页都不限", () => {
    expect(limits("/graph/")).toEqual({ minScores: {}, maxScriptBytes: 250 * 1024 });
    expect(limits("/graph/index.html")).toEqual({ minScores: {}, maxScriptBytes: 250 * 1024 });
    expect(limits("/universe/")).toEqual({ minScores: {}, maxScriptBytes: undefined });
  });
});
