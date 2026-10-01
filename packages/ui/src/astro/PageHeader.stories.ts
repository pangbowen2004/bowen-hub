import PageHeader from "./PageHeader.astro";
export default { title: "静态组件/PageHeader", component: PageHeader };
export const Default = {
  args: {
    title: "方向与 ETF",
    lead: "从成分宽度到 ETF 份额，同一交易日交叉验证。",
    date: "2026-08-28",
  },
};
