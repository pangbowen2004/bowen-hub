# 论文问答执行环境

普通 Worker 的真实问答 CPU 为1861ms；原生流适配后为102ms，均超过10ms。完整长文本处理移入同一Worker服务导出的SQLite Durable Object：完整Request仍通过原有app鉴权，不向对象传已认证标记，不开启旁路；入口直接返回Response。普通接口继续原路径。

SQLite DO支持免费方案，单次默认CPU30秒，未购买付费计划。每次回答独立对象，无对象持久存储。真实签名会话、跨源拒绝、服务令牌私有写拒绝及缺会话拒绝由实际Miniflare对象测试覆盖（5项通过），API类型检查通过。

隔离云端（独立D1/R2/Worker）完整问答200，2927字/1991片，供应商DONE后仍读取业务终态，ok=true；入口stateless CPU1ms/wall8863ms。对象完成后追踪已到达：durableObject CPU89ms/wall120587ms/outcome=ok，在其独立30秒CPU预算内；wall包括对象的请求生命周期，不等同CPU或客户端25.98秒收齐时间。此前3000-token截断流保留为失败证据，输出预算未上调。20MiB有效PDF此前传输哈希一致，文本质量22例v5全部通过；这些独立证据按各自边界分别验收。安全日志：/tmp/bowen-t32-do-qa.log、/tmp/bowen-t32-do-tail.log。

平台修订的完整检查退出0（6.26秒），完整测试退出0（73.33秒）：Python532通过/1项既有联网PDF跳过。独立审查无P1/P2；共享引用页码修订已另行通过PR87合并。

契约临时入口同步正式Worker默认入口并reexport PaperQaRuntime，确保新增wrangler绑定可定位类且随机请求也覆盖入口分流；精确离线dispatch回放和其余外网拒绝不变。独立增量审查通过，T02实际Schemathesis141生成/141通过（1项schema拒绝警告保留），Biome/类型检查0。新的引用parser部署后真实对象CPU79ms/入口1ms、2680字完整终态通过；另实际无会话401/服务令牌写403/签名会话跨源403/合法会话不存在论文404均符合预期。

## 完整CI及生命周期修订

PR88 headf67e38d CI36948352143在契约探测PrivatePapers_createExplanation返回500，本地首次亦复现。独立临时端口实验20轮/60个请求：原DO早退未消费body稳定20次“响应后读取请求流”TypeError；cancel仍20次，逐块读完并丢弃0次，不缓存、不改原501。最小实验未复现500，不能将它的完整精确根因夸称已经确定。正式DO只在app返回后且body尚未消费时drain，正常JSON及流响应路径不动。6项真实Miniflare回归含12轮早退与后继请求通过6.56秒，API类型及Biome0，独立增量审查无P1/P2。

另同步spawnSync在Wrangler日志pipe+data排空时会阻塞父事件循环，本地完整fuzz实际挂起/health超时，已仅停止自有进程且保留日志。改asyncspawn/await，所有参数、检查、认证组、fixture不变。正式完整探测31已实现/50占位，service483/session80共563请求通过，日志/tmp/bowen-do-drain-full-fuzz.log。

修订后完整check退出0/4.84秒；完整test的TS全部通过，但Python531通过/1失败/1既有跳过：T21可选moneyflow缺失同输入的Polars浮点金额汇总出现.002197CNY波动，相对1.026e-15超过既有1e-15容差。未放宽容差，根另建独立金额汇总修复分支处理；该次完整test不宣称全过。日志/tmp/bowen-do-drain-full-test.log。正式新HEAD CI与金额修复需完成后才合并。
