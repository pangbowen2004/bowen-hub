import { describe, expect, it } from "vitest";
import { compareSpecificity, literalBaseDir, matches } from "../src/glob.ts";

describe("glob 匹配", () => {
  it("** 跨目录，* 只在一段内，点开头的目录也能匹配", () => {
    expect(matches("packages/config/**", "packages/config/tsconfig/node.json")).toBe(true);
    expect(matches("capabilities/news.*.yaml", "capabilities/news.brief.yaml")).toBe(true);
    expect(matches("capabilities/news.*.yaml", "capabilities/papers.qa.yaml")).toBe(false);
    expect(matches("config/market*.yaml", "config/market_etf_groups.yaml")).toBe(true);
    expect(matches(".storybook/**", ".storybook/main.ts")).toBe(true);
    expect(matches(".github/workflows/ci.yml", ".github/workflows/ci.yml")).toBe(true);
    expect(matches("evals/news.*/**", "evals/news.brief/cases.yaml")).toBe(true);
  });
});

describe("更具体优先", () => {
  it("开头不含通配符的段越多越具体", () => {
    expect(
      compareSpecificity("services/api/src/lib/auth/**", "services/api/src/lib/**"),
    ).toBeGreaterThan(0);
    expect(
      compareSpecificity("py/packages/hub-core/**", "py/packages/hub-core/src/hub_core/export/**"),
    ).toBeLessThan(0);
  });

  it("精确路径比 glob 具体", () => {
    expect(
      compareSpecificity(
        "services/api/src/modules/platform/export.ts",
        "services/api/src/modules/platform/**",
      ),
    ).toBeGreaterThan(0);
  });

  it("段数相同时比字面字符数", () => {
    expect(compareSpecificity("config/market*.yaml", "config/*.yaml")).toBeGreaterThan(0);
    expect(compareSpecificity("a/b/**", "a/b/**")).toBe(0);
  });
});

describe("glob 的字面目录", () => {
  it.each([
    [
      "py/packages/hub-market/src/hub_market/compute/**",
      "py/packages/hub-market/src/hub_market/compute",
    ],
    ["capabilities/news.*.yaml", "capabilities"],
    ["apps/console/index.html", "apps/console"],
    ["mise.toml", ""],
    ["e2e/**", "e2e"],
  ])("%s → %s", (pattern, base) => {
    expect(literalBaseDir(pattern)).toBe(base);
  });
});
