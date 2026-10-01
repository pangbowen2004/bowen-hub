import { privateWatchlistList } from "@bowen-hub/contracts/client";
import { useQuery } from "@tanstack/react-query";
import type { ReactNode } from "react";
import { useMocks } from "./environment";
export function Placeholder({
  title,
  task,
  lead = "内容准备中",
  children,
}: {
  title: string;
  task: string;
  lead?: ReactNode;
  children?: ReactNode;
}) {
  const sample = useQuery({
    queryKey: ["shell-watchlist-sample"],
    queryFn: () => privateWatchlistList(),
    enabled: useMocks,
  });
  return (
    <section className="stack" data-task={task}>
      <header className="page-header">
        <h1>{title}</h1>
        <p className="muted">{lead}</p>
      </header>
      {children}
      <div className="card">
        <p>内容准备中</p>
        {useMocks && (
          <p role="status">
            {sample.isPending
              ? "正在连接样例…"
              : sample.isError
                ? "样例加载失败"
                : `样例连接成功：${sample.data.length} 项自选股`}
          </p>
        )}
      </div>
    </section>
  );
}
