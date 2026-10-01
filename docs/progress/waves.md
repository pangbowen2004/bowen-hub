# 波次记录

编排者每完成一个波次在这里追加一段：合并了哪些任务、遇到的问题、下一波开哪些任务。

## 第 0 波（2026-09-30 — 2026-10-01）

- **合并**：T00 仓库骨架与工具链（PR #1，squash 合并为 01cd42f）。空 PR（#2）上 CI 为绿色；`mise run tasks:ready` 只列出 T01。
- **开工前准备**：建了私有仓库 bowen-hub、bowen-hub-data；做了一次文档预检（49 个问题 + 13 条存疑），Kevin 对 19 条产品口径"全部按推荐"，另确认 TuShare 用 8000 积分档、SKHY = SK 海力士、SPCX = SpaceX、迁移补充字段卡、五日方向缺失的统计；编排者裁定其余 26 条工程安排。全部结论已写回 docs/、tasks/graph.yaml 和少量配置（`[编排]` PR）。
- **遇到的问题**：turbo 检测到 AI Agent 会往 AGENTS.md 写英文说明（已关闭）；TypeScript 7 没有旧的编程接口，dependency-cruiser 单独配 TypeScript 6；.astro 文件的导入原先查不到（已补检查）；Agent 两次因额度上限中断，从中断处继续；中途由 Codex 接手一轮（T00 的修改与文档复核），之后由 Claude 收尾合并。
- **下一波**：第 1 波 T01 契约与代码生成，分四段做（地基 → 新闻 / 市场 / 论文并行 → 收尾）。
