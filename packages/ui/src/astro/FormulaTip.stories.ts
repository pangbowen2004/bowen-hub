import FormulaTip from "./FormulaTip.astro";
export default { title: "静态组件/FormulaTip", component: FormulaTip };
export const Default = {
  args: {
    id: "formula-example",
    label: "上涨覆盖",
    definition: "上涨股票占全部股票的比例",
    formula: "上涨家数 / 全部家数",
  },
};
