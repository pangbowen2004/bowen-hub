import { expect, it } from "vitest";
import { getCatalog, getGraph, getPaper, getSearchIndex } from "./data";

it("读取真实公开样例且保持契约", async () => {
  expect((await getCatalog()).papers.every((p) => p.visibility === "public")).toBe(true);
  expect((await getPaper("arxiv-2505.07078")).status.visibility).toBe("public");
  await expect(getPaper("acl-2021.acl-long.500")).rejects.toThrow("公开论文不存在");
  expect((await getGraph()).nodes.length).toBeGreaterThan(0);
  expect((await getSearchIndex()).papers.length).toBeGreaterThan(0);
});

it("API模式调用公开客户端并透传失败，不用样例掩盖网络错误", async () => {
  const { vi } = await import("vitest");
  vi.resetModules();
  vi.stubEnv("DATA_SOURCE", "api");
  vi.stubEnv("HUB_API_URL", "http://api.example.invalid");
  const fetcher = vi.fn().mockRejectedValue(new Error("离线请求失败"));
  vi.stubGlobal("fetch", fetcher);
  try {
    const api = await import("./data");
    await expect(api.getCatalog()).rejects.toThrow("离线请求失败");
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("/v1/public/papers/catalog");
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  }
});
