// 进入可视区域才加载与初始化，按调用方需求注册图表类型。
import type { ECharts, EChartsCoreOption } from "echarts/core";
import { useEffect, useRef, useState } from "react";

type ChartType = "line" | "bar" | "candlestick" | "treemap" | "heatmap" | "scatter";
const DEFAULT_TYPES: ChartType[] = ["line"];
export function EChart({
  option,
  label,
  source,
  types = DEFAULT_TYPES,
}: {
  option: EChartsCoreOption;
  label: string;
  source: string;
  types?: ChartType[];
}) {
  const ref = useRef<HTMLDivElement>(null);
  const [error, setError] = useState(false);
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    let chart: ECharts | undefined;
    let disposed = false;
    let initializing = false;
    let inView = false;
    const initialize = async () => {
      if (chart || initializing || !inView || disposed) return;
      initializing = true;
      try {
        const [core, charts, components, renderers] = await Promise.all([
          import("echarts/core"),
          import("echarts/charts"),
          import("echarts/components"),
          import("echarts/renderers"),
        ]);
        if (disposed) return;
        const available = {
          line: charts.LineChart,
          bar: charts.BarChart,
          candlestick: charts.CandlestickChart,
          treemap: charts.TreemapChart,
          heatmap: charts.HeatmapChart,
          scatter: charts.ScatterChart,
        };
        core.use([
          ...types.map((type) => available[type]),
          components.GridComponent,
          components.TooltipComponent,
          components.LegendComponent,
          components.DataZoomComponent,
          components.VisualMapComponent,
          components.MarkLineComponent,
          renderers.CanvasRenderer,
        ]);
        const tokens = getComputedStyle(element);
        const token = (name: string) => tokens.getPropertyValue(name).trim();
        const axis = {
          axisLine: { lineStyle: { color: token("--border") } },
          axisLabel: { color: token("--text") },
          splitLine: { lineStyle: { color: token("--border") } },
        };
        chart = core.init(element, {
          color: ["--accent", "--paper", "--warning", "--info", "--console", "--market"].map(token),
          textStyle: { color: token("--text"), fontFamily: tokens.fontFamily },
          categoryAxis: axis,
          valueAxis: axis,
          candlestick: {
            itemStyle: {
              color: token("--up"),
              color0: token("--down"),
              borderColor: token("--up"),
              borderColor0: token("--down"),
            },
          },
        });
        chart.setOption(option);
        setError(false);
      } catch {
        if (!disposed) setError(true);
      } finally {
        initializing = false;
      }
    };
    const visible = new IntersectionObserver((entries) => {
      inView = entries.some((entry) => entry.isIntersecting);
      if (inView) void initialize();
    });
    visible.observe(element);
    const resize = new ResizeObserver(() => chart?.resize());
    resize.observe(element);
    const scheme = matchMedia("(prefers-color-scheme: dark)");
    const theme = () => {
      chart?.dispose();
      chart = undefined;
      void initialize();
    };
    scheme.addEventListener("change", theme);
    const attributes = new MutationObserver(theme);
    attributes.observe(document.documentElement, {
      attributes: true,
      attributeFilter: ["data-theme"],
    });
    return () => {
      disposed = true;
      visible.disconnect();
      resize.disconnect();
      scheme.removeEventListener("change", theme);
      attributes.disconnect();
      chart?.dispose();
    };
  }, [option, types]);
  return (
    <figure>
      <div ref={ref} role="img" aria-label={label} style={{ height: 320, width: "100%" }} />
      {error && <p role="status">图表未能加载，请查看相关数据表。</p>}
      <figcaption className="muted">{source}</figcaption>
    </figure>
  );
}
