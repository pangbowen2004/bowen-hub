import type { GraphData, PapersCatalog, SearchIndex } from "@bowen-hub/contracts";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/motion";
import { atlasPapers } from "./atlas";
import type { createAtlas } from "./scene";
import { publicationLabel } from "./studies";
import { type ReadingTaxonomy, topicContains, topicPath, visibleTaxonomy } from "./taxonomy";
import "./atlas.css";

export {
  groupStudies,
  publicationLabel,
  publicationNotes,
  studyGraph,
  studyKey,
  versionNumber,
} from "./studies";

export type { ReadingTaxonomy } from "./taxonomy";
export { topicContains, topicPath, visibleTaxonomy } from "./taxonomy";

export function Universe3D({
  data,
  catalog,
  searchIndex,
  taxonomy,
  privateLibrary = false,
}: {
  data: GraphData;
  catalog?: PapersCatalog;
  searchIndex?: SearchIndex;
  taxonomy?: ReadingTaxonomy;
  privateLibrary?: boolean;
}) {
  const papers = useMemo(() => atlasPapers(data, catalog), [data, catalog]);
  const directory = useMemo(
    () =>
      taxonomy &&
      visibleTaxonomy(
        taxonomy,
        papers.map((paper) => paper.id),
      ),
    [taxonomy, papers],
  );
  const assignments = useMemo(
    () => new Map(directory?.assignments.map((item) => [item.paperId, item]) ?? []),
    [directory],
  );
  const spaces = useMemo(
    () =>
      directory?.topics.filter((topic) => topic.parentId === null) ??
      catalog?.spaces ??
      data.nodes.filter((n) => n.kind === "space").map((n) => ({ id: n.id, label: n.label })),
    [catalog, data, directory],
  );
  const scenePapers = useMemo(
    () =>
      papers.map((paper) =>
        directory
          ? {
              ...paper,
              categoryIds: topicPath(directory.topics, assignments.get(paper.id)?.topicId ?? "")
                .slice(0, 1)
                .map((topic) => topic.id),
            }
          : paper,
      ),
    [papers, directory, assignments],
  );
  const [selected, setSelected] = useState(papers[0]?.id ?? "");
  const [space, setSpace] = useState("all");
  const [query, setQuery] = useState("");
  const [list, setList] = useState(false);
  const [concept, setConcept] = useState<string | null>(null);
  const [method, setMethod] = useState<string | null>(null);
  const [expanded, setExpanded] = useState<string[]>(["ai-research"]);
  const [failure, setFailure] = useState(false);
  const reduced = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Awaited<ReturnType<typeof createAtlas>> | null>(null);
  const sceneSpace =
    directory && space !== "all" ? (topicPath(directory.topics, space)[0]?.id ?? "all") : space;
  const focus = useRef({ id: selected, space: sceneSpace, concept, reduced });
  focus.current = { id: selected, space: sceneSpace, concept, reduced };
  const current = papers.find((p) => p.id === selected) ?? papers[0];
  const title = (p: (typeof papers)[number]) => p.titleZh ?? p.title;
  const readHref = (id: string) => `/papers/${encodeURIComponent(id)}${privateLibrary ? "" : "/"}`;
  const pool = papers.filter(
    (p) =>
      (space === "all" ||
        (directory
          ? topicContains(directory.topics, assignments.get(p.id)?.topicId ?? "", space)
          : p.spaces.includes(space))) &&
      (!concept || p.concepts.some((c) => c.id === concept)) &&
      (!method || assignments.get(p.id)?.methodTags.includes(method)) &&
      (!query.trim() ||
        [
          p.title,
          p.titleZh,
          p.oneSentence,
          ...p.concepts.map((c) => c.label),
          ...(searchIndex?.papers.find((item) => item.id === p.id)?.authors ?? []),
          ...(assignments.get(p.id)?.methodTags ?? []),
          ...topicPath(directory?.topics ?? [], assignments.get(p.id)?.topicId ?? "").map(
            (topic) => topic.label,
          ),
        ].some((t) => t?.toLowerCase().includes(query.trim().toLowerCase()))),
  );
  const related = current
    ? papers.filter(
        (p) =>
          p.id !== current.id &&
          p.concepts.some((c) => current.concepts.some((k) => k.id === c.id)),
      )
    : [];
  const select = useCallback((id: string) => {
    setSelected(id);
    setConcept(null);
  }, []);
  const chooseSpace = useCallback(
    (id: string) => {
      setSpace(id);
      setConcept(null);
      setMethod(null);
      const path = topicPath(directory?.topics ?? [], id);
      if (path[0]) setExpanded((open) => [...new Set([...open, path[0]!.id])]);
      const first = papers.find(
        (p) =>
          id === "all" ||
          (directory
            ? topicContains(directory.topics, assignments.get(p.id)?.topicId ?? "", id)
            : p.spaces.includes(id)),
      );
      if (first) setSelected(first.id);
    },
    [papers, directory, assignments],
  );
  useEffect(() => {
    let disposed = false;
    void import("./scene")
      .then(async ({ createAtlas }) => {
        if (disposed || !container.current) return;
        const atlas = await createAtlas(
          container.current,
          scenePapers,
          spaces,
          select,
          chooseSpace,
        );
        if (disposed) {
          atlas.dispose();
          return;
        }
        instance.current = atlas;
        atlas.setFocus(focus.current);
      })
      .catch(() => {
        if (!disposed) setFailure(true);
      });
    return () => {
      disposed = true;
      instance.current?.dispose();
      instance.current = null;
    };
  }, [scenePapers, spaces, select, chooseSpace]);
  useEffect(() => {
    instance.current?.setFocus({ id: selected, space: sceneSpace, concept, reduced });
  }, [selected, sceneSpace, concept, reduced]);
  useEffect(() => {
    if (pool.length && !pool.some((paper) => paper.id === selected)) setSelected(pool[0]!.id);
  }, [pool, selected]);
  const countTopic = (id: string) =>
    papers.filter((paper) =>
      directory
        ? topicContains(directory.topics, assignments.get(paper.id)?.topicId ?? "", id)
        : paper.spaces.includes(id),
    ).length;
  const breadcrumb = directory ? topicPath(directory.topics, space) : [];
  return (
    <section
      className={`research-atlas ${list ? "atlas-list-mode" : ""} ${directory ? "atlas-hierarchy" : ""}`}
      aria-label="论文宇宙"
    >
      <header className="atlas-heading">
        <div>
          <p className="atlas-kicker">YOUR RESEARCH, CONNECTED</p>
          {privateLibrary ? (
            <h2>知识宇宙</h2>
          ) : (
            <h1>
              知识宇宙<span>每一个问题，都有来处。</span>
            </h1>
          )}
        </div>
        <div className="atlas-count">
          <strong>{papers.length.toString().padStart(2, "0")}</strong>
          <span>
            篇论文
            <br />
            <small>{data.nodes.filter((n) => n.kind === "concept").length} 个概念</small>
          </span>
        </div>
      </header>
      <div className="atlas-toolbar">
        <nav className="atlas-tabs" aria-label="研究空间">
          <button type="button" aria-pressed={space === "all"} onClick={() => chooseSpace("all")}>
            全部论文<span>{papers.length}</span>
          </button>
          {spaces.map((s, i) => (
            <button
              key={s.id}
              type="button"
              aria-pressed={sceneSpace === s.id}
              onClick={() => chooseSpace(s.id)}
            >
              <i className={`space-dot space-${i}`} aria-hidden="true" />
              {s.label}
              <span>{countTopic(s.id)}</span>
            </button>
          ))}
        </nav>
        <button
          type="button"
          className="atlas-view-button"
          aria-pressed={list}
          onClick={() => setList(!list)}
        >
          {list ? "宇宙视图" : "列表视图"}
        </button>
        <label className="atlas-search">
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <circle cx="8.5" cy="8.5" r="5.5" stroke="currentColor" />
            <path d="m13 13 4 4" stroke="currentColor" />
          </svg>
          <input
            type="search"
            value={query}
            aria-label="查找论文或概念"
            placeholder="搜索论文、概念…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </label>
      </div>
      <div className="atlas-frame">
        {directory && (
          <nav className="atlas-topic-tree" aria-label="主题目录">
            <p className="atlas-section-label">研究方向</p>
            {spaces.map((root, index) => (
              <div className="atlas-topic-group" key={root.id}>
                <div className="atlas-topic-root">
                  <button
                    type="button"
                    aria-pressed={space === root.id}
                    onClick={() => chooseSpace(root.id)}
                  >
                    <i className={`space-dot space-${index}`} aria-hidden="true" />
                    <span>{root.label}</span>
                    <b>{countTopic(root.id)}</b>
                  </button>
                  {directory.topics.some((topic) => topic.parentId === root.id) && (
                    <button
                      type="button"
                      className="atlas-topic-expand"
                      aria-expanded={expanded.includes(root.id)}
                      aria-controls={`topic-${root.id}`}
                      aria-label={`${expanded.includes(root.id) ? "收起" : "展开"}${root.label}`}
                      onClick={() =>
                        setExpanded((open) =>
                          open.includes(root.id)
                            ? open.filter((id) => id !== root.id)
                            : [...open, root.id],
                        )
                      }
                    >
                      ⌄
                    </button>
                  )}
                </div>
                <ul id={`topic-${root.id}`} hidden={!expanded.includes(root.id)}>
                  {directory.topics
                    .filter((topic) => topic.parentId === root.id)
                    .map((topic) => (
                      <li key={topic.id}>
                        <button
                          type="button"
                          aria-pressed={space === topic.id}
                          onClick={() => chooseSpace(topic.id)}
                        >
                          <span>{topic.label}</span>
                          <b>{countTopic(topic.id)}</b>
                        </button>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </nav>
        )}
        <div className="atlas-visual" hidden={list}>
          <div className="atlas-scene" ref={container} data-universe-canvas />
          <div className="atlas-visual-title">
            <span className="atlas-coordinate">
              {spaces.length.toString().padStart(2, "0")} / RESEARCH DIRECTIONS
            </span>
            <p>
              {space === "all"
                ? "知识宇宙"
                : (breadcrumb.at(-1)?.label ?? spaces.find((s) => s.id === space)?.label)}
            </p>
          </div>
          <div className="atlas-space-dock" hidden={!!directory}>
            {spaces.map((s, i) => (
              <button
                type="button"
                key={s.id}
                aria-pressed={space === s.id}
                onClick={() => chooseSpace(s.id)}
              >
                <span className={`space-dot space-${i}`} aria-hidden="true" />
                <span>
                  {s.label}
                  <small>{s.label}</small>
                </span>
                <strong>{countTopic(s.id).toString().padStart(2, "0")}</strong>
              </button>
            ))}
          </div>
          <div className="atlas-visual-footer">
            <span>
              论文 <b>{papers.length}</b>
            </span>
            <span>
              概念 <b>{data.nodes.filter((n) => n.kind === "concept").length}</b>
            </span>
            <span>
              连接 <b>{data.edges.filter((e) => e.type === "discusses").length}</b>
            </span>
          </div>
          {failure && (
            <p className="atlas-webgl-fallback" role="status">
              三维视图暂不可用，论文列表仍可阅读。
            </p>
          )}
        </div>
        <div className="atlas-reading" id="paper-list">
          <header>
            <p>
              {method
                ? `标签 · ${method}`
                : query
                  ? "搜索结果"
                  : concept
                    ? "共享这个概念"
                    : space === "all"
                      ? "全部论文"
                      : (breadcrumb.at(-1)?.label ?? spaces.find((s) => s.id === space)?.label)}
              <span>{pool.length} 篇</span>
            </p>
            {concept && (
              <button type="button" onClick={() => setConcept(null)}>
                清除概念 ×
              </button>
            )}
            {method && (
              <button type="button" onClick={() => setMethod(null)}>
                清除标签 ×
              </button>
            )}
          </header>
          <ul aria-label="宇宙论文">
            {pool.map((p, i) => (
              <li key={p.id} data-paper-id={p.id} className={p.id === selected ? "selected" : ""}>
                <button
                  type="button"
                  className="atlas-paper-select"
                  onClick={() => select(p.id)}
                  aria-label={`在宇宙中查看 ${title(p)}`}
                  aria-pressed={p.id === selected}
                >
                  <span className="atlas-paper-number">{String(i + 1).padStart(2, "0")}</span>
                  <span className="atlas-paper-copy">
                    <span className="atlas-paper-title">{title(p)}</span>
                    <span className="atlas-list-meta">
                      {[p.year, publicationLabel(p.venue)].filter(Boolean).join(" · ")}
                    </span>
                  </span>
                </button>
                <a
                  className="atlas-paper-direct"
                  href={readHref(p.id)}
                  aria-label={`阅读全文 ${title(p)}`}
                >
                  ↗
                </a>
                {list && (
                  <div className="atlas-list-details">
                    {p.oneSentence && <p>{p.oneSentence}</p>}
                    <a href={readHref(p.id)}>阅读全文 ↗</a>
                  </div>
                )}
              </li>
            ))}
          </ul>
          {pool.length === 0 && (
            <p className="atlas-empty" role="status">
              没有匹配的论文。
            </p>
          )}
        </div>
        {current && (
          <aside className="atlas-focus" aria-live="polite">
            <div className="atlas-focus-top">
              <span className="atlas-coordinate">READING DESK</span>
              <a
                className="atlas-open"
                href={readHref(current.id)}
                aria-label={`阅读 ${title(current)}`}
              >
                ↗
              </a>
            </div>
            <p className="atlas-focus-space">
              {directory
                ? topicPath(directory.topics, assignments.get(current.id)?.topicId ?? "")
                    .map((topic) => topic.label)
                    .join(" / ")
                : current.spaces
                    .map((id) => spaces.find((s) => s.id === id)?.label)
                    .filter(Boolean)
                    .join(" / ")}
            </p>
            <h2>{title(current)}</h2>
            {current.titleZh && <p className="atlas-original-title">{current.title}</p>}
            <div className="atlas-paper-facts">
              <span>{current.year ?? ""}</span>
              {publicationLabel(current.venue) && <span>{publicationLabel(current.venue)}</span>}
            </div>
            {current.oneSentence && (
              <div className="atlas-synopsis">
                <span>这篇在研究什么</span>
                <p>{current.oneSentence}</p>
              </div>
            )}
            {!!assignments.get(current.id)?.methodTags.length && (
              <div className="atlas-methods">
                <p className="atlas-section-label">方法标签</p>
                <div className="atlas-chips">
                  {assignments.get(current.id)?.methodTags.map((tag) => (
                    <button
                      type="button"
                      key={tag}
                      aria-pressed={method === tag}
                      onClick={() => {
                        setMethod(method === tag ? null : tag);
                        setConcept(null);
                        setSpace("all");
                      }}
                    >
                      {tag}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {current.concepts.length > 0 && (
              <div className="atlas-concepts">
                <p className="atlas-section-label">
                  核心概念 <span>{current.concepts.length}</span>
                </p>
                <div className="atlas-chips">
                  {current.concepts.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      aria-pressed={concept === c.id}
                      onClick={() => setConcept(concept === c.id ? null : c.id)}
                    >
                      {c.label}
                    </button>
                  ))}
                </div>
              </div>
            )}
            {related.length > 0 && (
              <div className="atlas-related">
                <p className="atlas-section-label">
                  共享概念 <span>{related.length}</span>
                </p>
                {related.slice(0, 2).map((p) => (
                  <button key={p.id} type="button" onClick={() => select(p.id)}>
                    {title(p)}
                    <span aria-hidden="true">↗</span>
                  </button>
                ))}
              </div>
            )}
            <a className="read-paper" href={readHref(current.id)}>
              阅读这篇<span aria-hidden="true">↗</span>
            </a>
          </aside>
        )}
      </div>
      <footer className="atlas-bottom">
        <span>
          <i aria-hidden="true" />
          原文、导读与证据，放在同一张桌上。
        </span>
        <a href={privateLibrary ? "/papers" : "/library/"}>
          进入论文库 <span aria-hidden="true">↗</span>
        </a>
      </footer>
    </section>
  );
}
