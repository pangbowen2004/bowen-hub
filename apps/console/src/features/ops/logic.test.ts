import type { EvalResult } from "@bowen-hub/contracts";
import { describe, expect, it } from "vitest";
import {
  budgetState,
  durationText,
  evalCounts,
  formatTime,
  groupEvals,
  money,
  runDuration,
  scoreRows,
  statEntries,
} from "./logic";

const result = (
  at: string,
  scores: Record<string, number>,
  changes: Partial<EvalResult> = {},
): EvalResult => ({
  capability: "papers.qa",
  model: "openai/gpt-6-luna",
  datasetVersion: "1",
  scores,
  passed: true,
  at,
  ...changes,
});

describe("预算", () => {
  it("按比例判断，刚好等于预算不算超", () => {
    expect(budgetState(5, 20)).toEqual({
      configured: true,
      ratio: 0.25,
      over: false,
      remainingUsd: 15,
    });
    expect(budgetState(20, 20).over).toBe(false);
    expect(budgetState(20.01, 20).over).toBe(true);
    expect(budgetState(1, 0)).toMatchObject({ configured: false, over: false });
  });
  it("金额：一美元以上两位小数，以下四位", () => {
    expect(money(3.84)).toBe("$3.84");
    expect(money(0.000911)).toBe("$0.0009");
    expect(money(0)).toBe("$0.0000");
  });
});

describe("时间与耗时", () => {
  it("按新加坡时间显示，跨日也对", () => {
    expect(formatTime("2026-09-29T23:10:42Z")).toBe("2026-09-30 07:10");
    expect(formatTime("2026-10-02T16:30:00.000Z")).toBe("2026-10-03 00:30");
    expect(formatTime(null)).toBe("—");
    expect(formatTime("不是时间")).toBe("—");
  });
  it("耗时的读法", () => {
    expect(durationText(450)).toBe("450 毫秒");
    expect(durationText(8_000)).toBe("8 秒");
    expect(durationText(443_000)).toBe("7 分 23 秒");
    expect(durationText(3_900_000)).toBe("1 小时 5 分");
    expect(durationText(-1)).toBe("—");
    expect(durationText(null)).toBe("—");
  });
  it("没结束的运行显示运行中，结束时间早于开始时间显示破折号", () => {
    const base = { startedAt: "2026-10-02T00:00:00Z", status: "succeeded" as const };
    expect(runDuration({ ...base, finishedAt: "2026-10-02T00:07:23Z" })).toBe("7 分 23 秒");
    expect(runDuration({ ...base, status: "running", finishedAt: null })).toBe("运行中");
    expect(runDuration({ ...base, finishedAt: "2026-10-01T23:00:00Z" })).toBe("—");
  });
  it("统计里的对象与数组压成一行，过长截断", () => {
    expect(statEntries({ n: 1, ok: true, name: "x", empty: null, nested: { a: [1, 2] } })).toEqual([
      ["n", "1"],
      ["ok", "true"],
      ["name", "x"],
      ["empty", "null"],
      ["nested", '{"a":[1,2]}'],
    ]);
    expect(statEntries({ long: "x".repeat(300).split("") })[0]?.[1]).toHaveLength(118);
  });
});

describe("评测走势", () => {
  const history =
    groupEvals([
      result("2026-10-03T00:00:00Z", { schema_valid: 1, judge_faithful: 0.9, extra: 0.5 }),
      result("2026-09-19T00:00:00Z", { schema_valid: 0.95, judge_faithful: 0.97 }),
      result("2026-09-26T00:00:00Z", { schema_valid: 1, judge_faithful: 0.99 }),
    ]).get("papers.qa") ?? [];
  it("分组后按评测时间从旧到新", () => {
    expect(history.map((item) => item.at.slice(0, 10))).toEqual([
      "2026-09-19",
      "2026-09-26",
      "2026-10-03",
    ]);
  });
  it("评分行：先清单要求的，再其他；是否达标、与上次的变化、历次得分", () => {
    const rows = scoreRows({ judge_faithful: 0.9, schema_valid: 1, missing_scorer: 0.8 }, history);
    expect(rows.map((row) => row.name)).toEqual([
      "judge_faithful",
      "schema_valid",
      "missing_scorer",
      "extra",
    ]);
    const faithful = rows[0];
    expect(faithful).toMatchObject({ value: 0.9, threshold: 0.9, met: true });
    expect(faithful?.change).toBeCloseTo(-0.09);
    expect(faithful?.series).toEqual([0.97, 0.99, 0.9]);
    // 清单要求但这次评测没有这个评分器：不判断达标。
    expect(rows[2]).toMatchObject({
      value: null,
      threshold: 0.8,
      met: null,
      change: null,
      series: [],
    });
    // 评测里有、清单没要求：只展示。
    expect(rows[3]).toMatchObject({ value: 0.5, threshold: null, met: null });
  });
  it("低于门槛判未达标；只有一次评测时没有变化量", () => {
    const rows = scoreRows({ a: 0.9 }, [result("2026-10-03T00:00:00Z", { a: 0.8995 })]);
    expect(rows[0]).toMatchObject({ met: false, change: null });
    expect(scoreRows({ a: 0.9 }, [])[0]).toMatchObject({ value: null, met: null });
  });
  it("统计通过、未达标与未评测的能力数", () => {
    expect(
      evalCounts([
        { latestEval: null },
        { latestEval: result("2026-10-03T00:00:00Z", {}) },
        { latestEval: result("2026-10-03T00:00:00Z", {}, { passed: false }) },
        { latestEval: result("2026-10-03T00:00:00Z", {}, { passed: false }) },
      ]),
    ).toEqual({ passed: 1, failed: 2, none: 1 });
  });
});
