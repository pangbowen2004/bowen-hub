import {
  privateNewsGetEdition,
  privateNewsListEditions,
  privatePapersListPapers,
  privatePlatformGetAiUsage,
  privatePlatformListRuns,
  publicMarketsGetLatestDay,
} from "@bowen-hub/contracts/client";
import { Button, count, usd } from "@bowen-hub/ui";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useMocks } from "../../lib/environment";
import { editionKinds, QueryState } from "../news/shared";
import "../news/news.css";

function LatestEdition({ kind }: { kind: "morning" | "premarket" }) {
  const query = useQuery({
    queryKey: ["today-edition", kind],
    queryFn: async ({ signal }) => {
      const page = await privateNewsListEditions({ kind, limit: 1 }, { signal });
      return page.items[0] ? privateNewsGetEdition(page.items[0].id, { signal }) : null;
    },
  });
  return (
    <section className="today-reading">
      <p className="eyebrow">最新一期 · {editionKinds[kind]}</p>
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
      {query.data ? (
        <>
          <h2>
            <Link to="/news/$id" params={{ id: query.data.id }}>
              {query.data.date}
            </Link>
          </h2>
          {query.data.lede?.lines.map((line) => (
            <p className="lede" key={line}>
              {line}
            </p>
          ))}
          {!query.data.lede && <p className="muted">本期没有AI导语，直接阅读原始栏目。</p>}
          <Link className="editorial-link" to="/news/$id" params={{ id: query.data.id }}>
            阅读全文 ↗
          </Link>
        </>
      ) : (
        !query.isPending && !query.isError && <p>还没有这类版次。</p>
      )}
    </section>
  );
}
async function pendingCount(signal: AbortSignal) {
  let total = 0;
  for (const review of ["draft", "revise"] as const) {
    let cursor: string | undefined;
    const seen = new Set<string>();
    do {
      const page = await privatePapersListPapers({ review, limit: 100, cursor }, { signal });
      total += page.items.length;
      cursor = page.nextCursor ?? undefined;
      if (cursor) {
        if (seen.has(cursor)) throw new Error("论文分页游标重复");
        seen.add(cursor);
      }
    } while (cursor);
  }
  return total;
}
export function TodayPage() {
  const queryClient = useQueryClient();
  const market = useQuery({
    queryKey: ["today-market"],
    queryFn: ({ signal }) => publicMarketsGetLatestDay({ signal }),
  });
  const papers = useQuery({
    queryKey: ["today-papers-pending"],
    queryFn: ({ signal }) => pendingCount(signal),
  });
  const runs = useQuery({
    queryKey: ["today-failed-runs"],
    queryFn: ({ signal }) => privatePlatformListRuns({ limit: 20 }, { signal }),
  });
  const usage = useQuery({
    queryKey: ["today-ai-usage"],
    queryFn: ({ signal }) => privatePlatformGetAiUsage(undefined, { signal }),
  });
  return (
    <section className="news-page">
      <header className="page-header">
        <p className="eyebrow">私人工作台 · 今日</p>
        <h1>
          保持好奇。
          <br />
          保持判断。
        </h1>
        <p className="page-lead">沿着新闻、公告与原文证据，继续今天的阅读。</p>
        <Button
          onClick={() => {
            void queryClient.refetchQueries({ queryKey: ["today-edition"], type: "active" });
            void market.refetch();
            void papers.refetch();
            void runs.refetch();
            void usage.refetch();
          }}
        >
          刷新今日概览
        </Button>
      </header>
      {useMocks && (
        <p role="status" className="muted">
          样例数据 · 正式内容由后续流水线写入
        </p>
      )}
      <div className="today-grid">
        <div>
          <LatestEdition kind="morning" />
          <LatestEdition kind="premarket" />
        </div>
        <div>
          <section className="today-reading">
            <p className="eyebrow">A股 · 最近交易日</p>
            <QueryState loading={market.isPending} error={market.error} retry={market.refetch} />
            {market.data && (
              <>
                <h2>{market.data.summary.headline}</h2>
                <p>{market.data.date}</p>
                <a href="/markets/events">观察事件 →</a>
              </>
            )}
          </section>
          <section className="today-reading">
            <h2>待审与待修订</h2>
            <QueryState loading={papers.isPending} error={papers.error} retry={papers.refetch} />
            {papers.data !== undefined && <p>{count(papers.data, "篇论文")}</p>}
            <Link to="/papers/inbox">前往论文收件箱 →</Link>
          </section>
          <section className="today-reading">
            <h2>本月AI费用</h2>
            <QueryState loading={usage.isPending} error={usage.error} retry={usage.refetch} />
            {usage.data && (
              <p>
                {usd(usage.data.monthCostUsd)} / 预算 {usd(usage.data.monthlyBudgetUsd)}
              </p>
            )}
          </section>
          <section className="today-reading">
            <h2>最近失败任务</h2>
            <QueryState loading={runs.isPending} error={runs.error} retry={runs.refetch} />
            {runs.data?.items.filter((run) => run.status === "failed").length === 0 && (
              <p>最近没有失败任务。</p>
            )}
            {runs.data?.items
              .filter((run) => run.status === "failed")
              .slice(0, 5)
              .map((run) => (
                <p key={run.id}>
                  {run.job} · {run.date}
                  <br />
                  <span className="muted">{run.error ?? "没有错误摘要"}</span>
                </p>
              ))}
            <Link to="/ops">运行记录 →</Link>
          </section>
        </div>
      </div>
    </section>
  );
}
