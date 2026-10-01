# 论文样例来源与迁移口径

两份Paper/PaperPrivate直接转换fixtures/papers对应目录，Markdown正文/R0/R1/QuantML原样保留。ACL私有，arxiv公开；公开目录、图谱、搜索仅包含arxiv，私人目录和图谱包含两篇。arxiv spaces=quant-finance/agent-systems，ACL=general-research，空间配置来自config/paper_spaces.yaml。公开图包含配置空间节点（空空间paperCount=0），不带私有论文和私人卡。

ACL证据来自evidence-audit，保留原文片段并标legacyAnchors；arxiv证据来自R1关键结果表，不伪造行号/摘录，readerCheck=null、articleBlocks=[]、quantities=[]。arxiv updatedAt取旧元数据日期2026-08-18；ACL没有更新时间，按裁定固定迁移日2026-10-01。旧论文没有generatedBy，不伪造。ACL code.source_located不等于网络核验，映射unverified，原状态保留私人补充卡。

未映射且未批准丢弃的内容按原字段和YAML结构保存为“迁移补充字段”卡；包括格式/版本、旧状态、code_entries多入口、active_recall的concept_ids/difficulty、引用导航状态等。列表中已映射项留空对象保留原位置，避免改变未知字段所属项。下表列实际丢弃路径（仅doc06明确批准）：

## acl-2021.acl-long.500

- `10-阅读导航包.yml.reading_route.passes`
- `evidence-audit.json.source_sha256`
- `evidence-audit.json.claims.0.excerpt_scope`
- `evidence-audit.json.claims.1.excerpt_scope`
- `evidence-audit.json.claims.2.excerpt_scope`
- `evidence-audit.json.claims.3.excerpt_scope`
- `evidence-audit.json.claims.4.excerpt_scope`
- `evidence-audit.json.claims.5.excerpt_scope`
- `evidence-audit.json.claims.6.excerpt_scope`
- `evidence-audit.json.article_blocks.0.sha256`
- `evidence-audit.json.article_blocks.1.sha256`
- `evidence-audit.json.article_blocks.2.sha256`
- `evidence-audit.json.article_blocks.3.sha256`
- `evidence-audit.json.article_blocks.4.sha256`
- `evidence-audit.json.article_blocks.5.sha256`
- `evidence-audit.json.article_blocks.6.sha256`
- `evidence-audit.json.article_blocks.7.sha256`
- `evidence-audit.json.article_blocks.8.sha256`
- `evidence-audit.json.article_blocks.9.sha256`
- `evidence-audit.json.correction_provenance`

补充卡来源：资源与出处.yml、08-理解学习包.yml、10-阅读导航包.yml、00-元数据.yml、11-读者导读.yml、evidence-audit.json

## arxiv-2505.07078

- `资源与出处.yml.quantml_articles.0.archive_source`
- `资源与出处.yml.retrieved_at`
- `资源与出处.yml.notes`
- `08-理解学习包.yml.mechanism_steps.0.number`
- `08-理解学习包.yml.mechanism_steps.1.number`
- `08-理解学习包.yml.mechanism_steps.2.number`
- `08-理解学习包.yml.mechanism_steps.3.number`
- `08-理解学习包.yml.mechanism_steps.4.number`
- `08-理解学习包.yml.key_quotes`
- `10-阅读导航包.yml.reading_route.passes`
- `10-阅读导航包.yml.coverage.dimensions.0.id`
- `10-阅读导航包.yml.coverage.dimensions.1.id`
- `10-阅读导航包.yml.coverage.dimensions.2.id`
- `10-阅读导航包.yml.coverage.dimensions.3.id`
- `10-阅读导航包.yml.coverage.dimensions.4.id`
- `10-阅读导航包.yml.coverage.dimensions.5.id`
- `10-阅读导航包.yml.coverage.dimensions.6.id`
- `10-阅读导航包.yml.export`
- `00-元数据.yml.publication_status`
- `00-元数据.yml.retrieved_at`
- `00-元数据.yml.materials`
- `00-元数据.yml.reading.recommended_depth`
- `00-元数据.yml.reading.project_relevance`
- `00-元数据.yml.reading.strategic_role`
- `00-元数据.yml.integrity`
- `11-读者导读.yml.section_titles`
- `11-读者导读.yml.project_connection.harness_connection`
- `11-读者导读.yml.source_figures`
- `11-读者导读.yml.comprehension_check`

补充卡来源：07-看板状态.yml、资源与出处.yml、08-理解学习包.yml、10-阅读导航包.yml、00-元数据.yml、11-读者导读.yml

Review.synthetic及两份Upload为离线手写结构演示，不代表实际审核、入库或模型执行；fixture/fake出处明确是假模型。审核原文片段引用ACL已有账本，用于结构解析。每个JSON GET均用这些可审查样例，PDF/PNG/文本流接口回落生成处理器。

解释卡POST可选generatedBy应由T34携带原QA结果出处，T32原样存储；API不凭空盖模型信息。老解释卡未知出处允许缺省。revise仅触发任务，返回204，不制造新Upload。
