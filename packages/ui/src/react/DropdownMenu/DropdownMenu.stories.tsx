import { Button } from "../Button/index";
import { DropdownMenu } from "./index";
export default { title: "交互组件/DropdownMenu", component: DropdownMenu };
export const Default = {
  args: { trigger: <Button>更多</Button>, items: [{ label: "查看", onSelect: () => {} }] },
};
