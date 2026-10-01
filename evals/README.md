# AI 能力评测

运行入口是 `hub_ai/evals/runner.py`，用 pydantic-evals 的 Dataset/Evaluator 执行。产品用例由对应领域任务提供，框架不会生成假产品案例。

每个能力目录包含 `cases.yaml`（数组：id/input/expect/tags），可选运行上下文 totalPages 必须来自真实 PDF 元数据。expect 支持 must_include/must_exclude/reference/labels；judge_* 同名 Markdown 提供评分标准，经 balanced 档网关打分。评测统计未经后处理的首次输出，删改后可用不等于一次通过。

`mise run evals -- --changed` 只选择清单、提示词、能力评测目录、llm 配置实际变化的能力；框架或清单 schema 变化且未涉及产品能力时报告0。选中但缺用例/期望/评分器时明确失败。`--weekly --write-api` 写真实每周结果；PR 默认只输出 Markdown。`hub evals compare --candidate ...` 同时输出基线和候选分数与费用，候选低于阈值或基线即失败；月度成本还需按调用量人工判断。

离线使用显式 `--offline`，目录里的 `responses.yaml` 为用例 id → `{output, usage}`，只能是录制或测试假响应；缺失即失败，不得说成真实联网。T04 自测专用能力在 `py/packages/hub-ai/tests/fixtures`，不替代产品评测集。

`hub evals harvest --output ...` 读取 API 反馈、期次持久化证据，生成待人工补齐的草稿。当前接口无法按历史文章 id 获取完整事实包，缺字段标 unresolved；未找到不能断言来源不存在。只有补齐 input/expect 并通过契约校验的草稿才可入库。
