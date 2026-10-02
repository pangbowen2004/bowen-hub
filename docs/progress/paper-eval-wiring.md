# 论文评测与第5波命令接线

论文审核的输出契约为单个 decision，原 labels_match 只处理分类数组，导致正确审核也得零分。现仅对 PaperReviewOutput 按 decision 比较；其余分类数组保持原行为，能力清单与阈值不变。

CheckRegistry 提供显式 load_plugins，评测 run/compare 宿主从已安装 hub.ai_checks entry point 加载领域校验。智能包没有反向导入论文领域，默认注册表不变；具体 paper_draft 入口随 T31 的实现集成。插件按名称排序，重复注册和非可调用入口明确失败。

第5波 T13/T23/T31 命令表只在统一帮助发现测试中转为已实现入口检查；真实成功、失败及业务行为仍由各任务领域测试验收。其他未实现任务仍断言占位退出2。

验证：新增三种审核结论的匹配/不匹配与缺少期望、插件显式注册/独立上下文/重复注册/非可调用、真实离线评测 CLI 加载插件测试。首次测试误用独立来源检查字段导致契约失败，修正测试输入后原实现稳定失败（审核得0，注册入口不存在）；没有改产品契约。

- AI 与 CLI：95通过；/tmp/bowen-paper-eval-wiring-final-tests2.log。
- mise run check：退出0，strict类型无错误；首次ruff和测试匿名函数类型错误均已修正，/tmp/bowen-paper-eval-wiring-final-check2.log。
- mise run test：退出0，Python 544通过、1项既定真实公开PDF联网测试跳过；/tmp/bowen-paper-eval-wiring-full-test.log。末次类型注解修改后重跑上述95项通过。
- 未把本接线的离线结果算作 T31 产品真实 author/review 评测达标；该任务另行验收。

独立审查：新闻工作者只读检查上述全部增量，无 P1/P2；没有复跑共享测试或把离线结果当产品真实验收。
