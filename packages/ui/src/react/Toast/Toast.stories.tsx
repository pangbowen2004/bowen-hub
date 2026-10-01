import { Toast } from "./index";
export default { parameters: { renderer: "react" }, title: "交互组件/Toast", component: Toast };
export const Default = { args: { title: "已完成", open: true, onOpenChange: () => {} } };
