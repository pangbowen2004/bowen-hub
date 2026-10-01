// 每个 AI 能力的输入 / 输出模型（docs/10 第 3 节；capabilities/<id>.yaml 的 io 引用这里的模型名）。
// 只负责导入各领域的文件：news.* 能力在 capabilities/news.tsp（T01 乙段），papers.* 在 capabilities/papers.tsp（T01 丁段）。
// 字段名、结构和字数上限以对应提示词 prompts/*.md 为准；字数上限用 @maxChars，原文片段用 @sourceQuote，图片用 @image。
import "./capabilities/news.tsp";
import "./capabilities/papers.tsp";
