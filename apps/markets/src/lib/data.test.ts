import { expect, it } from "vitest";
import { getDay, getReference, listDays } from "./data";

it("读取真实公开样例且保持契约", async () => {
  expect((await getDay()).date).toBe("2026-08-28");
  expect(await listDays()).toHaveLength(2);
  expect((await getReference()).directions).toHaveLength(16);
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
    await expect(api.getDay()).rejects.toThrow("离线请求失败");
    expect(String(fetcher.mock.calls[0]?.[0])).toContain("/v1/public/markets/days/latest");
  } finally {
    vi.unstubAllEnvs();
    vi.unstubAllGlobals();
    vi.resetModules();
  }
});
