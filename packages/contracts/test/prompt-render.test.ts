// fixtures/samples/prompt-render/ 的向量格式完整（渲染本身由 T04 的两个渲染器对照，见该目录的 README.md）。
import { existsSync, readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { readJson, SAMPLES } from "./support/repo";

const DIR = join(SAMPLES, "prompt-render");
const vectors = readdirSync(DIR, { withFileTypes: true })
  .filter((entry) => entry.isDirectory())
  .map((entry) => entry.name)
  .sort();

describe("提示词渲染测试向量", () => {
  it("有向量，也有说明", () => {
    expect(vectors.length).toBeGreaterThan(0);
    expect(existsSync(join(DIR, "README.md"))).toBe(true);
  });

  it.each(vectors)("%s：template.md、input.json、expected.json 齐全且格式对", (name) => {
    const template = readFileSync(join(DIR, name, "template.md"), "utf8");
    expect(template).toMatch(/^## system\s*$/m);
    expect(template).toMatch(/^## user\s*$/m);
    const input = readJson(join(DIR, name, "input.json"));
    expect(typeof input === "object" && input !== null && !Array.isArray(input)).toBe(true);
    const expected = readJson(join(DIR, name, "expected.json")) as Record<string, unknown>;
    expect(Object.keys(expected).sort()).toEqual(["system", "user"]);
    expect(typeof expected.system).toBe("string");
    expect(typeof expected.user).toBe("string");
  });
});
