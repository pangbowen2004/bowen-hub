# 论文数字校验修正

真实作者评测首轮仅 20% 通过严格校验。逐主张核对发现 ConvS2S、F1、newstest2013、tensor2tensor URL，以及 Table 2/3 被误当作测量数量；另有真实样本数遗漏、引用行错误和来源地址为空，不能用此次修正豁免。

校验器统一抽取 metric 与 quantities.text 中的测量数字，屏蔽明确 ASCII 标识符、URL、Table/Figure 引用编号。保留中文相邻数字、4/5 样本数、2-year/1-year、科学计数、小数、千位数和负数的严格覆盖要求。sourceText 仍只能在所选精确行范围出现，不能在同页其他行寻找。

新增17回归，领域文件 55 passed、1 skipped（真实PDF另做本地验收）。完整检查已通过；完整测试及独立审查结果待补。未改变冻结评测用例、阈值或模型预算；仍须修提示并重跑真实作者评测，不把校验器单测当作模型达标。

最终新增22回归，领域 test_domain 60 passed/1skip；独立全领域61 passed/1skip，无P1/P2。修正并加入URL紧邻中文、Table编号紧邻中文、Selected4/Random5回归后，完整 `mise run check` 通过，`mise run test` Python 566 passed/1skip、TS786通过，78.23秒。日志 `/tmp/bowen-paper-numeric-{check2,test2,owned2}.log` 与独审 `/tmp/bowen-numeric-review-all-final.log`。原作者输出按新校验器重算仅5/10通过；保留真实失败并继续提示修复和真实v3重测。
