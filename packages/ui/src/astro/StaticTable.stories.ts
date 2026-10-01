import StaticTable from "./StaticTable.astro";
export default { title: "静态组件/StaticTable", component: StaticTable };
export const Default = {
  args: {
    caption: "指标示例",
    columns: [{ label: "名称" }, { label: "数值", numeric: true }],
    rows: [
      ["成交额", "2.1177 万亿"],
      ["缺失", null],
    ],
  },
};
