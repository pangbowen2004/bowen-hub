import { Button } from "../Button/index";
import { Dialog } from "./index";
export default { title: "交互组件/Dialog", component: Dialog };
export const Default = {
  args: { trigger: <Button>打开对话框</Button>, title: "说明", children: <p>对话内容</p> },
};
