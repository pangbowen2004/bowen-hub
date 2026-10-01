import { existsSync, readFileSync, symlinkSync } from "node:fs";
import { join } from "node:path";
import { afterEach, describe, expect, it } from "vitest";
import { ASTRO_SUFFIX } from "../src/astro.ts";
import { runDepcruise } from "../src/depcruise.ts";
import { cleanup, tree } from "./helpers.ts";

afterEach(cleanup);

const api = {
  "services/api/package.json": '{"name":"@bowen-hub/api","exports":"./src/app.ts"}',
  "services/api/src/app.ts": "export const app = 1;\n",
};
const page = "apps/markets/src/page.astro";
const astro = (code: string): string => `---\n${code}\n---\n<div>测试</div>\n`;

function reject(
  files: Record<string, string>,
  expected: string,
  links: Record<string, string> = {},
): void {
  const result = runDepcruise(tree(files, links));
  expect(result.code).toBe(1);
  expect(result.output.join("\n")).toContain(expected);
}

describe("Astro 依赖规则", () => {
  it("只有 Astro 的应用也检查，同应用组件和模板中的普通文本不误报", () => {
    const root = tree({
      [page]:
        astro('import Card from "./Card.astro";') +
        '<!-- import x from "@bowen-hub/api" -->\n<script type="application/ld+json">{"text":"import x from api"}</script>',
      "apps/markets/src/Card.astro": "<p>卡片</p>",
    });
    const result = runDepcruise(root);
    expect(result.code).toBe(0);
    expect(result.output.join("\n")).toContain("no dependency violations found");
    expect(result.output.join("\n")).not.toContain("跳过");
    expect(existsSync(join(root, `${page}${ASTRO_SUFFIX}`))).toBe(false);
    expect(readFileSync(join(root, "apps/markets/src/Card.astro"), "utf8")).toBe("<p>卡片</p>");
  });

  it("frontmatter 的相对导入不能引用 API", () => {
    reject(
      { ...api, [page]: astro('import { app } from "../../../services/api/src/app.ts";') },
      `apps-only-contracts-ui: ${page} → services/api/src/app.ts`,
    );
  });

  it.each(["relative", "absolute"])("工作区包名经 %s 软链接仍映射到副本的 services/api", (kind) => {
    const root = tree({
      ...api,
      [page]: astro('import { app } from "@bowen-hub/api";'),
      "apps/markets/node_modules/@bowen-hub/.keep": "",
    });
    symlinkSync(
      kind === "relative" ? "../../../../services/api" : join(root, "services/api"),
      join(root, "apps/markets/node_modules/@bowen-hub/api"),
    );
    const result = runDepcruise(root);
    expect(result.code).toBe(1);
    expect(result.output.join("\n")).toContain(
      `apps-only-contracts-ui: ${page} → services/api/src/app.ts`,
    );
    expect(result.output.join("\n")).not.toContain(root);
  });

  it("Astro → Astro 不能跨应用", () => {
    reject(
      {
        [page]: astro('import Other from "../../papers/src/Page.astro";'),
        "apps/papers/src/Page.astro": "<p>另一个应用</p>",
      },
      `apps-only-contracts-ui: ${page} → apps/papers/src/Page.astro`,
    );
  });

  it("UI Astro → Astro 不能引用 AI 包", () => {
    reject(
      {
        "packages/ui/src/Card.astro": astro('import Other from "../../ai/src/Other.astro";'),
        "packages/ai/src/Other.astro": "<p>非法依赖</p>",
      },
      "ui-only-contracts: packages/ui/src/Card.astro → packages/ai/src/Other.astro",
    );
  });

  it("UI 的 import type 合法，值导入被原规则拒绝", () => {
    const contracts = {
      "packages/contracts/src/index.ts":
        "export type Paper = { id: string };\nexport const VERSION = 1;\n",
    };
    const valid = runDepcruise(
      tree({
        ...contracts,
        "packages/ui/src/Card.astro": astro(
          'import type { Paper } from "../../contracts/src/index.ts";\nconst paper: Paper = { id: "x" };',
        ),
      }),
    );
    expect(valid.code).toBe(0);
    reject(
      {
        ...contracts,
        "packages/ui/src/Card.astro": astro(
          'import { VERSION } from "../../contracts/src/index.ts";',
        ),
      },
      "ui-contracts-type-only: packages/ui/src/Card.astro → packages/contracts/src/index.ts",
    );
  });

  it.each([
    '<script>import { app } from "../../../services/api/src/app.ts";</script>',
    '<script type="module">import("../../../services/api/src/app.ts");</script>',
    '<script type="text/javascript">import("../../../services/api/src/app.ts");</script>',
    '<script src="../../../services/api/src/app.ts"/>',
    '{(await import("../../../services/api/src/app.ts")).app}',
  ])("脚本和模板中的导入同样受检查：%s", (source) => {
    reject({ ...api, [page]: source }, `apps-only-contracts-ui: ${page} → services/api/src/app.ts`);
  });

  it("不存在的工作区导入不能静默跳过", () => {
    reject(
      { [page]: astro('import x from "@bowen-hub/missing";') },
      `workspace-import-resolvable: ${page}`,
    );
  });

  it.each([astro("import { ???"), "<script>import { ???</script>"])(
    "Astro 或脚本解析失败时返回非零",
    (source) => {
      reject({ [page]: source }, `Astro 检查失败：${page}`);
    },
  );
});
