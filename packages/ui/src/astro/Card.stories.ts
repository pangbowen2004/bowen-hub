import Card from "./Card.astro";
export default { title: "静态组件/Card", component: Card };
export const Default = {
  args: { slots: { default: "<p>市场数据按统一口径展示，缺失值保留说明。</p>" }, title: "摘要" },
};
