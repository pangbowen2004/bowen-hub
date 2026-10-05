import type { AiUsageDay } from "@bowen-hub/contracts";
import { Button, count, date, num, pct } from "@bowen-hub/ui";
import { useState } from "react";
import { budgetState, money } from "./logic";
import { useUsage } from "./queries";
import { SectionState } from "./SectionState";

const WINDOWS = [7, 30, 90] as const;

/** 每天一根柱，高度按窗口内最高的一天；每根柱的 <title> 给出具体数字。 */
function DailyBars({ days }: { days: AiUsageDay[] }) {
  const width = 640;
  const height = 96;
  const peak = Math.max(...days.map((day) => day.costUsd), 0);
  const slot = width / Math.max(days.length, 1);
  return (
    <figure className="ops-bars">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        role="img"
        aria-label={`最近有调用的 ${days.length} 天，每天的 AI 费用`}
        preserveAspectRatio="none"
      >
        {days.map((day, index) => {
          const bar = peak > 0 ? Math.max((day.costUsd / peak) * (height - 8), 2) : 2;
          return (
            <rect
              key={day.date}
              x={index * slot + slot * 0.15}
              y={height - bar}
              width={slot * 0.7}
              height={bar}
              fill="currentColor"
            >
              <title>{`${date(day.date)} · ${money(day.costUsd)} · ${count(day.calls)} 次调用`}</title>
            </rect>
          );
        })}
      </svg>
      <figcaption className="muted">
        每日费用（没有调用的日子不画）；单位美元，鼠标悬停或点按看具体数字。
      </figcaption>
    </figure>
  );
}

export function UsageSection() {
  const [days, setDays] = useState<number>(30);
  const query = useUsage(days);
  const data = query.data;
  const budget = data ? budgetState(data.monthCostUsd, data.monthlyBudgetUsd) : null;
  const byCapability = data ? [...data.byCapability].sort((a, b) => b.costUsd - a.costUsd) : [];
  return (
    <section className="ops-section" aria-labelledby="ops-usage">
      <h2 id="ops-usage">AI 用量与费用</h2>
      <p className="muted">
        日期和“本月”都按新加坡时间（UTC+8）。费用只统计新增的 API 账单；用 ChatGPT
        套餐运行的调用，费用记为 0，token 数照实记录。
      </p>
      <fieldset className="ops-toggle">
        <legend className="sr-only">统计窗口</legend>
        {WINDOWS.map((value) => (
          <Button key={value} aria-pressed={days === value} onClick={() => setDays(value)}>
            最近 {value} 天
          </Button>
        ))}
      </fieldset>
      <SectionState loading={query.isPending} error={query.error} retry={query.refetch} />
      {data && budget && (
        <>
          <div className="ops-budget" data-over={budget.over}>
            <p className="eyebrow">本月（UTC+8）</p>
            <p className="ops-budget-figure">
              <strong>{money(data.monthCostUsd)}</strong> / 月度预算 {money(data.monthlyBudgetUsd)}
              {budget.configured && (
                <span className="muted">
                  {" "}
                  · 已用 {pct(budget.ratio, { sign: false, digits: 0 })}
                </span>
              )}
            </p>
            {budget.configured && (
              <div
                className="ops-meter"
                role="img"
                aria-label={`本月已用月度预算的 ${pct(budget.ratio, { sign: false, digits: 0 })}`}
              >
                <div style={{ width: `${Math.min(budget.ratio, 1) * 100}%` }} />
              </div>
            )}
            {budget.over ? (
              <p className="ops-over" role="alert">
                本月 AI 费用已超过月度预算，超出 {money(-budget.remainingUsd)}
                。只提醒，不会自动降级模型。
              </p>
            ) : (
              budget.configured && (
                <p className="muted">
                  本月还剩 {money(budget.remainingUsd)}；超过预算只提醒，不会自动降级。
                </p>
              )
            )}
          </div>
          <div className="stat-row">
            <p>
              <strong>{count(data.total.calls)}</strong>最近 {data.days} 天调用次数
            </p>
            <p>
              <strong>{count(data.total.failedCalls)}</strong>
              失败
              {data.total.calls > 0 &&
                `（${pct(data.total.failedCalls / data.total.calls, { sign: false, digits: 1 })}）`}
            </p>
            <p>
              <strong>{num(data.total.inputTokens, 0)}</strong>输入 token
            </p>
            <p>
              <strong>{num(data.total.outputTokens, 0)}</strong>输出 token
            </p>
            <p>
              <strong>{money(data.total.costUsd)}</strong>窗口内费用
            </p>
          </div>
          {data.byDay.length > 0 ? (
            <DailyBars days={data.byDay} />
          ) : (
            <p>这个窗口里没有 AI 调用。</p>
          )}
          <h3>按能力</h3>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">按能力汇总的 AI 用量</caption>
              <thead>
                <tr>
                  <th scope="col">能力</th>
                  <th scope="col" className="number">
                    调用
                  </th>
                  <th scope="col" className="number">
                    失败
                  </th>
                  <th scope="col" className="number">
                    输入 token
                  </th>
                  <th scope="col" className="number">
                    输出 token
                  </th>
                  <th scope="col" className="number">
                    费用
                  </th>
                </tr>
              </thead>
              <tbody>
                {byCapability.map((row) => (
                  <tr key={row.capability}>
                    <th scope="row" className="ops-mono">
                      {row.capability}
                    </th>
                    <td className="number">{count(row.calls)}</td>
                    <td className="number">{count(row.failedCalls)}</td>
                    <td className="number">{num(row.inputTokens, 0)}</td>
                    <td className="number">{num(row.outputTokens, 0)}</td>
                    <td className="number">{money(row.costUsd)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          {byCapability.length === 0 && <p>没有按能力的记录。</p>}
          <details>
            <summary>逐日明细（{data.byDay.length} 天）</summary>
            <div className="table-wrap">
              <table>
                <caption className="sr-only">逐日 AI 用量</caption>
                <thead>
                  <tr>
                    <th scope="col">日期</th>
                    <th scope="col" className="number">
                      调用
                    </th>
                    <th scope="col" className="number">
                      失败
                    </th>
                    <th scope="col" className="number">
                      输入 token
                    </th>
                    <th scope="col" className="number">
                      输出 token
                    </th>
                    <th scope="col" className="number">
                      费用
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {[...data.byDay].reverse().map((day) => (
                    <tr key={day.date}>
                      <th scope="row">{date(day.date)}</th>
                      <td className="number">{count(day.calls)}</td>
                      <td className="number">{count(day.failedCalls)}</td>
                      <td className="number">{num(day.inputTokens, 0)}</td>
                      <td className="number">{num(day.outputTokens, 0)}</td>
                      <td className="number">{money(day.costUsd)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </details>
        </>
      )}
    </section>
  );
}
