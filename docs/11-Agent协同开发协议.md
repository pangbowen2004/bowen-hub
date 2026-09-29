# 11 Agent 协同开发协议

> 这个仓库按“多个 AI Agent 同时开发”来设计。本文件规定：谁做什么、怎么拆任务、怎么避免互相踩脚、怎么证明做完了。
> 任务的完整清单在 `tasks/graph.yaml`；本文件是规则。

## 1. 角色

| 角色 | 谁 | 做什么 |
|---|---|---|
| **Kevin** | 产品负责人 | 准备账号和密钥；在关卡（第 9 节）验收；确认生产发布。只和编排者对话 |
| **编排者** | 一个 Agent 会话（能力最强的那个） | 读任务图，找出可以开工的任务，分派给工作者；审查并合并 PR；维护进度；向 Kevin 汇报 |
| **工作者** | 若干 Agent 会话，每个一次只做一个任务 | 在自己的工作区里完成任务，自测，开 PR |
| **审查者**（可选） | 另一个 Agent 会话 | 按第 7 节的清单审 PR；编排者也可以兼任 |

任何 Agent（Claude、GPT、Gemini、Codex 等）都可以担任任何角色；规则对所有人一样。

## 2. 任务图（`tasks/graph.yaml`）

每个任务写明：

| 字段 | 含义 |
|---|---|
| `id` / `title` | 编号与标题（如 `T21 市场指标计算`） |
| `wave` | 波次：同一波次、依赖都已完成的任务可以同时做 |
| `dependsOn` | 必须先合并的任务 |
| `owns` | 这个任务**独占**的路径（glob）。别的任务不能改 |
| `scaffolds` | 这个任务要建出来、但之后归别的任务的空骨架（第 4 节） |
| `sharedEdits` | 明确允许改的别人的文件，以及能改的范围（例如 T06 只改 `wrangler.jsonc` 里的资源 ID） |
| `read` | 开工前要读的文档和文件（控制上下文大小：只读这些就够了） |
| `deliver` | 交付物 |
| `accept` | 验收：可执行的命令和可检查的标准 |
| `deferred` | 要等后面的任务才能检查的验收项，统一放到 T52 |
| `difficulty` | high / medium / low：建议把 high 分给最强的 Agent |

任务的状态不写进 `graph.yaml`（避免多人同时改一个文件），而是看：
- 分支 `task/T21-*` 存在 = 进行中；
- PR 标题 `[T21] …` 已合并 = 完成；
- `docs/progress/T21.md` = 这个任务的记录（第 6 节）。

编排者每次分派前运行 `mise run tasks:ready`，列出依赖都已完成、还没人做的任务。

## 3. 工作区、分支与合并

- **一个任务 = 一个分支 = 一个 git worktree**：`git worktree add ../bowen-hub-T21 -b task/T21-market-compute`。互不干扰，可以同时跑测试。
- PR 标题 `[T21] 市场指标计算`，正文用中文，写清交付物和验收结果（指向 `docs/progress/T21.md`）。
- 合并方式：squash。合并前 CI 必须全绿（第 8 节）。
- 和 main 有冲突：工作者自己 rebase 并重跑测试；不 force push 别人的分支，不改写 main 的历史。
- 锁文件（`pnpm-lock.yaml`、`py/uv.lock`）冲突时，不手工合并：以 main 为准，重新 `pnpm install` / `uv lock`。

## 4. 路径所有权

- 每个任务只能改自己 `owns` 里的路径，加上四类公共文件：自己的 `docs/progress/<任务ID>.md`、新增的 ADR 文件、锁文件、自己包的依赖清单（`package.json` / `pyproject.toml` 里的依赖段）。
- 两个任务的路径有包含关系时，**更具体的那条优先**：T02 拥有 `services/api/src/lib/**`，但 `services/api/src/lib/auth/**` 归 T40。
- `docs/` 下的规格文档只由编排者修改（Kevin 同意后）。
- **骨架**：`scaffolds` 里的路径由该任务一次性建成空骨架（占位文件、目录、入口登记），创建它们的 PR 可以越过所有权检查；合并之后，这些文件归 `owns` 覆盖它们的任务。
- **生成物**：`mise run gen` 和 TanStack Router 生成的文件（`contracts/generated/`、`packages/contracts/src/generated/`、`py/packages/hub-contracts/`、`services/api/src/routes.gen.ts`、`apps/console/src/routeTree.gen.ts`）不受所有权限制，任何 PR 都可以包含，但只能由生成命令改动，不能手改。
- **样例数据**：`fixtures/samples/` 的基础样例归 T01；之后任务需要新样例时放在 `fixtures/samples/<任务ID>/`，归该任务。
- CI 的 `mise run check:ownership` 读 PR 标题里的任务号，检查改动的文件是否都在允许范围内；越界就失败。
- 需要改别人的地方（比如发现 API 某个模块有 bug），不要顺手改：在自己的进度记录里写明，由编排者开一个小任务或转给该模块的任务。

