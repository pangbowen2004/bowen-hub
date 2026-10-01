import { describe, expect, it } from "vitest";
import { findRoutesScript } from "../src/routes-hook.ts";

describe("API 路由骨架的生成脚本（预检 Q08）", () => {
  it("没有脚本就跳过", () => {
    expect(findRoutesScript("/repo/services/api/scripts", [])).toBeUndefined();
    expect(findRoutesScript("/repo/services/api/scripts", ["seed.ts"])).toBeUndefined();
  });

  it("找到 gen-routes.*", () => {
    expect(findRoutesScript("/repo/scripts", ["gen-routes.ts", "seed.ts"])).toBe(
      "/repo/scripts/gen-routes.ts",
    );
  });

  it("有多个或扩展名不能用 node 运行时报错", () => {
    expect(() => findRoutesScript("/s", ["gen-routes.ts", "gen-routes.mjs"])).toThrow(/多个/);
    expect(() => findRoutesScript("/s", ["gen-routes.py"])).toThrow(/node/);
  });
});
