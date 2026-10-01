import { EChart } from "./EChart";
export default { parameters: { renderer: "react" }, title: "图表/EChart", component: EChart };
export const Default = {
  args: {
    label: "展示折线",
    source: "来源：手写展示数据",
    option: {
      xAxis: { type: "category", data: ["一", "二", "三"] },
      yAxis: {},
      series: [{ type: "line", data: [1, 3, 2] }],
    },
  },
};
