# papers.qa真实原文评测

22个不同任务用例使用指定公开arXiv 2505.07078 PDF实际抽取的全部15页，页文本带行号，原始PDF由T30验收授权下载，T32只读复用。输入guide/claims来自生成迁移样例，原文事实以PDF为准。覆盖摘要偏差、方法与选股设置、表格实验边界、指标公式、状态分析、负结果、开源可复现性、费用、缺答案、判断/推断及非法页码。

`hub evals run --capability papers.qa`由根注入已授权网关环境实际执行，阈值保留schema_valid/pages_in_range=1、must_include≥0.8、judge_faithful≥0.9。用例和期望页码不等于真实模型达标；缺真实执行结果保持未完成。没有生成假的主观评分responses，框架当前`--offline`会明确拒绝无回放或主观假评审；TS假模型流测试独立覆盖确定性协议，不替代质量验收。
