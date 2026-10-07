import type { Paper, PaperPatch, PaperPrivate, PaperPrivateWrite } from "@bowen-hub/contracts";
import {
  privatePapersCreateExplanation,
  privatePapersGetCatalog,
  privatePapersGetPage,
  privatePapersGetPaper,
  privatePapersGetPrivate,
  privatePapersListReviews,
  privatePapersPatchExplanation,
  privatePapersPatchPaper,
  privatePapersPutPrivate,
  privatePapersRevise,
} from "@bowen-hub/contracts/client";
import { AskDrawer, Button, Input, PageImage, PaperReader } from "@bowen-hub/ui";
import { groupStudies, publicationLabel, publicationNotes } from "@bowen-hub/ui/react/Universe3D";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { articleParagraphs, exportMarkdown, markdown } from "./markdown";
import { RelatedPapers } from "./RelatedPapers";
import { errorMessage, PaperHeader, QueryState, reviewLabels } from "./shared";
import { type Answer, askPaper } from "./stream";

export function PrivateNotes({ id, initial }: { id: string; initial: PaperPrivate }) {
  const cache = useQueryClient();
  const [draft, setDraft] = useState<PaperPrivateWrite>({
    mastery: initial.mastery,
    notes: initial.notes,
  });
  const [dirty, setDirty] = useState(false);
  const [status, setStatus] = useState("已保存");
  const latest = useRef(draft);
  latest.current = draft;
  const save = useMutation({
    scope: { id: `paper-notes-${id}` },
    mutationFn: (value: PaperPrivateWrite) => privatePapersPutPrivate(id, value),
    onMutate: () => setStatus("正在保存…"),
    onSuccess: (value, sent) => {
      cache.setQueryData(["papers", id, "private"], value);
      if (latest.current.notes === sent.notes && latest.current.mastery === sent.mastery) {
        setDirty(false);
        setStatus("已保存");
      }
    },
    onError: () => setStatus("保存失败，内容仍保留在输入框，请重试"),
  });
  useEffect(() => {
    if (dirty || save.isPending) return;
    setDraft((current) =>
      current.notes === initial.notes && current.mastery === initial.mastery
        ? current
        : { notes: initial.notes, mastery: initial.mastery },
    );
  }, [initial.notes, initial.mastery, dirty, save.isPending]);
  const mutate = save.mutate;
  useEffect(() => {
    if (!dirty) return;
    const timer = setTimeout(() => mutate(draft), 600);
    return () => clearTimeout(timer);
  }, [dirty, draft, mutate]);
  const pending = useRef(false);
  pending.current = dirty;
  const flush = useRef(mutate);
  flush.current = mutate;
  useEffect(
    () => () => {
      if (pending.current) flush.current(latest.current);
    },
    [],
  );
  return (
    <section className="paper-panel">
      <h2>我的理解与笔记</h2>
      <label>
        掌握状态
        <select
          value={draft.mastery}
          onChange={(event) => {
            setDraft({ ...draft, mastery: event.target.value as PaperPrivateWrite["mastery"] });
            setDirty(true);
            setStatus("有未保存修改");
          }}
        >
          <option value="pending">待确认</option>
          <option value="confirmed">已确认</option>
        </select>
      </label>
      <label>
        私人笔记
        <textarea
          value={draft.notes}
          onChange={(event) => {
            setDraft({ ...draft, notes: event.target.value });
            setDirty(true);
            setStatus("有未保存修改");
          }}
        />
      </label>
      <p role={save.error ? "alert" : "status"}>{status}</p>
      {save.error && <Button onClick={() => mutate(draft)}>重试保存笔记</Button>}
    </section>
  );
}

