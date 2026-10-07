import { describe, expect, it } from "vitest";
import { safeReturn } from "./client";

describe("登录返回地址", () => {
  it("保留控制台内部路径，拒绝外站与反斜杠地址", () => {
    expect(safeReturn("?returnTo=%2Fmarkets%2Fevents")).toBe("/markets/events");
    for (const value of [
      "https://other.invalid",
      "//other.invalid",
      "/\\other.invalid",
      "/\n/other.invalid",
      "/\t/other.invalid",
      "/\r/other.invalid",
    ])
      expect(safeReturn(`?returnTo=${encodeURIComponent(value)}`)).toBe("/");
  });
});