## 5. 预接线：让并行开发不打架

地基任务（T00–T05）先把“接口和插座”全部装好，后面的任务只往里填实现。预接好的内容：

| 预接的东西 | 谁装 | 后续任务怎么用 |
|---|---|---|
| 全部数据模型和接口（TypeSpec），每个接口用 `x-task` 标注由哪个任务实现 | T01 | 只实现，不新增；要改走第 5.1 节 |
| 生成的 TS / Python 类型、Zod 校验、fetch 客户端、TanStack Query hooks、MSW 模拟 | T01 | 直接 import |
| 新格式样例数据 `fixtures/samples/`：每个 GET 接口的返回模型至少一份（由老数据转换，并通过 JSON Schema 校验） | T01 | 测试、MSW 模拟、公开站样例构建都用 |
| API 路由骨架 `routes.gen.ts`：**全部接口都已挂上，未实现的返回 501**（正文写“未实现（任务 T14）”） | T02 | 在自己模块里实现后，路由自动接上 |
| D1 的**全部表**一次建好（`09` 第 3 节，表定义集中在 `services/api/src/db/schema/`） | T02 | 一般不需要再加迁移 |
| API 各模块目录与空文件（`routes.ts` `service.ts` `repo.ts` `mcp.ts`） | T02 | 填实现 |
| 会话鉴权的占位中间件（本地放行、线上一律 401） | T02 | T40 替换成真正的通行密钥登录 |
| Python 各包目录；7 个命令组；全部 `commands.py` 占位与 entry point 登记（`09` 第 7 节），未实现的命令退出码 2 并提示任务号 | T03 | 只改自己目录里的 `commands.py` |
| 外部数据源与交易日历的协议（在 `hub-core`） | T03 | 各适配器实现协议；领域逻辑只依赖协议 |
| 能力运行时、校验注册和评测框架；全部能力清单的 JSON Schema 校验（清单和提示词在文档阶段已写好） | T04 | 写评测用例，接入调用方 |
| 设计系统、三个前端应用的外壳、路由目录、导航；控制台的 Playwright 配置与 MSW 基础设置 | T05 | 在自己的路由目录里做页面，在 `e2e/<领域>/`、`src/mocks/<领域>/` 里加测试和模拟 |

### 5.1 契约变更

- T01 合并之后，契约的任何改动都走**单独的小 PR**：标题 `[C] <改了什么>`，只改 `contracts/` 和生成物，由编排者优先审、优先合并；其他人 rebase 后 `mise run gen`。
- 只允许**增量兼容**的改动（加可选字段、加接口）。破坏性改动需要 ADR 和 Kevin 同意。
- `mise run contracts:check`（oasdiff）会拦住未声明的破坏性改动。

## 6. 完成的定义（每个任务）

1. `accept` 里的每一项都做过，**真实输出**贴进 `docs/progress/<任务ID>.md`（命令、关键输出、截图路径、预览地址）；
2. 新代码有测试；计算和规则类代码必须有单元测试，能用 `fixtures/` 真实数据对照的就对照；
3. `mise run check` 和 `mise run test` 通过；
4. 没做完的、和文档不一致的，在进度记录里写“未完成 + 原因”，不含糊；
5. 需要 Kevin 决定的问题，写在进度记录的“待决定”一节，并在 PR 里 @ 出来。

进度记录模板：

```markdown
# T21 市场指标计算
状态：已完成 / 部分完成 / 阻塞
## 交付
## 验收（逐项：命令 → 结果）
## 与文档不一致或没做完的
## 待 Kevin 决定
```

