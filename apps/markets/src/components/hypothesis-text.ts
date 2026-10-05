import type { Hypothesis } from "@bowen-hub/contracts";
import { cny, pct } from "@bowen-hub/ui/format";

export const ruleLabels: Record<string, string> = {
  MARKET_PERSISTENCE: "市场持续性",
  LIMIT_ECOLOGY: "涨停生态",
  DIRECTION_PERSISTENCE: "强势方向延续",
  DIRECTION_REPAIR: "弱势方向修复",
  DIRECTION_SPREAD: "方向剪刀差",
  manual: "手写（无规则）",
};
export const resultLabels: Record<string, string> = {
  PENDING: "待结算",
  CONFIRMED: "已确认",
  NOT_CONFIRMED: "未确认",
  INCONCLUSIVE: "证据不足",
};
const metricLabels: Record<string, string> = {
  relativeVsAllA: "相对全 A",
  advanceShare: "上涨宽度",
  aboveMa20Share: "均线上方占比",
  medianReturn1d: "成员涨跌中位数",
  amountShare: "成交占比",
  turnoverCny: "成交额",
  sealRate: "封板率",
  multiBoardCount: "连板数量",
  limitDownCount: "跌停数量",
  spread: "强弱差",
  strongRelative: "强势方向相对全 A",
  weakRelative: "弱势方向相对全 A",
  weakAdvanceShare: "弱势方向上涨宽度",
};
export function actualText(actual: Hypothesis["actual"]): string {
  if (!actual) return "";
  return Object.entries(actual)
    .flatMap(([key, value]) => {
      const label = metricLabels[key];
      if (!label || typeof value !== "number") return [];
      const text =
        key === "turnoverCny"
          ? cny(value)
          : key.endsWith("Count")
            ? `${value} 家`
            : key === "spread"
              ? `${(value * 100).toFixed(1)} 个百分点`
              : pct(value, {
                  digits: 1,
                  sign: [
                    "relativeVsAllA",
                    "medianReturn1d",
                    "strongRelative",
                    "weakRelative",
                  ].includes(key),
                });
      return [`${label} ${text}`];
    })
    .join("、");
}
export function resultNote(row: Hypothesis): string {
  // 历史记录保持原始结果，阅读层按保存的规则、结果及实际值展示中文。
  const actual = actualText(row.actual);
  if (row.rule && actual && row.result !== "PENDING") {
    return `${ruleLabels[row.rule.type]}按 ${row.dueOn} 收盘结算为${resultLabels[row.result]}；实际：${actual}`;
  }
  let text = row.resultNote;
  for (const [key, label] of Object.entries({ ...ruleLabels, ...resultLabels, ...metricLabels }))
    text = text.replaceAll(new RegExp(`\\b${key}\\b`, "g"), label);
  return text
    .replace(/(?:、|；)?\s*membershipAsOf=[^、；]*/g, "")
    .replaceAll("Research Error", "未确认判断");
}
