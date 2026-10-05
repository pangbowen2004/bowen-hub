import type { Hypothesis } from "@bowen-hub/contracts";
import { expect, it } from "vitest";
import { actualText, resultNote } from "./hypothesis-text";

it("历史结算展示中文事实，不暴露实现字段", () => {
  const row = {
    rule: { type: "DIRECTION_REPAIR" },
    result: "CONFIRMED",
    dueOn: "2026-09-30",
    resultNote: "规则 DIRECTION_REPAIR 结算为 CONFIRMED；实际：relativeVsAllA=3.2%",
    actual: {
      relativeVsAllA: 0.032,
      advanceShare: 0.867,
      medianReturn1d: 0.02,
      amountShare: 0.08,
      membershipAsOf: "2026-09-30",
    },
  } as Hypothesis;
  expect(resultNote(row)).toContain("弱势方向修复");
  expect(resultNote(row)).toContain("已确认");
  expect(actualText(row.actual)).toContain("相对全 A +3.2%");
  expect(actualText(row.actual)).toContain("上涨宽度 86.7%");
  expect(resultNote(row)).not.toMatch(/DIRECTION_REPAIR|CONFIRMED|membershipAsOf|relativeVsAllA/);
});

it("没有实际数值时保留证据不足的具体原因", () => {
  const row = {
    rule: { type: "DIRECTION_REPAIR" },
    result: "INCONCLUSIVE",
    dueOn: "2026-09-30",
    resultNote: "方向数据未就绪，结算为 INCONCLUSIVE。",
    actual: { membershipAsOf: "2026-09-30" },
  } as Hypothesis;
  expect(resultNote(row)).toBe("方向数据未就绪，结算为 证据不足。");
});
