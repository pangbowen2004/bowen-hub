import type { MarketEvent } from "@bowen-hub/contracts";
import { describe, expect, it } from "vitest";
import {
  chronological,
  combinedEvents,
  dateKey,
  isOngoing,
  monthWeeks,
  shiftMonth,
  weekBars,
} from "./calendar";

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
  it("只有超过14天或月份精度的事项移出每周横条", () => {
    expect(isOngoing(event("完整14天", "2026-10-01", "2026-10-14"))).toBe(false);
    expect(isOngoing(event("15天", "2026-10-01", "2026-10-15"))).toBe(true);
    for (const title of ["预计9—10月公布", "计划于10月推出", "预计2026年10月交付"])
      expect(isOngoing(event(title, "2026-10-01", "2026-10-01"))).toBe(true);
    expect(isOngoing(event("计划于10月8日发布", "2026-10-08", "2026-10-08"))).toBe(false);
  });
  it("美国事件按美东时刻排序，同一FOMC会议不重复", () => {
    const events = combinedEvents(
      [event("FOMC 会议", "2026-10-27", "2026-10-28")],
      [
        {
          kind: "fomc",
          date: "2026-10-28",
          at: "2026-10-28T18:00:00Z",
          fredReleaseId: 101,
          title: "FOMC 利率决议",
          tickers: [],
          timing: "14:00",
          importance: "high",
        },
        {
          kind: "earnings",
          date: "2026-10-28",
          at: null,
          fredReleaseId: null,
          title: "META",
          tickers: ["META"],
          timing: "amc",
          importance: "unspecified",
        },
        {
          kind: "macro",
          date: "2026-10-28",
          at: "2026-10-28T12:30:00Z",
          fredReleaseId: 10,
          title: "美国 CPI",
          tickers: [],
          timing: "08:30",
          importance: "high",
        },
      ],
    );
    expect(events).toHaveLength(3);
    expect(events.every((event) => event.market === "us")).toBe(true);
    expect(events.find((event) => event.title === "FOMC 会议")?.timing).toBe("10/28 美东 14:00");
    expect(events.slice(1).map((event) => event.title)).toEqual(["美国 CPI", "META 财报"]);
  });
});
