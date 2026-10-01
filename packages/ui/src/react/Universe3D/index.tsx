import type { GraphData } from "@bowen-hub/contracts";
import type { ForceGraph3DInstance, NodeObject } from "3d-force-graph";
import { useEffect, useRef, useState } from "react";

type UniverseNode = NodeObject & GraphData["nodes"][number];
export function Universe3D({ data }: { data: GraphData }) {
  const container = useRef<HTMLDivElement>(null);
  const instance = useRef<ForceGraph3DInstance | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [status, setStatus] = useState("尚未加载 3D 图谱");
  useEffect(() => {
    let disposed = false;
    let resize: ResizeObserver | undefined;
    let theme: MutationObserver | undefined;
    if (!enabled) return;
    setStatus("正在加载 3D 图谱…");
    void (async () => {
      try {
        const { default: ForceGraph3D } = await import("3d-force-graph");
        if (disposed || !container.current) return;
        const style = getComputedStyle(document.documentElement);
        const graph = new ForceGraph3D(container.current, { controlType: "orbit" })
          .width(container.current.clientWidth)
          .height(520)
          .backgroundColor(style.getPropertyValue("--bg").trim() || "#f2f1ed")
          .graphData({
            nodes: data.nodes.map((n) => ({ ...n })),
            links: data.edges.map((e) => ({ ...e })),
          })
          .nodeColor((node) =>
            (node as UniverseNode).kind === "paper"
              ? style.getPropertyValue("--accent").trim() || "#30594d"
              : (node as UniverseNode).kind === "space"
                ? style.getPropertyValue("--text").trim() || "#616765"
                : style.getPropertyValue("--muted").trim() || "#8fa79e",
          )
          .nodeLabel((node) => {
            const label = document.createElement("span");
            label.textContent = String((node as UniverseNode).label ?? node.id);
            return label;
          })
          .linkColor(() =>
            getComputedStyle(document.documentElement).getPropertyValue("--border").trim(),
          )
          .showNavInfo(false)
          .onNodeClick((node) => {
            if ((node as UniverseNode).kind === "paper")
              window.location.assign(`/papers/${encodeURIComponent(String(node.id))}/`);
          });
        instance.current = graph;
        resize = new ResizeObserver(() => {
          if (container.current) graph.width(container.current.clientWidth);
        });
        resize.observe(container.current);
        theme = new MutationObserver(() => {
          const tokens = getComputedStyle(document.documentElement);
          graph.backgroundColor(tokens.getPropertyValue("--bg").trim());
          graph.nodeColor((node) =>
            tokens
              .getPropertyValue(
                (node as UniverseNode).kind === "paper"
                  ? "--accent"
                  : (node as UniverseNode).kind === "space"
                    ? "--text"
                    : "--muted",
              )
              .trim(),
          );
          graph.linkColor(() => tokens.getPropertyValue("--border").trim());
        });
        theme.observe(document.documentElement, {
          attributes: true,
          attributeFilter: ["data-theme", "class"],
        });
        if (matchMedia("(prefers-reduced-motion: reduce)").matches) graph.cooldownTicks(0);
        setStatus("3D 图谱已加载");
      } catch {
        if (!disposed) setStatus("3D 图谱无法加载，请使用 2D 图谱或下方论文链接。");
      }
    })();
    return () => {
      disposed = true;
      resize?.disconnect();
      theme?.disconnect();
      instance.current?._destructor();
      instance.current = null;
    };
  }, [data, enabled]);
  return (
    <section
      aria-label="3D 论文宇宙"
      style={{ minWidth: 0, maxWidth: "100%", overflowWrap: "anywhere" }}
    >
      <p>电脑体验更好。拖动旋转，滚轮缩放，点击论文节点进入导读。</p>
      <p>
        <a href="/graph/">前往 2D 图谱</a>
      </p>
      {!enabled && (
        <button type="button" onClick={() => setEnabled(true)} style={{ minHeight: 44 }}>
          加载 3D 图谱
        </button>
      )}
      <p role="status">{status}</p>
      <div
        ref={container}
        data-universe-canvas
        style={{
          width: "100%",
          maxWidth: "100%",
          height: enabled ? 520 : 0,
          overflow: "hidden",
          position: "relative",
        }}
      />
      <ul aria-label="宇宙论文">
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
