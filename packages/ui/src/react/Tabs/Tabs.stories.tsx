import { Tabs } from "./index";
export default { parameters: { renderer: "react" }, title: "交互组件/Tabs", component: Tabs };
export const Default = {
  args: {
    items: [
      { id: "one", label: "概览", content: "概览内容" },
      { id: "two", label: "详情", content: "详情内容" },
    ],
  },
};
