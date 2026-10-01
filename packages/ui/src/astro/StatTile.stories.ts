import StatTile from "./StatTile.astro";
export default { title: "静态组件/StatTile", component: StatTile };
export const Default = {
  args: { label: "成交额", value: "2.1177 万亿", change: "+1.23%", direction: "up" },
};
