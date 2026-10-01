import type { GraphData } from "@bowen-hub/contracts";
import { useEffect, useRef, useState } from "react";
import type Sigma from "sigma";
import { type GraphMode, makeGraph } from "./graph";
export function GraphView({ data }: { data: GraphData }) {
  const container = useRef<HTMLDivElement>(null);
  const renderer = useRef<Sigma | null>(null);
  const [mode, setMode] = useState<GraphMode>("relations");
  const [search, setSearch] = useState("");
  const searchRef = useRef("");
  const [status, setStatus] = useState("正在加载 2D 图谱…");
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    let observer: MutationObserver | undefined;
    const mount = async () => {
      try {
        const { default: Sigma } = await import("sigma");
        if (disposed || !container.current) return;
        const style = getComputedStyle(document.documentElement);
        const colors = {
          paper: style.getPropertyValue("--accent").trim() || "#30594d",
          concept: style.getPropertyValue("--muted").trim() || "#616765",
          space: style.getPropertyValue("--text").trim() || "#24282a",
          border: style.getPropertyValue("--border").trim() || "#cccfca",
        };
        const graph = makeGraph(data, mode, colors);
        renderer.current?.kill();
        renderer.current = new Sigma(graph, container.current, {
          renderEdgeLabels: true,
          labelColor: { color: colors.space },
          labelFont: "system-ui",
          nodeReducer: (_node, attrs) => ({
            ...attrs,
            highlighted:
              !!searchRef.current &&
              String(attrs.label).toLocaleLowerCase().includes(searchRef.current),
            color:
              searchRef.current &&
              !String(attrs.label).toLocaleLowerCase().includes(searchRef.current)
                ? colors.border
                : attrs.color,
          }),
        });
        renderer.current.on("clickNode", ({ node }) => {
          if (graph.getNodeAttribute(node, "kind") === "paper")
            window.location.assign(`/papers/${encodeURIComponent(node)}/`);
        });
        setStatus("2D 图谱已加载");
      } catch {
        if (!disposed) setStatus("图谱无法加载，请使用下方论文链接。");
      }
    };
    void mount();
    resize = new ResizeObserver(() => renderer.current?.resize());
    if (container.current) resize.observe(container.current);
    observer = new MutationObserver(() => void mount());
    observer.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme", "class"],
    });
    return () => {
      disposed = true;
      resize?.disconnect();
      observer?.disconnect();
      renderer.current?.kill();
      renderer.current = null;
    };
  }, [data, mode]);
  useEffect(() => {
    searchRef.current = search.trim().toLocaleLowerCase();
    renderer.current?.refresh();
  }, [search]);
  return (
    <section
      aria-label="2D 论文图谱"
      style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" }}
    >
      <div style={{ display: "flex", flexWrap: "wrap", gap: "1rem", marginBlock: "1rem" }}>
        <label>
          视图{" "}
          <select
            value={mode}
            onChange={(event) => setMode(event.target.value as GraphMode)}
            style={{ minHeight: 44 }}
          >
            <option value="relations">论文、概念与研究空间</option>
            <option value="cooccurrence">概念共现</option>
          </select>
        </label>
        <label>
          搜索节点{" "}
          <input
            type="search"
            value={search}
            onChange={(event) => setSearch(event.target.value)}
            style={{ minHeight: 44, maxWidth: "100%" }}
          />
        </label>
      </div>
      <p className="muted">
        论文 · 概念 · 研究空间。关系图仅显示已有明确关系；共现边的权重表示共同出现的论文数。
      </p>
      <ul
        aria-label="图例"
        style={{ display: "flex", flexWrap: "wrap", gap: "1.5rem", listStyle: "none", padding: 0 }}
      >
        {[
          ["论文", "var(--accent)"],
          ["概念", "var(--muted)"],
          ["研究空间", "var(--text)"],
        ].map(([label, color]) => (
          <li key={label}>
            <span
              aria-hidden="true"
              style={{
                display: "inline-block",
                width: 10,
                height: 10,
                borderRadius: "50%",
                background: color,
                marginRight: 8,
              }}
            />
            {label}
          </li>
        ))}
      </ul>
      <p role="status">{status}</p>
      <div
        ref={container}
        data-graph-canvas
        style={{
          height: "min(65vh,600px)",
          minHeight: 320,
          width: "100%",
          position: "relative",
          overflow: "hidden",
          border: "1px solid var(--border)",
        }}
      />
      <p className="muted">拖动平移，滚轮缩放，点击论文节点打开导读。</p>
      <ul aria-label="图谱论文">
        {data.nodes
          .filter((n) => n.kind === "paper")
          .map((n) => (
            <li key={n.id}>
              <a href={`/papers/${n.id}/`}>{n.label}</a>
            </li>
          ))}
      </ul>
    </section>
  );
}
