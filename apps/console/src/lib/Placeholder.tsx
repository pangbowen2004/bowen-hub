import { privateWatchlistList } from "@bowen-hub/contracts/client";
import { useQuery } from "@tanstack/react-query";
import { useMocks } from "./environment";
export function Placeholder({ title, task }: { title: string; task: string }) {
  const sample = useQuery({
    queryKey: ["shell-watchlist-sample"],
    queryFn: () => privateWatchlistList(),
    enabled: useMocks,
  });
  return (
    <section className="stack">
      <header>
        <h1>{title}</h1>
        <p className="muted">内容准备中</p>
      </header>
      <div className="card">
        <p>此页面由{task}接入。</p>
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
