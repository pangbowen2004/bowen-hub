import type { Article, Feedback } from "@bowen-hub/contracts";
import {
  privateNewsGetEdition,
  privateNewsGetFullTimeline,
  privateNewsListFeedback,
  privateNewsRateEdition,
  privateWatchlistList,
} from "@bowen-hub/contracts/client";
import { Button, date, EditionView, NewsMarketStage } from "@bowen-hub/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { editionKinds, errorMessage, NewsHeader, QueryState } from "./shared";
export function EditionPage({ id }: { id: string }) {
  const edition = useQuery({
    queryKey: ["edition", id],
    queryFn: ({ signal }) => privateNewsGetEdition(id, { signal }),
  });
  const feedback = useQuery({
    queryKey: ["news-feedback"],
    queryFn: ({ signal }) => privateNewsListFeedback(undefined, { signal }),
  });
  const watchlist = useQuery({
    queryKey: ["watchlist"],
    queryFn: ({ signal }) => privateWatchlistList({ signal }),
  });
  const [selectedSymbol, setSelectedSymbol] = useState<string>();
  const symbols = [
    ...new Set(
      edition.data?.sections.flatMap((section) =>
        section.kind === "ticker_digests" || section.kind === "ticker_weekly"
          ? section.items.map((item) => item.data.symbol)
          : [],
      ) ?? [],
    ),
  ];
  const articles = useQuery({
    queryKey: ["edition-sources", id],
    enabled: !!edition.data,
    queryFn: async ({ signal }) => {
      const timelines = await Promise.all(
        symbols.map((symbol) =>
          privateNewsGetFullTimeline(
            symbol,
            {
              days: Math.max(
                30,
                Math.ceil((Date.now() - Date.parse(edition.data?.date ?? "")) / 86400000) + 2,
              ),
            },
            { signal },
          ),
        ),
      );
      const rows = timelines.flat().flatMap((row) => (row.kind === "article" ? [row.article] : []));
      return [...new Map(rows.map((article) => [article.id, article])).values()] as Article[];
    },
  });
  const select = (symbol: string) => {
    setSelectedSymbol(symbol);
    const article = document.getElementById(`news-symbol-${symbol}`);
    if (article) {
      article.scrollIntoView({
        behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "instant" : "smooth",
        block: "center",
      });
      article.setAttribute("tabindex", "-1");
      article.focus({ preventScroll: true });
    }
  };
  const cache = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  type Action = { score: number };
  const save = useMutation({
    mutationFn: async (action: Action): Promise<Feedback> => privateNewsRateEdition(id, action),
    onMutate: async (action) => {
      await cache.cancelQueries({ queryKey: ["news-feedback"] });
      const before = cache.getQueryData<Feedback[]>(["news-feedback"]);
      const base = {
        id: `pending-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        editionId: id,
      };
      const optimistic: Feedback = { ...base, kind: "edition", score: action.score };
      cache.setQueryData<Feedback[]>(["news-feedback"], [optimistic, ...(before ?? [])]);
      setError("");
      return { before };
    },
    onError: (failure, _action, context) => {
      cache.setQueryData(["news-feedback"], context?.before);
      setError(`保存失败，已回滚：${errorMessage(failure)}`);
    },
    onSuccess: () => setNotice("反馈已保存。"),
    onSettled: () => void cache.invalidateQueries({ queryKey: ["news-feedback"] }),
  });
  const current = feedback.data?.filter((row) => row.editionId === id) ?? [];
  const score = current.find((row) => row.kind === "edition");
  return (
    <section className="news-page">
      <NewsHeader
        title={
          edition.data
            ? `${editionKinds[edition.data.kind]} · ${date(edition.data.date)}`
            : "阅读本期"
        }
        lead=""
      />
      <QueryState loading={edition.isPending} error={edition.error} retry={edition.refetch} />
      {edition.data && (
        <>
          {edition.data.kind === "morning" && (
            <NewsMarketStage
              edition={edition.data}
              watchlist={watchlist.data ?? []}
              articles={articles.data}
              onSelect={select}
            />
          )}
          <QueryState
            loading={watchlist.isPending}
            error={watchlist.error}
            retry={watchlist.refetch}
          />
          <QueryState
            loading={articles.isPending}
            error={articles.error}
            retry={articles.refetch}
          />
          <EditionView
            edition={edition.data}
            articles={articles.data}
            selectedSymbol={selectedSymbol}
          />
          <div className="news-feedback compact-feedback">
            <h2>这期对你有帮助吗？</h2>
            <div className="row">
              {[1, 2, 3, 4, 5].map((value) => (
                <Button
                  key={value}
                  disabled={save.isPending || feedback.isPending || feedback.isError}
                  aria-pressed={score?.kind === "edition" && score.score === value}
                  onClick={() => save.mutate({ score: value })}
                >
                  {value} 分
                </Button>
              ))}
            </div>
            <QueryState
              loading={feedback.isPending}
              error={feedback.error}
              retry={feedback.refetch}
            />
          </div>
          {notice && <p role="status">{notice}</p>}
          {error && <p role="alert">{error}</p>}
        </>
      )}
    </section>
  );
}
