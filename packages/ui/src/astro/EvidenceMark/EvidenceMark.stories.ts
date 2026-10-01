import EvidenceMark from "./index.astro";
export default { title: "阅读组件/EvidenceMark", component: EvidenceMark };
export const OriginalEvidence = {
  args: {
    claims: [
      {
        id: "sample",
        kind: "result",
        claim: "示例主张：这是证据展示格式，不是研究事实。",
        pdfPage: 2,
        sourceExcerpt: "用于展示布局的示例摘录。",
        interpretationBoundary: "仅供组件演示。",
      },
    ],
  },
};
export const Inferred = { args: { inferred: true } };
