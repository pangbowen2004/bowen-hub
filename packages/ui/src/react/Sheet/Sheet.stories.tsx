import { Button } from "../Button/index";
import { Sheet } from "./index";
export default { parameters: { renderer: "react" }, title: "交互组件/Sheet", component: Sheet };
export const Default = {
  args: { trigger: <Button>打开侧栏</Button>, title: "侧栏", children: <p>侧栏内容</p> },
};
