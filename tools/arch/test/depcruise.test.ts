import { afterEach, describe, expect, it } from "vitest";
import { runDepcruise } from "../src/depcruise.ts";
import { cleanup, tree } from "./helpers.ts";

afterEach(cleanup);

// 允许的依赖（docs/01 第 7 节）
const allowed: Record<string, string> = {
  "packages/contracts/src/index.ts":
    "export type Paper = { id: string };\nexport const VERSION = 1;\n",
  "packages/ai/src/index.ts": "export const run = (): number => 1;\n",
  "packages/ui/src/card.ts": [
    'import type { Paper } from "../../contracts/src/index.ts";',
    "export const title = (paper: Paper): string => paper.id;",
    "",
  ].join("\n"),
  "apps/markets/src/page.ts": [
    'import type { Paper } from "../../../packages/contracts/src/index.ts";',
    'import { title } from "../../../packages/ui/src/card.ts";',
    'import { local } from "./local.ts";',
    "export const render = (paper: Paper): string => title(paper) + local;",
    "",
  ].join("\n"),
  "apps/markets/src/local.ts": 'export const local = "x";\n',
  "services/api/package.json": '{ "name": "@bowen-hub/api", "exports": { ".": "./src/app.ts" } }\n',
  "services/api/src/app.ts": [
    'import { VERSION } from "../../../packages/contracts/src/index.ts";',
    'import { run } from "../../../packages/ai/src/index.ts";',
    "export const app = VERSION + run();",
    "",
  ].join("\n"),
};

describe("dependency-cruiser 规则", () => {
  it("还没有 TS 源码：跳过", () => {
    const result = runDepcruise(tree({ "apps/markets/README.md": "x\n" }));
    expect(result.code).toBe(0);
    expect(result.output.join("\n")).toContain("跳过");
  });

  it("允许的依赖：通过", () => {
    const result = runDepcruise(tree(allowed));
    expect(result.output.join("\n")).toContain("no dependency violations found");
    expect(result.code).toBe(0);
  });

  it("每条规则都能拦住违规的导入", () => {
    const violations: Record<string, string> = {
      // apps-only-contracts-ui
      "apps/markets/src/api.ts":
        'import { app } from "../../../services/api/src/app.ts";\nexport const x = app;\n',
      "apps/markets/src/other-app.ts":
        'import { y } from "../../papers/src/y.ts";\nexport const x = y;\n',
      "apps/papers/src/y.ts": "export const y = 1;\n",
      "apps/console/src/ai.ts":
        'import { run } from "../../../packages/ai/src/index.ts";\nexport const x = run;\n',
      // 用包名导入（pnpm 工作区的软链接）也能认出来
      "apps/papers/src/by-name.ts":
        'import { app } from "@bowen-hub/api";\nexport const x = app;\n',
      // api-only-contracts-ai
      "services/api/src/ui.ts":
        'import { title } from "../../../packages/ui/src/card.ts";\nexport const x = title;\n',
      "services/api/src/app-code.ts":
        'import { run } from "../../../apps/console/src/ai.ts";\nexport const x = run;\n',
      // ui-only-contracts
      "packages/ui/src/ai.ts":
        'import { run } from "../../ai/src/index.ts";\nexport const x = run;\n',
      // ui-contracts-type-only
      "packages/ui/src/value.ts":
        'import { VERSION } from "../../contracts/src/index.ts";\nexport const x = VERSION;\n',
      // workspace-import-resolvable
      "apps/markets/src/missing.ts":
        'import { z } from "@bowen-hub/not-built";\nexport const x = z;\n',
    };
    const root = tree(
      { ...allowed, ...violations },
      { "apps/papers/node_modules/@bowen-hub/api": "../../../../services/api" },
    );
    const result = runDepcruise(root);
    const output = result.output.join("\n");
    expect(result.code).not.toBe(0);
    const expected: Array<[string, string]> = [
      ["apps-only-contracts-ui", "apps/markets/src/api.ts"],
      ["apps-only-contracts-ui", "apps/markets/src/other-app.ts"],
      ["apps-only-contracts-ui", "apps/console/src/ai.ts"],
      ["apps-only-contracts-ui", "apps/papers/src/by-name.ts"],
      ["api-only-contracts-ai", "services/api/src/ui.ts"],
      ["api-only-contracts-ai", "services/api/src/app-code.ts"],
      ["ui-only-contracts", "packages/ui/src/ai.ts"],
      ["ui-contracts-type-only", "packages/ui/src/value.ts"],
      ["workspace-import-resolvable", "apps/markets/src/missing.ts"],
    ];
    for (const [rule, file] of expected) {
      expect(output).toMatch(new RegExp(`${rule}: ${file.replaceAll(".", "\\.")}`));
    }
    // 允许的文件不应出现在违规里
    expect(output).not.toMatch(/: apps\/markets\/src\/page\.ts/);
    expect(output).not.toMatch(/: packages\/ui\/src\/card\.ts/);
  });
});
