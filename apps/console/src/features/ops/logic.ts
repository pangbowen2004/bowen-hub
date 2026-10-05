// 运维页的纯函数：预算、耗时、统计展示、评测分组与走势。不碰网络与界面，便于单元测试。
import type { CapabilityInfo, EvalResult, Run } from "@bowen-hub/contracts";
import { num } from "@bowen-hub/ui";

/** 本月 AI 费用与月度预算（docs/10 第 4 节：超过只提醒，不自动降级）。 */
export function budgetState(costUsd: number, budgetUsd: number) {
  if (!(budgetUsd > 0)) return { configured: false, ratio: 0, over: false, remainingUsd: 0 };
  return {
    configured: true,
    ratio: costUsd / budgetUsd,
    over: costUsd > budgetUsd,
    remainingUsd: budgetUsd - costUsd,
  };
}

/** 金额：1 美元以上两位小数，以下四位，免得每次几厘钱的调用都显示成 $0.00。 */
export function money(value: number): string {
  return `$${num(value, Math.abs(value) >= 1 ? 2 : 4)}`;
}

/** 新加坡时间（UTC+8）的“年-月-日 时:分”；无法解析时用破折号，不当作零。 */
export function formatTime(iso: string | null | undefined): string {
  if (!iso) return "—";
  const date = new Date(iso);
  if (!Number.isFinite(date.getTime())) return "—";
  const part = (type: Intl.DateTimeFormatPartTypes, parts: Intl.DateTimeFormatPart[]) =>
    parts.find((item) => item.type === type)?.value ?? "";
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Singapore",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(date);
  return `${part("year", parts)}-${part("month", parts)}-${part("day", parts)} ${part("hour", parts)}:${part("minute", parts)}`;
}

/** 毫秒转成“7 分 23 秒”这样的读法。 */
export function durationText(ms: number | null | undefined): string {
  if (ms == null || !Number.isFinite(ms) || ms < 0) return "—";
  const seconds = Math.round(ms / 1000);
  if (seconds < 1) return `${Math.round(ms)} 毫秒`;
  if (seconds < 60) return `${seconds} 秒`;
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} 分 ${seconds % 60} 秒`;
  return `${Math.floor(minutes / 60)} 小时 ${minutes % 60} 分`;
}

/** 一次运行的耗时：还没结束写“运行中”，时间对不上写破折号。 */
export function runDuration(run: Pick<Run, "startedAt" | "finishedAt" | "status">): string {
  if (run.finishedAt === null) return run.status === "running" ? "运行中" : "—";
  return durationText(Date.parse(run.finishedAt) - Date.parse(run.startedAt));
}

export const runStatusLabel = { running: "运行中", succeeded: "成功", failed: "失败" } as const;

/** 统计里每一项都是任务自己决定写的：简单值原样显示，对象和数组压成一行 JSON。 */
export function statEntries(stats: Run["stats"]): [string, string][] {
  return Object.entries(stats).map(([key, value]) => {
    if (typeof value === "string") return [key, value];
    if (typeof value === "number" || typeof value === "boolean" || value === null)
      return [key, String(value)];
    const text = JSON.stringify(value) ?? String(value);
    return [key, text.length > 120 ? `${text.slice(0, 117)}…` : text];
  });
}

/** 评测结果按能力分组，每组按评测时间从旧到新（走势图从左到右）。 */
export function groupEvals(results: EvalResult[]): Map<string, EvalResult[]> {
  const groups = new Map<string, EvalResult[]>();
  for (const result of results)
    groups.set(result.capability, [...(groups.get(result.capability) ?? []), result]);
  for (const list of groups.values()) list.sort((a, b) => a.at.localeCompare(b.at));
  return groups;
}

export interface ScoreRow {
  name: string;
  /** 最近一次评测里的得分；这次没有这个评分器时为 null */
  value: number | null;
  /** 清单里的最低要求；清单没有要求时为 null */
  threshold: number | null;
  /** 是否达标；任何一边缺失时为 null（不判断） */
  met: boolean | null;
  /** 与上一次评测相比的变化；没有上一次时为 null */
  change: number | null;
  /** 历次评测的得分（旧 → 新），没有这个评分器的次数跳过 */
  series: number[];
}

/** 评分器清单 = 清单要求的评分器 + 最近一次评测里出现的评分器；顺序先要求后其他。 */
export function scoreRows(
  thresholds: CapabilityInfo["evals"]["thresholds"],
  history: EvalResult[],
): ScoreRow[] {
  const latest = history.at(-1);
  const previous = history.at(-2);
  const names = [...new Set([...Object.keys(thresholds), ...Object.keys(latest?.scores ?? {})])];
  return names.map((name) => {
    const value = latest?.scores[name] ?? null;
    const threshold = thresholds[name] ?? null;
    const before = previous?.scores[name];
    return {
      name,
      value,
      threshold,
      met: value === null || threshold === null ? null : value >= threshold,
      change: value === null || before === undefined ? null : value - before,
      series: history.flatMap((item) => {
        const score = item.scores[name];
        return score === undefined ? [] : [score];
      }),
    };
  });
}

export type EvalStatus = "none" | "passed" | "failed";
export const evalStatus = (latest: EvalResult | null): EvalStatus =>
  latest === null ? "none" : latest.passed ? "passed" : "failed";

/** 概要数字：未达标与未评测的能力数。 */
export function evalCounts(capabilities: Pick<CapabilityInfo, "latestEval">[]) {
  const counts = { passed: 0, failed: 0, none: 0 };
  for (const item of capabilities) counts[evalStatus(item.latestEval)]++;
  return counts;
}