## 7. 审查清单（审查者或编排者）

- [ ] 只改了自己 `owns` 里的路径
- [ ] 没有手改生成目录；契约没被悄悄改动
- [ ] 依赖方向符合 `01` 第 7 节（`mise run check:arch` 通过）
- [ ] 业务口径、阈值、文案和文档一致；文档没写的地方没有自己发明（发明了的要有 ADR 或在“待决定”里说明）
- [ ] 测试覆盖了验收里的每一项；进度记录里的输出是真实的
- [ ] 没有多余的防护性代码（哈希账本、审批流、签名、门禁之类）
- [ ] 没有把密钥写进代码、日志、测试数据

## 8. CI（每个 PR）

`ci.yml` 依次运行：

| 步骤 | 命令 |
|---|---|
| 安装 | `mise install && mise run setup` |
| 生成物一致 | `mise run gen` 后 `git diff --exit-code` |
| 契约兼容 | `mise run contracts:check` |
| 静态检查 | `mise run check`（Biome、tsc、ruff、pyright、依赖规则、路径所有权） |
| 测试 | `mise run test`（Vitest、Workers 测试环境、pytest；全部离线） |
| 端到端 | `mise run e2e`（Playwright；三个前端都用样例数据构建） |
| 评测 | 改到智能平面文件时：`hub evals run --changed`（需要 `OPENAI_API_KEY`） |
| 性能 | 改到 `apps/markets` 或 `apps/papers` 时：Lighthouse CI（样例数据构建） |

测试全部离线：外部 HTTP 用录制的响应（`fixtures/http/`），模型用假模型。

## 9. 关卡：Kevin 什么时候介入

| 关卡 | 时机 | Kevin 做什么 |
|---|---|---|
| **G0 开工准备** | 开工前 | 按 `07` 第 2 节准备账号和密钥 |
| **G1 看样子** | 设计系统和部署流水线就绪（T05、T06 合并） | 打开三个前端的预览地址（用样例数据），看整体风格对不对 |
| **G2 产品验收** | 每个产品的任务都合并后（T52 前半） | 按产品文档的验收表看预览地址、收测试邮件；注册自己的通行密钥；在 Claude 里连接 MCP |
| **G3 上线** | G2 通过后 | 在对话里确认：两个公开网址切到新系统 |
| **G4 停老系统** | 上线后连续 14 天运行正常 | 按 `06` 第 5 节停掉老任务 |

除这些关卡外，工作者遇到文档说不清的地方：**停下来，写进进度记录的“待决定”，告诉编排者**；编排者汇总后一次问 Kevin。不要自己发明口径、阈值或规则。

## 10. 统一命令（`mise run <任务>`）

所有人和 Agent 只用这些入口，不自己拼命令：

| 命令 | 作用 |
|---|---|
| `setup` | 安装全部依赖（pnpm、uv） |
| `gen` | 契约 → 两种语言的代码 |
| `contracts:check` | 与 main 比较，检查破坏性变更 |
| `check` | 全部静态检查（含 `check:arch` 依赖规则、`check:ownership` 路径所有权） |
| `test` | 全部单元与集成测试（离线） |
| `e2e` | Playwright 端到端 |
| `dev` | 本地 API（8787）+ 控制台（5173，默认用 MSW 模拟） |
| `dev:markets` / `dev:papers` | 公开站开发服务器（4321 / 4322；`DATA_SOURCE=fixtures` 或 `api`） |
| `storybook` | 组件开发（6006） |
| `db:migrate:local` / `db:migrate:remote` | D1 迁移（本地 / 线上） |
| `evals` | 等同 `uv run hub evals run` |
| `new:capability <id>` | 新能力的骨架（`10` 第 8 节） |
| `tasks:ready` | 列出可以开工的任务 |

## 11. 决策记录（ADR）

- 位置：`docs/adr/ADR-NNNN-<短标题>.md`，编号递增，只增不改；推翻旧决定时写新 ADR，并在旧的里注明“已被 ADR-NNNN 取代”。
- 什么时候写：选了文档里没写的技术或服务；改了文档里的规则；做了以后可能被问“为什么”的取舍。
- 格式：背景 / 决定 / 理由 / 后果（各 2–5 行）。
