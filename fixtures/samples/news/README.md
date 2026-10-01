# 新闻样例来源

`Edition.legacy-2026-09-29` 和 `Article.archive-top5` 由 `fixtures/news/archive-sample.jsonl` 最后一行转换，综述、摘要、理由原样保留；链接按 docs/02 规范化，来源名称按新配置映射，未匹配者为 legacy。老归档 timestamp 没有时区，且缺覆盖窗口、模型出处、邮件时间和用量，均写 null，不据此编造时间。

`Edition.morning-2026-09-30` 按新格式手写，覆盖全部早报栏目；国际与科技内容来自上述归档（与 daily_brief 同日），其出处未知为 null。所有 example.com 链接、SEC 编号、交易数字、财报数字、快照、日程、健康状态、反馈及 fixture/fake 模型都是离线演示值，不代表事实。其余 synthetic 文件从这份早报拆出。

导语能力的 facts 为 `{ id, text }`，text 是已经格式化的事实文本；遵循 docs/10 §5.1，涨跌幅和数字保留显示字符串口径，避免模型把浮点收益率直接当作百分数。

国际栏目的 top5/briefs 分别保存条目 id 和可恢复的规则分；旧归档未记录规则分，因此不补写该字段。晨报中的规则分仅为合成示例。个股摘要输入中的财报必须携带稳定 id，输出来源可引用它。
