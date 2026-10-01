import { DataTable } from "./index";
export default { title: "交互组件/DataTable", component: DataTable };
export const Default = {
  args: {
    rows: [
      { id: "one", name: "甲", score: 2 },
      { id: "two", name: "乙", score: 1 },
    ],
    rowKey: (row: { id: string }) => row.id,
    columns: [
      { id: "name", label: "名称", value: (row: { name: string }) => row.name },
      { id: "score", label: "分数", numeric: true, value: (row: { score: number }) => row.score },
    ],
  },
};
