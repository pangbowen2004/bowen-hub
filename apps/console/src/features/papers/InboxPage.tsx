import {
  privatePapersListUploads,
  privatePapersRetryUpload,
  privatePapersUploadArxiv,
  privatePapersUploadPdf,
} from "@bowen-hub/contracts/client";
import { Button, Input } from "@bowen-hub/ui";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { allPapers, errorMessage, PaperHeader, QueryState, reviewLabels } from "./shared";

const statusLabels = {
  queued: "等待入库",
  extracting: "提取原文",
  authoring: "撰写导读",
  checking: "校验草稿",
  reviewing: "独立审核",
  ready: "已就绪",
  failed: "入库失败",
} as const;
export function InboxPage() {
  const cache = useQueryClient();
  const [notice, setNotice] = useState("");
  const [error, setError] = useState("");
  const uploads = useQuery({
    queryKey: ["papers", "uploads"],
    queryFn: ({ signal }) => privatePapersListUploads(undefined, { signal }),
    refetchInterval: (query) =>
      query.state.data?.some((item) => item.status !== "ready" && item.status !== "failed")
        ? 3000
        : false,
  });
  const papers = useQuery({
    queryKey: ["papers", "list"],
    queryFn: ({ signal }) => allPapers(signal),
  });
  const previousUploads = useRef(new Map<string, string>());
  useEffect(() => {
    if (!uploads.data) return;
    const completed = uploads.data.some(
      (item) =>
        (item.status === "ready" || item.status === "failed") &&
        previousUploads.current.has(item.id) &&
        previousUploads.current.get(item.id) !== item.status,
    );
    previousUploads.current = new Map(uploads.data.map((item) => [item.id, item.status]));
    if (completed) {
      for (const resource of ["list", "catalog", "graph"]) {
        void cache.invalidateQueries({ queryKey: ["papers", resource] });
      }
    }
  }, [uploads.data, cache]);
  const action = useMutation({
    mutationFn: async (input: { file: File } | { url: string } | { retry: string }) => {
      if ("file" in input) return privatePapersUploadPdf(input.file.name, input.file);
      if ("url" in input) return privatePapersUploadArxiv({ arxivUrl: input.url });
      return privatePapersRetryUpload(input.retry);
    },
    onMutate: () => {
      setError("");
      setNotice("");
    },
    onSuccess: () => {
      setNotice("已提交入库，处理状态会自动更新。");
      void cache.invalidateQueries({ queryKey: ["papers"] });
    },
    onError: (failure) => setError(errorMessage(failure)),
  });
  return (
    <section className="papers-page">
      <PaperHeader
        title="让下一篇论文，进入研究。"
        lead="上传原文，等待草稿与独立审核；确认后再公开。"
      />
      <div className="paper-upload-grid">
        <form
          className="paper-panel"
          onSubmit={(event) => {
            event.preventDefault();
            const file = new FormData(event.currentTarget).get("pdf");
            if (!(file instanceof File) || !file.size) {
              setError("请选择 PDF 文件");
              return;
            }
            action.mutate({ file });
          }}
        >
          <h2>上传 PDF</h2>
          <Input label="原文文件" name="pdf" type="file" accept="application/pdf,.pdf" required />
          <p className="muted">每次上传一篇 PDF 原文。</p>
          <Button type="submit" disabled={action.isPending}>
            上传并入库
          </Button>
        </form>
        <form
          className="paper-panel"
          onSubmit={(event) => {
            event.preventDefault();
            action.mutate({ url: String(new FormData(event.currentTarget).get("url")).trim() });
          }}
        >
          <h2>从 arXiv 入库</h2>
          <Input
            label="arXiv 链接"
            name="url"
            type="url"
            placeholder="https://arxiv.org/abs/…"
            required
          />
          <Button type="submit" disabled={action.isPending}>
            提交链接
          </Button>
        </form>
      </div>
      {notice && <p role="status">{notice}</p>}
      {error && <p role="alert">{error}</p>}
      <div className="paper-list-toolbar">
        <h2>入库记录</h2>
        <Button onClick={() => void uploads.refetch()}>刷新状态</Button>
      </div>
      <QueryState loading={uploads.isPending} error={uploads.error} retry={uploads.refetch} />
      {uploads.data?.length === 0 && <p>还没有入库记录。</p>}
      <div className="paper-inbox-list">
        {uploads.data?.map((item) => (
          <article className="paper-panel" key={item.id}>
            <h3>{item.filename ?? item.arxivUrl ?? item.id}</h3>
            <p>
              {statusLabels[item.status]} · {item.updatedAt}
            </p>
            {item.error && <p role="alert">{item.error}</p>}
            {item.paperId && (
              <Link to="/papers/$id" params={{ id: item.paperId }}>
                打开论文
              </Link>
            )}
            {item.status === "failed" && (
              <Button disabled={action.isPending} onClick={() => action.mutate({ retry: item.id })}>
                重试入库
              </Button>
            )}
          </article>
        ))}
      </div>
      <h2>待审核与待修改</h2>
      <QueryState loading={papers.isPending} error={papers.error} retry={papers.refetch} />
      {papers.data
        ?.filter((item) => item.review !== "passed")
        .map((item) => (
          <article className="paper-panel" key={item.id}>
            <Link to="/papers/$id" params={{ id: item.id }}>
              {item.titleZh ?? item.title}
            </Link>
            <span className="paper-tag">{reviewLabels[item.review]}</span>
          </article>
        ))}
    </section>
  );
}
