import { privateNewsSearchArticles } from "@bowen-hub/contracts/client";
import { Button, Input } from "@bowen-hub/ui";
import { ArticleContent } from "@bowen-hub/ui/react/EditionView";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NewsHeader, QueryState } from "./shared";
export function SearchPage() {
  const [params, setParams] = useState<{ q: string; ticker?: string; days: number } | null>(null);
  const query = useQuery({
    queryKey: ["news-search", params],
    queryFn: ({ signal }) =>
      params ? privateNewsSearchArticles(params, { signal }) : Promise.resolve([]),
    enabled: params !== null,
  });
  return (
    <section className="news-page">
      <NewsHeader title="全文搜索" lead="在新闻与原文线索中，找到你要追踪的事实。" />
      <form
        className="news-controls"
        onSubmit={(event) => {
          event.preventDefault();
          const data = new FormData(event.currentTarget);
          setParams({
            q: String(data.get("q")).trim(),
            ticker: String(data.get("ticker")).trim().toUpperCase() || undefined,
            days: Number(data.get("days")),
          });
        }}
      >
        <Input label="关键词" name="q" required />
        <Input label="股票代码（可选）" name="ticker" />
        <Input label="最近天数" name="days" type="number" min={1} defaultValue={30} required />
        <Button type="submit">搜索</Button>
      </form>
      {params && (
        <>
          <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
          {query.data?.length === 0 && <p>没有符合筛选条件的新闻。</p>}
          {query.data?.map((article) => (
            <article className="news-result" key={article.id}>
              <ArticleContent article={article} />
            </article>
          ))}
        </>
      )}
    </section>
  );
}
