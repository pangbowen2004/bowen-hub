import type { MarketEvent } from "@bowen-hub/contracts";
import { describe, expect, it } from "vitest";
import { chronological, dateKey, monthWeeks, shiftMonth, weekBars } from "./calendar";

const event = (id: string, startDate: string, endDate: string): MarketEvent => ({
  id,
  title: id,
  startDate,
  endDate,
  sourceLabel: "测试",
  sourceUrl: null,
  confirmation: "确认",
  invalidation: "失效",
  status: "pending",
  watchItems: [],
  aShareMappings: [],
});
describe("月历", () => {
  it("周一开始且覆盖月首月末，跨年切月", () => {
    const weeks = monthWeeks(new Date("2026-10-01T00:00:00Z"));
    expect(weeks).toHaveLength(5);
    expect(weeks.every((week) => week.length === 7 && week[0]!.getUTCDay() === 1)).toBe(true);
    expect(dateKey(weeks[0]![0]!)).toBe("2026-09-28");
    expect(dateKey(weeks[4]![6]!)).toBe("2026-11-01");
    expect(dateKey(shiftMonth(new Date("2026-12-01"), 1))).toBe("2027-01-01");
    expect(monthWeeks(new Date("2026-03-01"))).toHaveLength(6);
  });
  it("多日事件按周裁剪，重叠占不同轨道，首尾日都包含", () => {
    const days = monthWeeks(new Date("2026-10-01"))[0]!;
    const bars = weekBars(days, [
      event("long", "2026-09-26", "2026-10-08"),
      event("same", "2026-10-01", "2026-10-01"),
      event("next", "2026-10-02", "2026-10-02"),
      event("outside", "2026-10-06", "2026-10-07"),
    ]);
    expect(bars).toHaveLength(3);
    expect(bars[0]).toMatchObject({
      start: 0,
      end: 6,
      lane: 0,
      continuesBefore: true,
      continuesAfter: true,
    });
    expect(bars[1]).toMatchObject({ start: 3, end: 3, lane: 1 });
    expect(bars[2]).toMatchObject({ start: 4, end: 4, lane: 1 });
  });
  it("列表按日期从早到晚，读取不改变数据", () => {
    const rows = [
      event("late", "2026-10-12", "2026-10-13"),
      event("early", "2026-10-08", "2026-10-08"),
    ];
    expect(chronological(rows).map((row) => row.id)).toEqual(["early", "late"]);
    expect(rows[0]!.id).toBe("late");
  });
});