function PageViewer({ id, page, close }: { id: string; page: number | null; close: () => void }) {
  const query = useQuery({
    queryKey: ["papers", id, "page", page],
    enabled: page !== null,
    queryFn: ({ signal }) => privatePapersGetPage(id, page!, { signal }),
  });
  const [src, setSrc] = useState<string>();
  useEffect(() => {
    setSrc(undefined);
    if (!query.data) return;
    const url = URL.createObjectURL(query.data);
    setSrc(url);
    return () => URL.revokeObjectURL(url);
  }, [query.data]);
  return (
    <PageImage
      page={page ?? undefined}
      src={src}
      open={page !== null}
      onOpenChange={(open) => {
        if (!open) close();
      }}
      loading={page !== null && query.isPending}
      error={query.error ? "原文页加载失败" : undefined}
      retry={() => void query.refetch()}
    />
  );
}

function PaperQuestion({ id, onPage }: { id: string; onPage: (page: number) => void }) {
  const cache = useQueryClient();
  const [open, setOpen] = useState(false);
  const [question, setQuestion] = useState("");
  const [asked, setAsked] = useState("");
  const [text, setText] = useState("");
  const [answer, setAnswer] = useState<Answer>();
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [saved, setSaved] = useState(false);
  const controller = useRef<AbortController | undefined>(undefined);
  useEffect(() => () => controller.current?.abort(), []);
  const save = useMutation({
    mutationFn: () => {
      if (!answer) throw new Error("回答尚未完成");
      return privatePapersCreateExplanation(id, { question: asked, ...answer });
    },
    onSuccess: () => {
      setSaved(true);
      void cache.invalidateQueries({ queryKey: ["papers", id, "private"] });
    },
  });
  async function ask() {
    if (!question.trim() || loading || save.isPending) return;
    controller.current?.abort();
    const current = new AbortController();
    controller.current = current;
    setAsked(question.trim());
    setText("");
    setAnswer(undefined);
    setError("");
    setSaved(false);
    setLoading(true);
    try {
      setAnswer(await askPaper(id, { question: question.trim() }, setText, current.signal));
    } catch {
      setError(current.signal.aborted ? "已停止回答" : "这次没答上来，未保存解释卡；可以重试。");
    } finally {
      setLoading(false);
    }
  }
  return (
    <AskDrawer
      open={open}
      onOpenChange={(value) => {
        setOpen(value);
        if (!value) controller.current?.abort();
      }}
    >
      <form
        onSubmit={(event) => {
          event.preventDefault();
          void ask();
        }}
      >
        <Input
          label="你的问题"
          value={question}
          onChange={(event) => setQuestion(event.target.value)}
          required
          disabled={loading || save.isPending}
        />
        <Button type="submit" disabled={loading || save.isPending || !question.trim()}>
          提问
        </Button>
        {loading && <Button onClick={() => controller.current?.abort()}>停止回答</Button>}
      </form>
      {loading && <p role="status">正在根据整篇原文回答…</p>}
      <div className="paper-answer" aria-live="polite">
        {text}
      </div>
      {error && <p role="alert">{error}</p>}
      {answer && (
        <>
          <div className="row">
            {answer.pages.map((page) => (
              <Button key={page} onClick={() => onPage(page)}>
                原文第 {page} 页
              </Button>
            ))}
          </div>
          <p className="muted">
            本次出处：{answer.generatedBy?.model} · 能力版本 {answer.generatedBy?.version}
          </p>
          <Button disabled={save.isPending || saved} onClick={() => save.mutate()}>
            {saved ? "已保存解释卡" : "保存为解释卡"}
          </Button>
        </>
      )}
      {save.error && <p role="alert">保存解释卡失败，请重试。</p>}
    </AskDrawer>
  );
}

