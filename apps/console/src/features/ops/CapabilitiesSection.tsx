import type { CapabilityInfo, EvalResult } from "@bowen-hub/contracts";
import { Button, count, num } from "@bowen-hub/ui";
import {
  durationText,
  type EvalStatus,
  evalStatus,
  formatTime,
  groupEvals,
  money,
  scoreRows,
} from "./logic";
import { useCapabilities, useEvals } from "./queries";
import { SectionState } from "./SectionState";
import { Sparkline } from "./Sparkline";

const statusText: Record<EvalStatus, string> = { none: "未评测", passed: "达标", failed: "未达标" };
const statusTone = { none: "missing", passed: undefined, failed: "warning" } as const;
const order: Record<EvalStatus, number> = { failed: 0, none: 1, passed: 2 };
const scheduleText = { weekly: "每周评测", "on-change": "仅改动时评测" } as const;
/** 走势图的纵轴下沿：放得下最低得分和门槛，再留一点余量，这样跌破门槛一眼就能看到。 */
const scoreFloor = (values: number[], threshold: number | null) =>
  values.length === 0
    ? 0
    : Math.max(0, Math.floor((Math.min(...values, threshold ?? 1) - 0.05) * 20) / 20);
const signed = (value: number) => `${value > 0 ? "+" : ""}${num(value, 3)}`;
const series = (values: number[]) => values.map((value) => num(value, 3)).join("、");

