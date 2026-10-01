import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { parse } from "yaml";

interface Workflow {
  on: {
    push: { branches: string[] };
    workflow_dispatch: unknown;
    repository_dispatch?: { types: string[] };
  };
  permissions: { contents: string };
  concurrency: { group: string; "cancel-in-progress": boolean };
  jobs: {
    deploy: {
      env: Record<string, string>;
      steps: {
        name: string;
        run?: string;
        env?: Record<string, string>;
        uses?: string;
        with?: { ref?: string };
      }[];
    };
  };
}
function workflow(site: string): Workflow {
  return parse(
    readFileSync(new URL(`../.github/workflows/deploy-${site}.yml`, import.meta.url), "utf8"),
  ) as Workflow;
}
describe("部署工作流", () => {
  for (const site of ["api", "console", "markets", "papers"]) {
    it(`${site}仅从main发布，不上传凭据或缓存环境文件`, () => {
      const value = workflow(site);
      expect(value.on.push.branches).toEqual(["main"]);
      expect(value.on).toHaveProperty("workflow_dispatch");
      expect(value.permissions.contents).toBe("read");
      expect(value.concurrency["cancel-in-progress"]).toBe(true);
      expect(value.jobs.deploy.env.CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV).toBe("false");
      expect(
        value.jobs.deploy.steps.find((step) => step.uses?.startsWith("actions/checkout"))?.with
          ?.ref,
      ).toBe("main");
      expect(value.jobs.deploy.steps.every((step) => !step.uses?.includes("upload-artifact"))).toBe(
        true,
      );
      expect(value.jobs.deploy.steps.map((step) => step.run).join("\n")).not.toContain(".env");
    });
  }
  it("控制台正式版与MSW预览分别构建", () => {
    const steps = workflow("console").jobs.deploy.steps;
    expect(
      steps.filter((step) => step.env?.VITE_USE_MOCKS).map((step) => step.env?.VITE_USE_MOCKS),
    ).toEqual(["0", "1"]);
    expect(
      steps.filter((step) => step.run?.includes("deploy-pages")).map((step) => step.run),
    ).toEqual([
      "mise exec -- pnpm --filter @bowen-hub/infra deploy-pages console production",
      "mise exec -- pnpm --filter @bowen-hub/infra deploy-pages console preview",
    ]);
  });
  for (const [site, event] of [
    ["markets", "markets-updated"],
    ["papers", "papers-changed"],
  ]) {
    it(`${site}数据触发读API，默认样例预览，生产由SITES_LIVE控制`, () => {
      const value = workflow(site ?? "");
      expect(value.on.repository_dispatch?.types).toEqual([event]);
      expect(value.jobs.deploy.env.DATA_SOURCE).toContain("'api'");
      expect(value.jobs.deploy.env.DATA_SOURCE).toContain("'fixtures'");
      expect(value.jobs.deploy.env.TARGET).toContain("vars.SITES_LIVE == 'true'");
      expect(value.jobs.deploy.env.TARGET).toContain("'preview'");
    });
  }
});
