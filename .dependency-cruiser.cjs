// TypeScript 依赖规则：逐条对应 docs/01 第 7 节的表。
// 由 mise run check:arch 执行（tools/arch/src/depcruise.ts）：只检查 apps/、services/、packages/，
// 规则按目录写，包还不存在时自然不匹配，包出现后自动生效。
// 工作区包之间请用包名导入（如 @bowen-hub/contracts），包的 exports 指向能解析到的源码或产物。
/** @type {import('dependency-cruiser').IConfiguration} */
module.exports = {
  forbidden: [
    {
      name: "apps-only-contracts-ui",
      comment:
        "docs/01 第 7 节：apps/* 只能依赖 packages/contracts、packages/ui（不能依赖别的应用、services/、其他 packages/）",
      severity: "error",
      from: { path: "^apps/([^/]+)/" },
      to: {
        path: "^(apps|services|packages)/",
        pathNot: ["^apps/$1/", "^packages/(contracts|ui)/"],
      },
    },
    {
      name: "api-only-contracts-ai",
      comment: "docs/01 第 7 节：services/api 只能依赖 packages/contracts、packages/ai",
      severity: "error",
      from: { path: "^services/api/" },
      to: {
        path: "^(apps|services|packages)/",
        pathNot: ["^services/api/", "^packages/(contracts|ai)/"],
      },
    },
    {
      name: "ui-only-contracts",
      comment: "docs/01 第 7 节：packages/ui 只能依赖 packages/contracts",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: {
        path: "^(apps|services|packages)/",
        pathNot: ["^packages/(ui|contracts)/"],
      },
    },
    {
      name: "ui-contracts-type-only",
      comment: "docs/01 第 7 节：packages/ui 对 packages/contracts 只引用类型（写 import type）",
      severity: "error",
      from: { path: "^packages/ui/" },
      to: { path: "^packages/contracts/", dependencyTypesNot: ["type-only"] },
    },
    {
      name: "workspace-import-resolvable",
      comment:
        "工作区包的导入必须能解析到文件，否则上面的规则看不到它（检查 package.json 的 exports，或包还没建出来）",
      severity: "error",
      from: {},
      to: { couldNotResolve: true, path: "^@bowen-hub/" },
    },
  ],
  options: {
    doNotFollow: { path: "node_modules" },
    exclude: { path: "(^|/)(node_modules|dist|\\.astro|\\.turbo|\\.wrangler|storybook-static)/" },
    tsPreCompilationDeps: true,
    enhancedResolveOptions: {
      exportsFields: ["exports"],
      conditionNames: ["import", "require", "node", "default", "types"],
      extensions: [".ts", ".tsx", ".d.ts", ".mts", ".cts", ".js", ".jsx", ".mjs", ".cjs"],
      mainFields: ["module", "main", "types", "typings"],
    },
  },
};
