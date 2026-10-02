# papers.author 真实原文评测材料

10个不同任务使用三篇完整真实原文：FINSABER arXiv2505.07078 v6四例、Attention Is All You Need arXiv1706.03762 v7三例、OpenMEVA ACL2021.acl-long.500三例。分别覆盖金融评测框架、注意力序列转换及故事评价指标机制，不把十例冒称十篇论文。页文本复用T30抽取器，按真实物理页/页内行编号，页数分别15/15/14；PDF由根从官方来源授权下载。

author不输入库内正确导读；各例只提供原文、书目信息（有时为空）和不同阅读/修订要求。覆盖输入到输出解释、统计不确定性、BLEU与比较条件、掩码缩放、扰动方向和跨分布可靠性，不用伪造judge分数。根执行`hub evals run --capability papers.author`后才判断真实质量。保留门槛schema_valid=1、paper_draft≥.9、judge_explains≥.8和既定模型/预算。
