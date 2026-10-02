import type { Feedback, ItemFeedbackRequest } from "@bowen-hub/contracts";
import {
  privateNewsFlagItem,
  privateNewsGetEdition,
  privateNewsListFeedback,
  privateNewsRateEdition,
} from "@bowen-hub/contracts/client";
import { Button, date, EditionView } from "@bowen-hub/ui";
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
  const cache = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  type Action = { score: number } | ItemFeedbackRequest;
  const save = useMutation({
    mutationFn: async (action: Action): Promise<Feedback> =>
      "score" in action ? privateNewsRateEdition(id, action) : privateNewsFlagItem(action),
    onMutate: async (action) => {
      await cache.cancelQueries({ queryKey: ["news-feedback"] });
      const before = cache.getQueryData<Feedback[]>(["news-feedback"]);
      const base = {
        id: `pending-${crypto.randomUUID()}`,
        createdAt: new Date().toISOString(),
        editionId: id,
      };
      const optimistic: Feedback =
        "score" in action
          ? { ...base, kind: "edition", score: action.score }
          : { ...base, kind: "item", itemId: action.itemId, reason: action.reason };
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
        lead="事实、来源与判断，放在同一页。"
      />
      <QueryState loading={edition.isPending} error={edition.error} retry={edition.refetch} />
      {edition.data && (
        <>
          <div className="news-feedback">
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
          <EditionView
            edition={edition.data}
            flag={(itemId) => (
              <div className="row news-flags">
                {(
                  [
                    ["useless", "没用"],
                    ["incorrect", "有错"],
                  ] as const
                ).map(([reason, label]) => (
                  <Button
                    key={reason}
                    disabled={save.isPending || feedback.isPending || feedback.isError}
                    aria-pressed={current.some(
                      (row) =>
                        row.kind === "item" && row.itemId === itemId && row.reason === reason,
                    )}
                    onClick={() => save.mutate({ editionId: id, itemId, reason })}
                  >
                    {label}
                  </Button>
                ))}
              </div>
            )}
          />
        </>
      )}
    </section>
  );
}
