# 论文问答执行环境

普通 Worker 的真实问答 CPU 为1861ms；原生流适配后为102ms，均超过10ms。完整长文本处理移入同一Worker服务导出的SQLite Durable Object：完整Request仍通过原有app鉴权，不向对象传已认证标记，不开启旁路；入口直接返回Response。普通接口继续原路径。

SQLite DO支持免费方案，单次默认CPU30秒，未购买付费计划。每次回答独立对象，无对象持久存储。真实签名会话、跨源拒绝、服务令牌私有写拒绝及缺会话拒绝由实际Miniflare对象测试覆盖（5项通过），API类型检查通过。

隔离云端（独立D1/R2/Worker）完整问答200，2927字/1991片，供应商DONE后仍读取业务终态，ok=true；入口stateless CPU1ms/wall8863ms。对象完成后追踪已到达：durableObject CPU89ms/wall120587ms/outcome=ok，在其独立30秒CPU预算内；wall包括对象的请求生命周期，不等同CPU或客户端25.98秒收齐时间。此前3000-token截断流保留为失败证据，输出预算未上调。20MiB有效PDF此前传输哈希一致，文本质量22例v5全部通过；这些独立证据按各自边界分别验收。安全日志：/tmp/bowen-t32-do-qa.log、/tmp/bowen-t32-do-tail.log。

平台修订的完整检查退出0（6.26秒），完整测试退出0（73.33秒）：Python532通过/1项既有联网PDF跳过。独立审查无P1/P2；共享引用页码修订已另行通过PR87合并。

契约临时入口同步正式Worker默认入口并reexport PaperQaRuntime，确保新增wrangler绑定可定位类且随机请求也覆盖入口分流；精确离线dispatch回放和其余外网拒绝不变。独立增量审查通过，T02实际Schemathesis141生成/141通过（1项schema拒绝警告保留），Biome/类型检查0。新的引用parser部署后真实对象CPU79ms/入口1ms、2680字完整终态通过；另实际无会话401/服务令牌写403/签名会话跨源403/合法会话不存在论文404均符合预期。
