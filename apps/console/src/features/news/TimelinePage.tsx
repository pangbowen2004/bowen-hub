import { privateNewsGetFullTimeline } from "@bowen-hub/contracts/client";
import { date, Input, time } from "@bowen-hub/ui";
import {
  ArticleContent,
  EarningsContent,
  FilingContent,
  InsiderContent,
} from "@bowen-hub/ui/react/EditionView";
import { useQuery } from "@tanstack/react-query";
import { useState } from "react";
import { NewsHeader, QueryState } from "./shared";
export function TimelinePage({ symbol }: { symbol: string }) {
  const [days, setDays] = useState(30);
  const query = useQuery({
    queryKey: ["news-timeline", symbol, days],
    queryFn: ({ signal }) => privateNewsGetFullTimeline(symbol, { days }, { signal }),
  });
  return (
    <section className="news-page">
      <NewsHeader
        title={`${symbol} · 个股时间线`}
        lead="把新闻、公告、内部人交易与财报放回时间的顺序。"
      />
      <div className="news-controls">
        <Input
          label="最近天数"
          type="number"
          min={1}
          value={days}
          onChange={(event) => {
            const value = Number(event.target.value);
            if (Number.isInteger(value) && value >= 1) setDays(value);
          }}
        />
      </div>
      <QueryState loading={query.isPending} error={query.error} retry={query.refetch} />
      {query.data?.length === 0 && <p>这个时间范围内还没有相关记录。</p>}
      {query.data?.map((row) => (
        <article
          className="news-result"
          key={
            row.kind === "article"
              ? row.article.id
              : row.kind === "filing"
                ? row.filing.accession
                : row.kind === "earnings"
                  ? `${row.earnings.symbol}-${row.earnings.publishedAt}-${row.earnings.sourceUrl}`
                  : `${row.insiderTrade.accession}-${row.insiderTrade.transactionIndex}`
          }
        >
          <p className="eyebrow">
            {date(row.at)} {time(row.at)}
          </p>
          {row.kind === "article" ? (
            <ArticleContent article={row.article} />
          ) : row.kind === "filing" ? (
            <FilingContent filing={row.filing} />
          ) : row.kind === "earnings" ? (
            <EarningsContent card={row.earnings} />
          ) : (
            <InsiderContent trade={row.insiderTrade} />
          )}
        </article>
      ))}
    </section>
  );
}
