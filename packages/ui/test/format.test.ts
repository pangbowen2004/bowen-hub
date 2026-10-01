import { describe, expect, it } from "vitest";
import { cny, count, date, num, pct, pp, time, usd } from "../src/format/index";

describe("文档规定的格式化口径", () => {
  it("比例、百分点和正负号", () => {
    expect(pct(0.0123)).toBe("+1.23%");
    expect(pct(-0.01)).toBe("-1.00%");
    expect(pct(0)).toBe("0.00%");
    expect(pct(0.0123, { sign: false })).toBe("1.23%");
    expect(pp(0.031)).toBe("+3.1 个百分点");
  });
  it("人民币在万亿和百亿边界使用正确精度", () => {
    expect(cny(2117732336241)).toBe("2.1177 万亿");
    expect(cny(100e8)).toBe("100.0 亿");
    expect(cny(99e8)).toBe("99.00 亿");
    expect(cny(-100e8)).toBe("-100.0 亿");
    expect(cny(1e4)).toBe("1.00 万");
  });
  it("美元、计数与千分位", () => {
    expect(usd(1250000)).toBe("$1.25M");
    expect(count(83, "家")).toBe("83 家");
    expect(num(3952.18)).toBe("3,952.18");
  });
  it("日期和美东夏令时不受执行机器时区影响", () => {
    expect(date("2026-08-28")).toBe("2026-08-28（周五）");
    expect(time("2026-08-28T13:30:00Z", "America/New_York")).toBe("21:30（美东 09:30）");
    expect(time("2026-01-28T14:30:00Z", "America/New_York")).toBe("22:30（美东 09:30）");
  });
  it("缺失不是零", () => {
    for (const format of [pct, pp, cny, usd, num, count]) {
      expect(format(null)).toBe("—");
      expect(format(Number.NaN)).toBe("—");
    }
  });
});
