import { Button, count, pct } from "@bowen-hub/ui";
import { useQueryClient } from "@tanstack/react-query";
import { useMocks } from "../../lib/environment";
import { CapabilitiesSection } from "./CapabilitiesSection";
import { budgetState, evalCounts, formatTime, money } from "./logic";
import { opsKey, useCapabilities, useRuns, useSources, useUsage } from "./queries";
import { RunsSection } from "./RunsSection";
import { SourcesSection } from "./SourcesSection";
import { UsageSection } from "./UsageSection";
import "./ops.css";

/** 页面只有这一个 role=status：连接与刷新状态；样例模式下写明数据来自模拟接口。 */
function useStatusLine() {
  const runs = useRuns("");
  const usage = useUsage(30);
  const sources = useSources();
  const capabilities = useCapabilities();
  const queries = [runs, usage, sources, capabilities];
  if (queries.some((query) => query.isPending))
    return useMocks ? "正在连接样例…" : "正在加载运维数据…";
  if (queries.some((query) => query.isError))
    return useMocks ? "样例加载失败" : "有分区没有加载成功，见下方提示。";
  if (useMocks)
    return `样例连接成功：${count(runs.data?.pages[0]?.items.length)} 条运行记录、${count(capabilities.data?.length)} 个能力、${count(sources.data?.length)} 个数据源（模拟数据）`;
  return `数据已更新：${formatTime(new Date(usage.dataUpdatedAt).toISOString())}（UTC+8）`;
}

function Summary() {
  const runs = useRuns("");
  const usage = useUsage(30);
  const sources = useSources();
  const capabilities = useCapabilities();
  const budget = usage.data
    ? budgetState(usage.data.monthCostUsd, usage.data.monthlyBudgetUsd)
    : null;
  const recent = runs.data?.pages[0]?.items ?? [];
  const failedRuns = recent.filter((run) => run.status === "failed").length;
  const failedSources = sources.data?.filter((row) => row.status === "failed").length;
  const evals = capabilities.data ? evalCounts(capabilities.data) : null;
  return (
    <div className="stat-row ops-summary">
      <p>
        <strong className={budget?.over ? "ops-over" : undefined}>
          {usage.data ? money(usage.data.monthCostUsd) : "…"}
        </strong>
        本月 AI 费用
        {usage.data && budget?.configured && (
          <>
            ，预算 {money(usage.data.monthlyBudgetUsd)}（
            {budget.over ? "已超" : `已用 ${pct(budget.ratio, { sign: false, digits: 0 })}`}）
          </>
        )}
      </p>
      <p>
        <strong>{runs.data ? count(failedRuns) : "…"}</strong>
        最近 {recent.length || 20} 条运行里失败的任务
      </p>
      <p>
        <strong>{failedSources === undefined ? "…" : count(failedSources)}</strong>
        检查失败的数据源（共 {count(sources.data?.length)} 个）
      </p>
      <p>
        <strong>{evals ? count(evals.failed) : "…"}</strong>
        评测未达标的能力{evals && `；另有 ${count(evals.none)} 个还没评测`}
      </p>
    </div>
  );
}

export function OpsPage() {
  const client = useQueryClient();
  const status = useStatusLine();
  return (
    <section className="ops-page">
      <header className="page-header">
        <p className="eyebrow">私人工作台 · 运维</p>
        <h1>运维</h1>
        <p className="page-lead">
          任务有没有按时跑完，AI 花了多少钱，数据源是否正常，每个能力的评测在变好还是变差。
        </p>
        <p role="status" className="muted">
          {status}
        </p>
        <Button onClick={() => void client.refetchQueries({ queryKey: opsKey, type: "active" })}>
          刷新全部
        </Button>
      </header>
      <Summary />
      <nav className="row ops-anchors" aria-label="运维分区">
        <a href="#ops-runs">运行记录</a>
        <a href="#ops-usage">AI 用量与费用</a>
        <a href="#ops-sources">数据源健康</a>
        <a href="#ops-capabilities">能力与评测</a>
      </nav>
      <RunsSection />
      <UsageSection />
      <SourcesSection />
      <CapabilitiesSection />
    </section>
  );
}
