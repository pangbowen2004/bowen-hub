# 评测执行结果安全诊断

模型传输或契约失败由Runtime返回失败Result而不是抛给pydantic-evals异常列表，旧CI只显示聚合零分，难以定位失败用例。评测结束后现仅对okfalse结果记录用例编号、stage=runtime与固定原因白名单；用例编号过滤并截断，未知原因泛化，不记录输入、成稿或供应商正文。

这不改变数据集、评分、门槛、重试、用量或EvalResult结构。失败仍按原机制降低得分并触发既有质量门禁。新增两个用例的传输失败集成回归，修前因缺日志而失败，修后完整AI52项及完整check通过；独立复审52项通过、无P1/P2，未运行真实模型。最终固定stage命名为runtime以涵盖模型调用前的契约失败。

日志 /tmp/bowen-eval-diagnostics-red.log、/tmp/bowen-eval-diagnostics-tests.log、/tmp/bowen-eval-diagnostics-check.log。CI后续执行；不会据此回写旧CI不存在的逐例证据。
