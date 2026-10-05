import type { GraphData, PapersCatalog } from "@bowen-hub/contracts";
import { useEffect, useMemo, useRef, useState } from "react";
import { useReducedMotion } from "../../hooks/motion";
import { atlasPapers } from "./atlas";
import type { createAtlas } from "./scene";
import "./atlas.css";

export function Universe3D({
  data,
  catalog,
  privateLibrary = false,
}: {
  data: GraphData;
  catalog?: PapersCatalog;
  privateLibrary?: boolean;
}) {
  const papers = useMemo(() => atlasPapers(data, catalog), [data, catalog]);
  const spaces = useMemo(
    () =>
      catalog?.spaces ??
      data.nodes.filter((n) => n.kind === "space").map((n) => ({ id: n.id, label: n.label })),
    [catalog, data],
  );
  const [selected, setSelected] = useState(papers[0]?.id ?? "");
  const [space, setSpace] = useState("all");
  const [query, setQuery] = useState("");
  const [list, setList] = useState(false);
  const [concept, setConcept] = useState<string | null>(null);
  const [failure, setFailure] = useState(false);
  const reduced = useReducedMotion();
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<Awaited<ReturnType<typeof createAtlas>> | null>(null);
  const focus = useRef({ id: selected, space, concept, reduced });
  focus.current = { id: selected, space, concept, reduced };
  const current = papers.find((p) => p.id === selected) ?? papers[0];
  const pool = papers.filter(
    (p) =>
      (space === "all" || p.spaces.includes(space)) &&
      (!query ||
        [p.title, p.titleZh, ...p.concepts.map((c) => c.label)].some((t) =>
          t?.toLowerCase().includes(query.trim().toLowerCase()),
        )),
  );
  useEffect(() => {
    let disposed = false;
    void import("./scene")
      .then(async ({ createAtlas }) => {
        if (disposed || !container.current) return;
        const atlas = await createAtlas(
          container.current,
          papers,
          spaces,
          (id) => {
            setSelected(id);
            setConcept(null);
          },
          setConcept,
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
  }, [papers, spaces]);
  useEffect(() => {
    instance.current?.setFocus({ id: selected, space, concept, reduced });
  }, [selected, space, concept, reduced]);
  const title = (p: (typeof papers)[number]) => p.titleZh ?? p.title;
  const readHref = (id: string) => `/papers/${encodeURIComponent(id)}${privateLibrary ? "" : "/"}`;
  const select = (id: string) => {
    setSelected(id);
    setConcept(null);
    setList(false);
    setQuery("");
  };
  return (
    <section className="research-atlas" aria-label="论文宇宙">
      <div className="data-stage atlas-stage">
        <header className="atlas-heading">
          <div>
            <p className="eyebrow">研究图谱 / RESEARCH ATLAS</p>
            {privateLibrary ? <h2>全部研究空间</h2> : <h1>知识宇宙</h1>}
          </div>
          <dl>
            <div>
              <dt>论文</dt>
              <dd>{papers.length}</dd>
            </div>
            <div>
              <dt>概念</dt>
              <dd>{data.nodes.filter((n) => n.kind === "concept").length}</dd>
            </div>
            <div>
              <dt>关系</dt>
              <dd>{data.edges.filter((e) => e.type === "discusses").length}</dd>
            </div>
          </dl>
        </header>
        <div className="atlas-toolbar">
          <button type="button" aria-pressed={space === "all"} onClick={() => setSpace("all")}>
            全部论文
          </button>
          {spaces.map((s) => (
            <button
              type="button"
              key={s.id}
              aria-pressed={space === s.id}
              onClick={() => {
                setSpace(s.id);
                const first = papers.find((p) => p.spaces.includes(s.id));
                if (first) select(first.id);
              }}
            >
              {s.label}
            </button>
          ))}
          <button type="button" aria-pressed={list} onClick={() => setList(!list)}>
            {list ? "图谱视图" : "列表视图"}
          </button>
          <input
            type="search"
            value={query}
            aria-label="查找论文或概念"
            placeholder="查找论文或概念…"
            onChange={(e) => setQuery(e.target.value)}
          />
        </div>
        <div className="atlas-frame" hidden={list}>
          <div className="atlas-scene" ref={container} data-universe-canvas>
            <div className="atlas-space-labels">
              {spaces.map((s) => (
                <span key={s.id}>
                  {s.label} <small>{papers.filter((p) => p.spaces.includes(s.id)).length}</small>
                </span>
              ))}
            </div>
            {failure && (
              <p className="atlas-webgl-fallback" role="status">
                三维视图暂不可用，论文列表仍可阅读。
              </p>
            )}
          </div>
          {current && (
            <aside className="atlas-focus" aria-live="polite">
              <p className="eyebrow">阅读焦点 / READING FOCUS</p>
              <h2>{title(current)}</h2>
              <p className="atlas-meta">
                {[current.year, spaces.find((s) => current.spaces.includes(s.id))?.label]
                  .filter(Boolean)
                  .join(" · ")}
              </p>
              {current.oneSentence && <p>{current.oneSentence}</p>}
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
              <a className="read-paper" href={readHref(current.id)}>
                阅读这篇 <span aria-hidden="true">↗</span>
              </a>
            </aside>
          )}
        </div>
      </div>
      <div className="atlas-reading" id="paper-list">
        <header>
          <h2>
            {query ? "搜索结果" : privateLibrary ? "全部论文" : "公开论文"}{" "}
            <span>{pool.length} 篇</span>
          </h2>
        </header>
        <ul aria-label="宇宙论文">
          {pool.map((p) => (
            <li key={p.id} data-paper-id={p.id} className={p.id === selected ? "selected" : ""}>
              <div>
                <a className="atlas-paper-title" href={readHref(p.id)}>
                  {title(p)}
                </a>
                <p className="atlas-list-meta">
                  {p.spaces.map((id) => spaces.find((s) => s.id === id)?.label ?? id).join(" · ")}
                  {p.year && ` · ${p.year}`}
                </p>
                {p.oneSentence && <p>{p.oneSentence}</p>}
              </div>
              <button
                type="button"
                onClick={() => select(p.id)}
                aria-label={`在图谱中定位 ${title(p)}`}
              >
                定位 ↗
              </button>
            </li>
          ))}
        </ul>
        {pool.length === 0 && <p>没有匹配的论文。</p>}
      </div>
    </section>
  );
}