function Card({ capability, history }: { capability: CapabilityInfo; history: EvalResult[] }) {
  const latest = capability.latestEval;
  const status = evalStatus(latest);
  // 走势读不到时（评测列表加载失败）退回只用清单里带的最近一次。
  const runs = history.length > 0 ? history : latest ? [latest] : [];
  const rows = scoreRows(capability.evals.thresholds, runs);
  const costs = runs.flatMap((run) => (run.costUsd === undefined ? [] : [run.costUsd]));
  const durations = runs.flatMap((run) => (run.durationMs === undefined ? [] : [run.durationMs]));
  return (
    <details className="ops-capability" open={status === "failed"} data-status={status}>
      <summary>
        <span className="ops-mono">{capability.id}</span>
        <span className="badge" data-tone={statusTone[status]}>
          {statusText[status]}
        </span>
        <span className="muted ops-cap-summary">{capability.summary}</span>
      </summary>
      <p className="muted ops-meta">
        {latest
          ? `最近评测 ${formatTime(latest.at)}（UTC+8） · 评测集 ${latest.datasetVersion} · ${latest.model}`
          : "还没有评测结果；评测跑过之后这里会出现得分和走势。"}
      </p>
      {latest && latest.model !== capability.model && (
        <p className="muted">
          最近一次评测用的是 {latest.model}，当前档位已经是 {capability.model}。
        </p>
      )}
      {rows.length > 0 && (
        <div className="table-wrap">
          <table>
            <caption className="sr-only">{capability.id} 的评分与走势</caption>
            <thead>
              <tr>
                <th scope="col">评分器</th>
                <th scope="col" className="number">
                  最近
                </th>
                <th scope="col" className="number">
                  门槛
                </th>
                <th scope="col">结果</th>
                <th scope="col">走势（共 {runs.length} 次）</th>
                <th scope="col" className="number">
                  较上次
                </th>
              </tr>
            </thead>
            <tbody>
              {rows.map((row) => (
                <tr key={row.name}>
                  <th scope="row" className="ops-mono">
                    {row.name}
                  </th>
                  <td className="number">{row.value === null ? "—" : num(row.value, 3)}</td>
                  <td className="number">
                    {row.threshold === null ? "—" : `≥ ${num(row.threshold, 3)}`}
                  </td>
                  <td>{row.met === null ? "—" : row.met ? "✓ 达标" : "✗ 未达标"}</td>
                  <td>
                    <Sparkline
                      values={row.series}
                      domain={[scoreFloor(row.series, row.threshold), 1]}
                      threshold={row.threshold}
                      label={`${row.name} 最近 ${row.series.length} 次：${series(row.series)}`}
                    />
                  </td>
                  <td className="number">{row.change === null ? "—" : signed(row.change)}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      {runs.length > 0 && (
        <p className="ops-cost-trend">
          <span>
            费用走势{" "}
            <Sparkline values={costs} label={`每次评测费用：${costs.map(money).join("、")}`} />{" "}
            {costs.length > 0 ? money(costs[costs.length - 1] ?? 0) : "—"}
          </span>
          <span>
            耗时走势{" "}
            <Sparkline
              values={durations}
              label={`每次评测耗时：${durations.map(durationText).join("、")}`}
            />{" "}
            {durations.length > 0 ? durationText(durations[durations.length - 1]) : "—"}
          </span>
        </p>
      )}
      <dl className="ops-facts">
        <div>
          <dt>清单版本</dt>
          <dd>
            v{capability.version} · 所属 {capability.owner}
          </dd>
        </div>
        <div>
          <dt>运行端</dt>
          <dd>{capability.runtime === "python" ? "Python" : "TypeScript"}</dd>
        </div>
        <div>
          <dt>档位与模型</dt>
          <dd>
            {capability.tier} → {capability.model}（推理强度 {capability.reasoning}）
          </dd>
        </div>
        <div>
          <dt>自治等级</dt>
          <dd>{capability.autonomy}</dd>
        </div>
        <div>
          <dt>提示词</dt>
          <dd className="ops-mono">{capability.prompt}</dd>
        </div>
        <div>
          <dt>输入 → 输出</dt>
          <dd className="ops-mono">
            {capability.io.input} → {capability.io.output}
          </dd>
        </div>
        <div>
          <dt>上限</dt>
          <dd>
            输入 ≤ {count(capability.limits.maxInputTokens)} token · 输出 ≤{" "}
            {count(capability.limits.maxOutputTokens)} token · 超时 {capability.limits.timeoutSec}{" "}
            秒
          </dd>
        </div>
        <div>
          <dt>确定性校验</dt>
          <dd className="ops-mono">{capability.checks.join("、") || "无"}</dd>
        </div>
        <div>
          <dt>失败时降级</dt>
          <dd>{capability.fallback}</dd>
        </div>
        <div>
          <dt>评测</dt>
          <dd>
            <span className="ops-mono">{capability.evals.dataset}</span> ·{" "}
            {scheduleText[capability.evals.schedule]}
          </dd>
        </div>
      </dl>
      {runs.length > 0 && (
        <details>
          <summary>评测历史（{runs.length} 次）</summary>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">{capability.id} 的评测历史</caption>
              <thead>
                <tr>
                  <th scope="col">时间（UTC+8）</th>
                  <th scope="col">模型</th>
                  <th scope="col">评测集</th>
                  <th scope="col">结果</th>
                  <th scope="col" className="number">
                    费用
                  </th>
                  <th scope="col" className="number">
                    耗时
                  </th>
                </tr>
              </thead>
              <tbody>
                {[...runs].reverse().map((run) => (
                  <tr key={`${run.at}-${run.model}`}>
                    <th scope="row" className="ops-mono">
                      {formatTime(run.at)}
                    </th>
                    <td className="ops-mono">{run.model}</td>
                    <td>{run.datasetVersion}</td>
                    <td>{run.passed ? "达标" : "未达标"}</td>
                    <td className="number">
                      {run.costUsd === undefined ? "—" : money(run.costUsd)}
                    </td>
                    <td className="number">{durationText(run.durationMs)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </details>
      )}
    </details>
  );
}

export function CapabilitiesSection() {
  const capabilities = useCapabilities();
  const evals = useEvals();
  const groups = groupEvals(evals.data ?? []);
  const rows = [...(capabilities.data ?? [])].sort(
    (a, b) =>
      order[evalStatus(a.latestEval)] - order[evalStatus(b.latestEval)] || a.id.localeCompare(b.id),
  );
  return (
    <section className="ops-section" aria-labelledby="ops-capabilities">
      <h2 id="ops-capabilities">能力清单与评测走势</h2>
      <p className="muted">
        每个用到 AI
        的能力：当前用哪个模型、有什么限制，以及每周评测的得分走势。未达标的自动展开；虚线是清单里的最低要求。
      </p>
      <SectionState
        loading={capabilities.isPending}
        error={capabilities.error}
        retry={capabilities.refetch}
      />
      {evals.isError && (
        <p role="alert">
          评测历史没有读到，走势暂时只显示最近一次。{" "}
          <Button onClick={() => void evals.refetch()}>重试</Button>
        </p>
      )}
      <div className="ops-capabilities">
        {rows.map((capability) => (
          <Card
            key={capability.id}
            capability={capability}
            history={groups.get(capability.id) ?? []}
          />
        ))}
      </div>
    </section>
  );
}