export function Settings({ paper }: { paper: Paper }) {
  const cache = useQueryClient();
  const catalog = useQuery({
    queryKey: ["papers", "catalog"],
    queryFn: ({ signal }) => privatePapersGetCatalog({ signal }),
  });
  const [draft, setDraft] = useState({
    readingDepth: paper.status.readingDepth,
    nextAction: paper.status.nextAction,
    spaces: paper.spaces ?? [],
  });
  const [dirty, setDirty] = useState(false);
  const latest = useRef(draft);
  latest.current = draft;
  const [notice, setNotice] = useState("");
  const save = useMutation({
    scope: { id: `paper-settings-${paper.id}` },
    mutationFn: (patch: PaperPatch) => privatePapersPatchPaper(paper.id, patch),
    onSuccess: (value, sent) => {
      cache.setQueryData(["papers", paper.id, "paper"], value);
      if (
        sent.readingDepth !== undefined &&
        latest.current.readingDepth === sent.readingDepth &&
        latest.current.nextAction === sent.nextAction &&
        JSON.stringify(latest.current.spaces) === JSON.stringify(sent.spaces)
      ) {
        setDirty(false);
      }
      setNotice("论文设置已保存。");
      void cache.invalidateQueries({ queryKey: ["papers"] });
    },
  });
  useEffect(() => {
    if (dirty || save.isPending) return;
    setDraft((current) =>
      current.readingDepth === paper.status.readingDepth &&
      current.nextAction === paper.status.nextAction &&
      JSON.stringify(current.spaces) === JSON.stringify(paper.spaces)
        ? current
        : {
            readingDepth: paper.status.readingDepth,
            nextAction: paper.status.nextAction,
            spaces: paper.spaces ?? [],
          },
    );
  }, [paper.status.readingDepth, paper.status.nextAction, paper.spaces, dirty, save.isPending]);
  return (
    <section className="paper-panel">
      <h2>阅读与公开</h2>
      <p>
        {paper.status.visibility === "public" ? "已公开" : "未公开"} ·{" "}
        {reviewLabels[paper.status.review]}
      </p>
      <Button
        disabled={save.isPending}
        onClick={() =>
          save.mutate({ visibility: paper.status.visibility === "public" ? "private" : "public" })
        }
      >
        {paper.status.visibility === "public" ? "取消公开" : "公开这篇论文"}
      </Button>
      <form
        className="paper-settings"
        onSubmit={(event) => {
          event.preventDefault();
          save.mutate(draft);
        }}
      >
        <label>
          阅读深度
          <select
            name="depth"
            value={draft.readingDepth}
            onChange={(event) => {
              setDraft({
                ...draft,
                readingDepth: event.target.value as Paper["status"]["readingDepth"],
              });
              setDirty(true);
              setNotice("");
            }}
          >
            {["R0", "R1", "R2", "R3"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <Input
          label="下一步"
          name="nextAction"
          value={draft.nextAction}
          onChange={(event) => {
            setDraft({ ...draft, nextAction: event.target.value });
            setDirty(true);
            setNotice("");
          }}
        />
        <fieldset>
          <legend>研究空间</legend>
          {catalog.data?.spaces.map((space) => (
            <label key={space.id}>
              <span>
                <input
                  type="checkbox"
                  name="spaces"
                  value={space.id}
                  checked={draft.spaces.includes(space.id)}
                  onChange={(event) => {
                    setDraft({
                      ...draft,
                      spaces: event.target.checked
                        ? [...draft.spaces, space.id]
                        : draft.spaces.filter((id) => id !== space.id),
                    });
                    setDirty(true);
                    setNotice("");
                  }}
                />
                {space.label}
              </span>
            </label>
          ))}
        </fieldset>
        <Button type="submit" disabled={save.isPending || !catalog.data}>
          保存阅读设置
        </Button>
      </form>
      <QueryState loading={catalog.isPending} error={catalog.error} retry={catalog.refetch} />
      {notice && <p role="status">{notice}</p>}
      {save.error && <p role="alert">设置保存失败：{errorMessage(save.error)}</p>}
    </section>
  );
}

export function ReaderPage({ id }: { id: string }) {
  const cache = useQueryClient();
  const paper = useQuery({
    queryKey: ["papers", id, "paper"],
    queryFn: ({ signal }) => privatePapersGetPaper(id, { signal }),
  });
  const privateData = useQuery({
    queryKey: ["papers", id, "private"],
    queryFn: ({ signal }) => privatePapersGetPrivate(id, { signal }),
  });
  const reviews = useQuery({
    queryKey: ["papers", id, "reviews"],
    queryFn: ({ signal }) => privatePapersListReviews(id, { signal }),
  });
  const [page, setPage] = useState<number | null>(null);
  const [revisionNotice, setRevisionNotice] = useState("");
  const confirm = useMutation({
    mutationFn: (explanationId: string) =>
      privatePapersPatchExplanation(id, explanationId, { status: "confirmed" }),
    onSuccess: () => void cache.invalidateQueries({ queryKey: ["papers", id, "private"] }),
  });
  const revise = useMutation({
    mutationFn: (instructions: string) => privatePapersRevise(id, { instructions }),
    onSuccess: () => {
      setRevisionNotice("修改意见已提交，完成后请刷新论文与审核记录。");
      void cache.invalidateQueries({ queryKey: ["papers"] });
    },
  });
  const catalog = useQuery({
    queryKey: ["papers", "catalog"],
    queryFn: ({ signal }) => privatePapersGetCatalog({ signal }),
  });
  const versions =
    groupStudies(catalog.data?.papers ?? []).find((group) =>
      group.versions.some((p) => p.id === id),
    )?.versions ?? [];
  const current = paper.data;
  function download() {
    if (!current) return;
    const url = URL.createObjectURL(
      new Blob([exportMarkdown(current)], { type: "text/markdown;charset=utf-8" }),
    );
    const link = document.createElement("a");
    link.href = url;
    link.download = `${current.id}.md`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  return (
    <section className="papers-page">
      <PaperHeader
        title={current?.meta.titleZh ?? current?.meta.title ?? "论文阅读"}
        lead={current?.meta.titleZh ? current.meta.title : "从导读进入原文，核对每一条重要结论。"}
      />
      <QueryState loading={paper.isPending} error={paper.error} retry={paper.refetch} />
      {current && (
        <>
          <p>
            {[
              current.meta.authors?.join("、"),
              publicationLabel(current.meta.venue),
              current.meta.year,
              current.meta.version,
            ]
              .filter(Boolean)
              .join(" · ")}
          </p>
          {publicationNotes(current.meta.venue) && (
            <p className="publication-note">{publicationNotes(current.meta.venue)}</p>
          )}
          {versions.length > 1 && (
            <nav className="paper-version-switch" aria-label="论文版本">
              版本{" "}
              {versions.map((version) => (
                <Link
                  key={version.id}
                  to="/papers/$id"
                  params={{ id: version.id }}
                  aria-current={version.id === id ? "page" : undefined}
                >
                  {/-?v(\d+)$/.exec(version.id)?.[0].replace("-", "") ?? version.id}
                </Link>
              ))}
            </nav>
          )}
          <div className="row">
            <span className="paper-tag">{current.status.readingDepth}</span>
            {current.meta.sourceUrl && /^https?:\/\//.test(current.meta.sourceUrl) && (
              <a href={current.meta.sourceUrl} target="_blank" rel="noreferrer">
                原文主页 ↗
              </a>
            )}
            {current.resources?.code?.url && /^https?:\/\//.test(current.resources.code.url) && (
              <a href={current.resources.code.url} target="_blank" rel="noreferrer">
                代码 ↗
              </a>
            )}
          </div>
          <p>{current.meta.studyDesign}</p>
          <details className="paper-management">
            <summary>管理</summary>
            <div className="row">
              <PaperQuestion key={id} id={id} onPage={setPage} />
              <Button onClick={download}>导出 Markdown</Button>
              <Button onClick={() => void cache.invalidateQueries({ queryKey: ["papers"] })}>
                刷新论文
              </Button>
            </div>
            <Settings key={id} paper={current} />
            <section className="paper-panel">
              <h2>审核记录</h2>
              <QueryState
                loading={reviews.isPending}
                error={reviews.error}
                retry={reviews.refetch}
              />
              {reviews.data?.length === 0 && <p>还没有审核记录。</p>}
              {reviews.data?.map((review) => (
                <article className="paper-panel" key={review.id}>
                  <h3>
                    {review.decision === "pass"
                      ? "通过"
                      : review.decision === "revise"
                        ? "需要修订"
                        : "需要人工判断"}
                  </h3>
                  <p>
                    {review.createdAt} · {review.generatedBy.model}
                  </p>
                  {review.findings.map((finding) => (
                    <p key={`${finding.severity}-${finding.location}-${finding.fix}`}>
                      <strong>{finding.severity}</strong> · {finding.location}：{finding.fix}
                    </p>
                  ))}
                  <div className="row">
                    {review.pagesChecked.map((value) => (
                      <Button key={value} onClick={() => setPage(value)}>
                        核对原文第 {value} 页
                      </Button>
                    ))}
                  </div>
                </article>
              ))}
            </section>
            <form
              className="paper-panel"
              onSubmit={(event) => {
                event.preventDefault();
                revise.mutate(String(new FormData(event.currentTarget).get("instructions")).trim());
              }}
            >
              <h2>按意见重写</h2>
              <label>
                修改意见
                <textarea name="instructions" required />
              </label>
              <Button type="submit" disabled={revise.isPending}>
                提交修改意见
              </Button>
              {revisionNotice && <p role="status">{revisionNotice}</p>}
              {revise.error && <p role="alert">提交失败：{errorMessage(revise.error)}</p>}
            </form>
          </details>
          <PaperReader paper={current} paragraphs={articleParagraphs(current)} onPage={setPage} />
          <RelatedPapers paper={current} />
          <section className="paper-private">
            <QueryState
              loading={privateData.isPending}
              error={privateData.error}
              retry={privateData.refetch}
            />
            {privateData.data && (
              <>
                <PrivateNotes key={id} id={id} initial={privateData.data} />
                <section className="paper-panel">
                  <h2>解释卡</h2>
                  {privateData.data.explanations.length === 0 && (
                    <p>问答里满意的回答，可以保存到这里。</p>
                  )}
                  {privateData.data.explanations.map((item) => (
                    <article className="paper-panel" key={item.id}>
                      <h3>{item.question}</h3>
                      <p className="paper-answer">{item.answer}</p>
                      <div className="row">
                        {item.pages.map((value) => (
                          <Button key={value} onClick={() => setPage(value)}>
                            原文第 {value} 页
                          </Button>
                        ))}
                      </div>
                      <p>{item.status === "confirmed" ? "已确认" : "待确认"}</p>
                      {item.status === "pending" && (
                        <Button
                          disabled={confirm.isPending}
                          onClick={() => confirm.mutate(item.id)}
                        >
                          确认这张解释卡
                        </Button>
                      )}
                    </article>
                  ))}
                  {confirm.error && <p role="alert">解释卡确认失败，请重试。</p>}
                </section>
                {privateData.data.legacyCards.length > 0 && (
                  <section className="paper-panel">
                    <h2>迁移的阅读卡</h2>
                    {privateData.data.legacyCards.map((card) => (
                      <details key={`${card.title}-${card.markdown}`}>
                        <summary>{card.title}</summary>
                        {/* biome-ignore lint/security/noDangerouslySetInnerHtml: 统一Markdown处理剔除原始HTML及危险链接，安全回归测试覆盖。 */}
                        <div dangerouslySetInnerHTML={{ __html: markdown(card.markdown) }} />
                      </details>
                    ))}
                  </section>
                )}
              </>
            )}
          </section>
        </>
      )}
      <PageViewer id={id} page={page} close={() => setPage(null)} />
    </section>
  );
}
