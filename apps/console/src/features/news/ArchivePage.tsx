import type { EditionKind } from "@bowen-hub/contracts";
import { privateNewsListEditions } from "@bowen-hub/contracts/client";
import { Button, date } from "@bowen-hub/ui";
import { useInfiniteQuery } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { editionKinds, NewsHeader, QueryState } from "./shared";
export function ArchivePage() {
  const [kind, setKind] = useState<EditionKind | "">("");
  const query = useInfiniteQuery({
    queryKey: ["editions", kind],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      privateNewsListEditions(
        { kind: kind || undefined, cursor: pageParam, limit: 20 },
        { signal },
      ),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
  const sentinel = useRef<HTMLDivElement>(null);
  const start = useRef<number | null>(null);
  const { fetchNextPage, hasNextPage, isFetchingNextPage } = query;
  useEffect(() => {
    const element = sentinel.current;
    if (!element || !hasNextPage) return;
    const observer = new IntersectionObserver(
      (entries) => {
        if (entries.some((entry) => entry.isIntersecting) && !isFetchingNextPage)
          void fetchNextPage();
      },
      { rootMargin: "200px" },
    );
    observer.observe(element);
    return () => observer.disconnect();
  }, [fetchNextPage, hasNextPage, isFetchingNextPage]);
  return (
    <section
      className="news-page"
      onTouchStart={(event) => {
        start.current = window.scrollY === 0 ? (event.touches[0]?.clientY ?? null) : null;
      }}
      onTouchEnd={(event) => {
        if (start.current !== null && (event.changedTouches[0]?.clientY ?? 0) - start.current > 80)
          void query.refetch();
        start.current = null;
      }}
    >
      <NewsHeader title="新闻归档" lead="按版次回看事实与线索。" />
      <div className="news-controls">
        <label>
          版次
          <select
            value={kind}
            onChange={(event) => setKind(event.target.value as EditionKind | "")}
          >
            <option value="">全部版次</option>
            {Object.entries(editionKinds).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <Button onClick={() => void query.refetch()} disabled={query.isFetching}>
          刷新
        </Button>
      </div>
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
      <div className="news-archive">
        {query.data?.pages
          .flatMap((page) => page.items)
          .map((item) => (
            <article key={item.id}>
              <p className="eyebrow">{date(item.date)}</p>
              <h2>
                <Link to="/news/$id" params={{ id: item.id }}>
                  {editionKinds[item.kind]}
                </Link>
              </h2>
              <p className="muted">{item.generatedAt ? "已生成" : "旧归档"}</p>
            </article>
          ))}
      </div>
      {query.data?.pages[0]?.items.length === 0 && <p>还没有新闻期次。</p>}
      <div ref={sentinel}>
        {hasNextPage && (
          <Button disabled={isFetchingNextPage} onClick={() => void fetchNextPage()}>
            {isFetchingNextPage ? "正在加载下一页…" : "加载更多"}
          </Button>
        )}
      </div>
    </section>
  );
}
