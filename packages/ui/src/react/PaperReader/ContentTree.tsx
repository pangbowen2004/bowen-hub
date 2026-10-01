import type { ReactNode } from "react";
export const labels: Record<string, string> = {
  setup: "问题设定",
  existingMethods: "已有方法",
  gap: "研究缺口",
  name: "名称",
  whatItDoes: "解决什么",
  whyNotEnough: "不足",
  thesis: "核心思路",
  pipeline: "流程",
  components: "组成",
  question: "问题",
  how: "机制",
  purpose: "目的",
  caveat: "限制",
  anchor: "原文定位",
  howToRead: "怎样读结果",
  title: "标题",
  evidence: "证据",
  interpretation: "解读",
  whatItIs: "是什么",
  analogy: "类比",
  whyItMatters: "为什么重要",
  notTheSameAs: "不能等同于",
  thirtySecondStory: "30 秒理解",
  step: "步骤",
  detail: "说明",
  input: "输入",
  output: "输出",
  explanation: "解释",
  answer: "回答",
  page: "PDF 页",
  takeaway: "要点",
  id: "标识",
  dependsOn: "依赖概念",
  claimOrigin: "证据来源",
  pages: "页码",
  role: "作用",
  keyQuestion: "关键问题",
  status: "状态",
  dimension: "维度",
  judgment: "判断",
  note: "说明",
  translation: "研究迁移",
  safeDesign: "谨慎设计",
  why: "阅读理由",
};

export function ContentTree({
  value,
  labels: dictionary = labels,
}: {
  value: unknown;
  labels?: Record<string, string>;
}): ReactNode {
  if (typeof value === "string" || typeof value === "number") return <p>{value}</p>;
  if (Array.isArray(value))
    return (
      <ul>
        {value.map((item) => (
          <li key={JSON.stringify(item)}>
            <ContentTree value={item} labels={dictionary} />
          </li>
        ))}
      </ul>
    );
  if (value && typeof value === "object")
    return (
      <dl>
        {Object.entries(value)
          .filter(
            ([key, v]) =>
              key !== "id" &&
              v !== null &&
              v !== undefined &&
              v !== "" &&
              (!Array.isArray(v) || v.length > 0),
          )
          .map(([key, item]) => (
            <div key={key}>
              <dt>{dictionary[key] ?? key}</dt>
              <dd>
                <ContentTree value={item} labels={dictionary} />
              </dd>
            </div>
          ))}
      </dl>
    );
  return null;
}
