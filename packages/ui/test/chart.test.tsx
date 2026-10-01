import { act, cleanup, render, screen, waitFor } from "@testing-library/react";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import { EChart } from "../src/charts/EChart";

const mocks = vi.hoisted(() => ({
  init: vi.fn(),
  use: vi.fn(),
  resize: vi.fn(),
  dispose: vi.fn(),
  setOption: vi.fn(),
}));
vi.mock("echarts/core", () => ({ init: mocks.init, use: mocks.use }));
vi.mock("echarts/charts", () => ({
  LineChart: "line",
  BarChart: "bar",
  CandlestickChart: "candlestick",
  TreemapChart: "treemap",
  HeatmapChart: "heatmap",
  ScatterChart: "scatter",
}));
vi.mock("echarts/components", () => ({
  GridComponent: "grid",
  TooltipComponent: "tooltip",
  LegendComponent: "legend",
  DataZoomComponent: "zoom",
  VisualMapComponent: "visual",
  MarkLineComponent: "markLine",
}));
vi.mock("echarts/renderers", () => ({ CanvasRenderer: "canvas" }));
let enter: (entries: { isIntersecting: boolean }[]) => void;
let resize: () => void;
let theme: () => void;
const disconnect = vi.fn();
beforeEach(() => {
  vi.clearAllMocks();
  mocks.init.mockReturnValue({
    resize: mocks.resize,
    dispose: mocks.dispose,
    setOption: mocks.setOption,
  });
  vi.stubGlobal(
    "IntersectionObserver",
    class {
      constructor(callback: typeof enter) {
        enter = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal(
    "ResizeObserver",
    class {
      constructor(callback: typeof resize) {
        resize = callback;
      }
      observe() {}
      disconnect = disconnect;
    },
  );
  vi.stubGlobal(
    "MutationObserver",
    class {
      constructor(private callback: typeof theme) {}
      observe(target: Node) {
        if (target === document.documentElement) theme = this.callback;
      }
      disconnect = disconnect;
    },
  );
  vi.stubGlobal("matchMedia", () => ({ addEventListener: vi.fn(), removeEventListener: vi.fn() }));
});
afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});
it("不可见时不初始化，进入视区只注册所需图表，响应尺寸和主题并释放资源", async () => {
  const option = { series: [] };
  const view = render(<EChart option={option} label="测试图" source="样例" types={["bar"]} />);
  expect(mocks.init).not.toHaveBeenCalled();
  act(() => theme());
  expect(mocks.init).not.toHaveBeenCalled();
  act(() => enter([{ isIntersecting: true }]));
  await waitFor(() => expect(mocks.init).toHaveBeenCalledTimes(1));
  expect(mocks.use.mock.calls[0]?.[0]).toContain("bar");
  expect(mocks.use.mock.calls[0]?.[0]).not.toContain("line");
  expect(mocks.setOption).toHaveBeenCalledWith(option);
  act(() => resize());
  expect(mocks.resize).toHaveBeenCalledTimes(1);
  act(() => theme());
  await waitFor(() => expect(mocks.init).toHaveBeenCalledTimes(2));
  view.unmount();
  expect(mocks.dispose).toHaveBeenCalledTimes(2);
  expect(disconnect.mock.calls.length).toBeGreaterThanOrEqual(3);
});
it("图表初始化失败显示可读降级提示", async () => {
  mocks.init.mockImplementation(() => {
    throw new Error("初始化失败");
  });
  render(<EChart option={{}} label="测试图" source="样例" />);
  act(() => enter([{ isIntersecting: true }]));
  await waitFor(() => expect(screen.getByRole("status").textContent).toContain("图表未能加载"));
});

it("暗色主题的调色板与值轴网格线采用设计令牌", async () => {
  vi.stubGlobal("getComputedStyle", () => ({
    fontFamily: "测试字体",
    getPropertyValue: (name: string) =>
      ({
        "--text": "#edf1f7",
        "--border": "#354152",
        "--accent": "#aba8ff",
        "--paper": "#5ed5c0",
        "--warning": "#edc267",
        "--info": "#91afff",
        "--console": "#aba8ff",
        "--market": "#91afff",
        "--up": "#ff6b5f",
        "--down": "#4cc38a",
      })[name] ?? "",
  }));
  render(<EChart option={{}} label="暗色测试图" source="样例" />);
  act(() => enter([{ isIntersecting: true }]));
  await waitFor(() => expect(mocks.init).toHaveBeenCalledOnce());
  expect(mocks.init.mock.calls[0]?.[1]).toMatchObject({
    color: ["#aba8ff", "#5ed5c0", "#edc267", "#91afff", "#aba8ff", "#91afff"],
    textStyle: { color: "#edf1f7", fontFamily: "测试字体" },
    valueAxis: { splitLine: { lineStyle: { color: "#354152" } } },
    categoryAxis: { axisLine: { lineStyle: { color: "#354152" } } },
    candlestick: { itemStyle: { color: "#ff6b5f", color0: "#4cc38a" } },
  });
});
