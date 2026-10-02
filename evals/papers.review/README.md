# papers.review 真实原文与已知错误

10条材料使用三篇真实原文：FINSABER四例、Attention三例、OpenMEVA三例。待审稿的单项/双项错误明确注入身份、零效应误读、百分数、负结果方向、未来词掩码、BLEU误作准确率、扰动方向、评价/生成混淆；最后一例刻意缺全文，期待escalate。保留固定decision标签和核心发现关键词，不提供审核答案。

金融和OpenMEVA待审稿来自只读公开迁移样例，未冒称通过新稿校验；Attention待审稿是围绕真实原文人工构造的有错材料，不假称真实模型成稿。pageImages为空时不虚报图像核验。当前十例专注已知错误/材料边界，普通pass与P2业务路径由离线Runtime测试覆盖，未夸称此数据集覆盖所有审核分布。

不生成假的responses；真实评测由根串行运行。schema_valid=1、labels_match≥.8、must_include≥.7及模型/预算保持原清单。失败不能改标签或阈值凑绿。

2026-10-02 v3 纠错：独立审查及原始页图确认FINSABER p.8熊市图文方向、Attention p.8英法41.8/41.0互相矛盾，依既定rubric将6项期望由revise更正escalate。输入摘要逐项与v2冻结值相同，阈值/预算不变；v2失败和非连续引文错误保留，重算标签不冒充新的模型评测。
