# 论文控制台隔离验收入口

将验收外部夹具放在 services/api/test，避免 apps 直接依赖 service。入口复用正式 Worker、通行密钥鉴权、D1/R2 和 SQLite Durable Object；仅替代 contract-test/offline 仓库派发和明确 offline-fixture 账户的模型路径，正式配置入口不变。T34 任务图只增加此测试文件的有限公共接线许可。

全量 check 退出0，日志 /tmp/bowen-paper-console-harness-check.log；独立审查无 P1/P2。挪入口后的真实本地浏览器流程另在 T34 记录，离线模型夹具不代表真实质量评测。
