import { privatePapersGetCatalog, privatePapersPatchPaper } from "@bowen-hub/contracts/client";
import { Button, Input } from "@bowen-hub/ui";
import {
  groupStudies,
  publicationLabel,
  topicContains,
  topicPath,
  visibleTaxonomy,
} from "@bowen-hub/ui/react/Universe3D";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { Link } from "@tanstack/react-router";
import { useState } from "react";
import taxonomySource from "../../../../../config/paper_topics.json";
import { allPapers, errorMessage, PaperHeader, QueryState, reviewLabels } from "./shared";
export function ListPage() {
  const cache = useQueryClient();
  const query = useQuery({
    queryKey: ["papers", "list"],
    queryFn: ({ signal }) => allPapers(signal),
  });
  const catalog = useQuery({
    queryKey: ["papers", "catalog"],
    queryFn: ({ signal }) => privatePapersGetCatalog({ signal }),
  });
  const [q, setQ] = useState("");
  const [space, setSpace] = useState("");
  const [visibility, setVisibility] = useState("");
  const [review, setReview] = useState("");
  const [depth, setDepth] = useState("");
  const [year, setYear] = useState("");
  const [kind, setKind] = useState("");
  const [sort, setSort] = useState("updated");
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [notice, setNotice] = useState("");
  const publish = useMutation({
    mutationFn: async () => {
      const results = await Promise.allSettled(
        [...selected].map((id) => privatePapersPatchPaper(id, { visibility: "public" })),
      );
      const failed = [...selected].filter((_, index) => results[index]?.status === "rejected");
      setSelected(new Set(failed));
      setNotice(
        failed.length
          ? `${results.length - failed.length} 篇已公开，${failed.length} 篇失败并保留选择，可重试。`
          : `${results.length} 篇已公开，公开站将在更新后显示。`,
      );
    },
    onSettled: () => void cache.invalidateQueries({ queryKey: ["papers"] }),
  });
  const readable = (query.data ?? []).filter((p) => p.readingDepth !== "R0");
  const groups = groupStudies(readable);
  const taxonomy = visibleTaxonomy(
    taxonomySource,
    readable.map((p) => p.id),
  );
  const assignment = (id: string) => taxonomy.assignments.find((a) => a.paperId === id);
  const rows = groups
    .map((group) => group.paper)
    .filter(
      (paper) =>
        (!q ||
          `${paper.title} ${paper.titleZh ?? ""} ${paper.oneSentence ?? ""}`
            .toLocaleLowerCase()
            .includes(q.toLocaleLowerCase())) &&
        (!space || topicContains(taxonomy.topics, assignment(paper.id)?.topicId ?? "", space)) &&
        (!visibility || paper.visibility === visibility) &&
        (!review || paper.review === review) &&
        (!depth || paper.readingDepth === depth) &&
        (!year || String(paper.year) === year) &&
        (!kind || paper.paperKind === kind),
    )
    .sort((a, b) =>
      sort === "year"
        ? (b.year ?? 0) - (a.year ?? 0) || a.id.localeCompare(b.id)
        : b.updatedAt.localeCompare(a.updatedAt) || a.id.localeCompare(b.id),
    );
  const years = [
    ...new Set((query.data ?? []).flatMap((paper) => (paper.year ? [paper.year] : []))),
  ].sort((a, b) => b - a);
  return (
    <section className="papers-page">
      <PaperHeader title="论文库" lead="" />
      <div className="paper-controls">
        <Input label="搜索论文" value={q} onChange={(event) => setQ(event.target.value)} />
        <label>
          研究主题
          <select value={space} onChange={(event) => setSpace(event.target.value)}>
            <option value="">全部主题</option>
            {taxonomy.topics.map((item) => (
              <option key={item.id} value={item.id}>
                {item.label}
              </option>
            ))}
          </select>
        </label>
        <label>
          公开状态
          <select value={visibility} onChange={(event) => setVisibility(event.target.value)}>
            <option value="">全部状态</option>
            <option value="public">已公开</option>
            <option value="private">未公开</option>
          </select>
        </label>
        <label>
          审核状态
          <select value={review} onChange={(event) => setReview(event.target.value)}>
            <option value="">全部审核</option>
            {Object.entries(reviewLabels).map(([value, label]) => (
              <option key={value} value={value}>
                {label}
              </option>
            ))}
          </select>
        </label>
        <label>
          阅读深度
          <select value={depth} onChange={(event) => setDepth(event.target.value)}>
            <option value="">全部深度</option>
            {["R0", "R1", "R2", "R3"].map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          年份
          <select value={year} onChange={(event) => setYear(event.target.value)}>
            <option value="">全部年份</option>
            {years.map((value) => (
              <option key={value}>{value}</option>
            ))}
          </select>
        </label>
        <label>
          论文类型
          <select value={kind} onChange={(event) => setKind(event.target.value)}>
            <option value="">全部类型</option>
            <option value="empirical">实证</option>
            <option value="theory">理论</option>
            <option value="survey">综述</option>
            <option value="system">系统</option>
          </select>
        </label>
        <label>
          排序
          <select value={sort} onChange={(event) => setSort(event.target.value)}>
            <option value="updated">最近更新</option>
            <option value="year">年份</option>
          </select>
        </label>
      </div>
      <QueryState
        loading={query.isPending}
        error={query.error ?? catalog.error}
        retry={() => {
          void query.refetch();
          void catalog.refetch();
        }}
      />
      <div className="paper-list-toolbar">
        <p>
          {rows.length} 项研究 · {readable.length} 个版本 · 已选择 {selected.size} 篇
        </p>
        <Button disabled={!selected.size || publish.isPending} onClick={() => publish.mutate()}>
          批量公开
        </Button>
      </div>
      {notice && <p role="status">{notice}</p>}
      {publish.error && <p role="alert">{errorMessage(publish.error)}</p>}
      {query.data && rows.length === 0 && <p>没有符合筛选条件的论文。</p>}
      <div className="paper-card-grid">
        {rows.map((paper) => (
          <article className="paper-card" key={paper.id}>
            <label className="paper-select">
              <input
                type="checkbox"
                disabled={publish.isPending}
                checked={selected.has(paper.id)}
                aria-label={`选择 ${paper.titleZh ?? paper.title}`}
                onChange={(event) =>
                  setSelected((before) => {
                    const next = new Set(before);
                    if (event.target.checked) next.add(paper.id);
                    else next.delete(paper.id);
                    return next;
                  })
                }
              />
              选择
            </label>
            <p className="eyebrow">
              {[publicationLabel(paper.venue), paper.year].filter(Boolean).join(" · ")}
            </p>
            <h2>
              <Link to="/papers/$id" params={{ id: paper.id }}>
                {paper.titleZh ?? paper.title}
              </Link>
            </h2>
            {paper.titleZh && <p className="paper-original-title">{paper.title}</p>}
            <p>{paper.oneSentence}</p>
            {groups.find((group) => group.paper.id === paper.id)!.versions.length > 1 && (
              <p className="muted">
                {groups
                  .find((group) => group.paper.id === paper.id)!
                  .versions.map((version) => /-?v(\d+)$/.exec(version.id)?.[0].replace("-", ""))
                  .join(" / ")}
              </p>
            )}
            <div className="row">
              <span className="paper-tag">
                {paper.visibility === "public" ? "已公开" : "未公开"}
              </span>
              <span className="paper-tag">{reviewLabels[paper.review]}</span>
              <span className="paper-tag">{paper.readingDepth}</span>
              {topicPath(taxonomy.topics, assignment(paper.id)?.topicId ?? "").map((topic) => (
                <span className="paper-tag" key={topic.id}>
                  {topic.label}
                </span>
              ))}
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
