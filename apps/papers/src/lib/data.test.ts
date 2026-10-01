import { expect, it } from "vitest";
import { getCatalog, getGraph, getPaper, getSearchIndex } from "./data";

it("读取真实公开样例且保持契约", async () => {
  expect((await getCatalog()).papers.every((p) => p.visibility === "public")).toBe(true);
  expect((await getPaper("arxiv-2505.07078")).status.visibility).toBe("public");
  await expect(getPaper("acl-2021.acl-long.500")).rejects.toThrow("公开论文不存在");
  expect((await getGraph()).nodes.length).toBeGreaterThan(0);
  expect((await getSearchIndex()).papers.length).toBeGreaterThan(0);
});
