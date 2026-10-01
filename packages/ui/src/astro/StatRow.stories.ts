import StatRow from "./StatRow.astro";
export default { title: "静态组件/StatRow", component: StatRow };
export const Default = {
  args: {
    slots: {
      default:
        '<article class="card stat-tile"><h3>成交额</h3><p class="stat-value">2.1177 万亿</p></article><article class="card stat-tile"><h3>上涨覆盖</h3><p class="stat-value">54.32%</p></article>',
    },
  },
};
