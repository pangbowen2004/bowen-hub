import { GraphView } from "./index";
export default {
  parameters: { renderer: "react" },
  title: "交互组件/GraphView",
  component: GraphView,
};
export const Default = {
  args: {
    data: {
      nodes: [
        { id: "sample-paper", kind: "paper", label: "示例论文" },
        { id: "sample-concept", kind: "concept", label: "示例概念" },
      ],
      edges: [{ source: "sample-paper", target: "sample-concept", type: "discusses" }],
      cooccurrence: [],
    },
  },
};
