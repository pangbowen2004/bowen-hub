# AGENTS.md —— 给所有 AI Agent 的规矩

这个仓库是 Kevin 全部个人产品（美股新闻室、A 股观测台、论文阅读馆、控制台、MCP 服务）的**从零重写**。需求全部在 `docs/`，开发按 `tasks/graph.yaml` 分任务并行进行。

## 开始任何任务前

1. 读 `docs/00-总览.md`、`docs/01-架构与技术栈.md`、`docs/11-Agent协同开发协议.md`。
2. 在 `tasks/graph.yaml` 找到你的任务：只读它 `read` 里列出的文档，只改它 `owns` 里的路径。
3. 看 `docs/progress/` 里你依赖的任务的记录。

编排者另外负责：`mise run tasks:ready` 找可开工的任务、分派、审查（`docs/11` 第 7 节）、合并、向 Kevin 汇报。

## 硬规则

1. **语言**：和 Kevin 沟通、文档、PR 说明、提交说明、代码注释都用中文；代码里的标识符用英文。Kevin 读英文吃力，汇报里不要出现大段英文。
2. **不碰老代码**：不打开、不复制、不参考老项目的代码文件，包括 `~/Desktop/Daily News/*.py`、`~/Documents/量化/market-observatory/` 下的 `*.py` `*.js` `*.cjs`、`~/Documents/ChatGPT/科研/paper_dashboard/`。需要的规则、公式、阈值、提示词都已经写进 `docs/`、`config/`、`prompts/`。迁移时只允许**只读**老**数据**文件（`docs/06`）。
3. **文档为准，不要臆想**：实现以文档为准。文档有错、有矛盾或说不清：停下来，写进进度记录的“待决定”，告诉编排者；不要自己发明口径、阈值、规则或接口。
4. **契约优先**：接口和数据结构只在 `contracts/` 定义；不手改任何生成目录；改契约走单独的 `[C]` PR（`docs/11` 第 5.1 节）。
5. **写数据只经过 API**；**业务计算只在 Python 计算平面**；**AI 调用只经过能力运行时**（`docs/10`），不在业务代码里直接调模型。
6. **技术栈固定**：只用 `docs/01` 第 8 节列出的技术和 `docs/12` 列出的服务。新增服务或替换主要选型，先写 ADR 并问 Kevin；工具类小库在 PR 里说明即可（`docs/01` 第 8 节）。不买任何付费服务。
7. **简单优先，不做过度防护**：不写哈希账本、签名、多级审批、回执文件、门禁、“授权短语”。出错就明确失败、写日志、发通知。要追溯靠 git 和数据仓库的历史。
8. **密钥**：只从环境变量读；不打印、不写进日志和测试数据、不提交。`.env` 不入库。
9. **生产发布**：两个公开网址（`bowen-market-observatory`、`bowen-paper-library`）第一次切换到新系统，必须 Kevin 在对话里确认（关卡 G3，`docs/12` 第 2 节）；在那之前公开站只发预览地址。
10. **git**：一个任务一个分支一个 worktree；不 force push 别人的分支，不改写 main 的历史；squash 合并。
11. **`fixtures/` 里的老数据只读**：只用来对照和做测试数据；新格式样例放 `fixtures/samples/`（归 T01）。
12. **测试离线**：外部 HTTP 用录制的回放数据，模型用假模型；真实连通性只在 `hub providers check` 和验收里跑。

## 完成的标准

- `mise run check`、`mise run test` 通过；改到前端时 `mise run e2e` 通过；改到智能平面时 `hub evals run --changed` 达标。
- 按任务的 `accept` 逐项自测，把**真实**命令和输出写进 `docs/progress/<任务ID>.md`。
- 说“完成”之前，每一项都要有证据；做不到的写“未完成 + 原因”，不含糊。

## 代码风格

- Python：类型标注（pyright strict）；计算写成纯函数（输入 DataFrame 或模型，输出模型），IO 放在薄薄的外层；每个计算函数都有单元测试；能用 `fixtures/` 真实数据对照的就对照。
- TypeScript：`strict`；组件小而单一；数字格式化统一用 `packages/ui` 的格式化函数；数据只通过 `packages/contracts` 生成的客户端获取。
- 配置、文案、提示词放 `config/`、`prompts/`，不写死在代码里。
- 提交说明用中文：`<范围>: <做了什么>`，例如 `market: 实现涨停生态计算`；PR 标题 `[T21] A 股指标计算与对照`。
