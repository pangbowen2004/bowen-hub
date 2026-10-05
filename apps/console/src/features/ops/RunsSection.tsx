import { Button, date } from "@bowen-hub/ui";
import { useState } from "react";
import { formatTime, runDuration, runStatusLabel, statEntries } from "./logic";
import { useRuns } from "./queries";
import { SectionState } from "./SectionState";

/** 任务名来自 docs/09 第 8 节的工作流与 Run.job 的说明；筛选项再并上实际读到的其他任务。 */
const JOB_LABELS: Record<string, string> = {
  "news-morning": "美股早报",
  "news-premarket": "盘前简报",
  "news-weekly": "美股周报",
  "market-eod": "A 股收盘",
  "papers-ingest": "论文入库",
  "papers-revise": "论文重写",
  "data-export": "数据导出",
  "evals-weekly": "每周评测",
  "budget-alert": "预算提醒",
};
const tone = { running: undefined, succeeded: undefined, failed: "warning" } as const;

export function RunsSection() {
  const [job, setJob] = useState("");
  const [onlyFailed, setOnlyFailed] = useState(false);
  const query = useRuns(job);
  const runs = query.data?.pages.flatMap((page) => page.items) ?? [];
  const jobs = [...new Set([...Object.keys(JOB_LABELS), ...runs.map((run) => run.job), job])]
    .filter(Boolean)
    .sort();
  const shown = onlyFailed ? runs.filter((run) => run.status === "failed") : runs;
  return (
    <section className="ops-section" aria-labelledby="ops-runs">
      <h2 id="ops-runs">运行记录</h2>
      <p className="muted">
        每个定时任务开始和结束各记一次；最新的在前。时间按新加坡时间（UTC+8）。
      </p>
      <div className="ops-controls">
        <label>
          任务
          <select value={job} onChange={(event) => setJob(event.target.value)}>
            <option value="">全部任务</option>
            {jobs.map((value) => (
              <option key={value} value={value}>
                {JOB_LABELS[value] ? `${JOB_LABELS[value]}（${value}）` : value}
              </option>
            ))}
          </select>
        </label>
        <label className="ops-check">
          <input
            type="checkbox"
            checked={onlyFailed}
            onChange={(event) => setOnlyFailed(event.target.checked)}
          />
          只看失败
        </label>
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          刷新记录
        </Button>
      </div>
      <SectionState loading={query.isPending} error={query.error} retry={query.refetch} />
      {!query.isPending && !query.isError && shown.length === 0 && (
        <p>{runs.length === 0 ? "还没有运行记录。" : "已加载的记录里没有失败的任务。"}</p>
      )}
      <ul className="ops-runs">
        {shown.map((run) => (
          <li key={run.id} className="ops-run" data-status={run.status}>
            <div className="ops-run-head">
              <h3>
                {JOB_LABELS[run.job] ?? run.job}
                <span className="ops-mono muted"> {run.job}</span>
              </h3>
              <span className="badge" data-tone={tone[run.status]}>
                {runStatusLabel[run.status]}
              </span>
            </div>
            <p className="muted ops-meta">
              <span>业务日期 {date(run.date)}</span>
              <span>开始 {formatTime(run.startedAt)}</span>
              <span>耗时 {runDuration(run)}</span>
            </p>
            {run.error && <p className="ops-error">{run.error}</p>}
            <details>
              <summary>统计与运行 ID</summary>
              <p className="ops-mono">{run.id}</p>
              <dl className="ops-facts">
                {statEntries(run.stats).map(([key, value]) => (
                  <div key={key}>
                    <dt className="ops-mono">{key}</dt>
                    <dd>{value}</dd>
                  </div>
                ))}
              </dl>
              {Object.keys(run.stats).length === 0 && <p className="muted">这次运行没有写统计。</p>}
            </details>
          </li>
        ))}
      </ul>
      {query.hasNextPage && (
        <Button disabled={query.isFetchingNextPage} onClick={() => void query.fetchNextPage()}>
          {query.isFetchingNextPage ? "正在加载下一页…" : "加载更多"}
        </Button>
      )}
    </section>
  );
}
