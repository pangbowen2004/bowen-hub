import { PaperReader } from "./index";
export default {
  parameters: { renderer: "react" },
  title: "交互组件/PaperReader",
  component: PaperReader,
};
export const Default = {
  args: { children: "示例阅读内容：普通正文由服务端输出，打开页面即可阅读。" },
};
