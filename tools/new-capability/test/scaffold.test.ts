import { mkdir, mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, it } from "vitest";
import { scaffold } from "../src/scaffold";

it("真实临时仓库模板生成与防覆盖", async () => {
  const root = await mkdtemp(join(tmpdir(), "t04-scaffold-"));
  try {
    await mkdir(join(root, "contracts"));
    const { writeFile } = await import("node:fs/promises");
    await writeFile(join(root, "contracts/capabilities.tsp"), "// 契约入口\n");
    const paths = await scaffold(root, "fixture.summary");
    expect(paths).toHaveLength(6);
    expect(await readFile(join(root, "capabilities/fixture.summary.yaml"), "utf8")).toContain(
      "autonomy: L0",
    );
    expect(await readFile(join(root, "evals/fixture.summary/cases.yaml"), "utf8")).toContain("[]");
    expect(await readFile(join(root, "contracts/capabilities.tsp"), "utf8")).toContain(
      "fixture_summary.tsp",
    );
    await expect(scaffold(root, "fixture.summary")).rejects.toThrow("不覆盖");
    await expect(scaffold(root, "../escape")).rejects.toThrow("domain.name");
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
