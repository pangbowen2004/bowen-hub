# 每日运行（2026-10-05）
- bowen-hub公开、数据仓库私有；标准公开ubuntu runner后续免费，历史账单不消除。
- CLI实际复核market-eod、news-morning、news-premarket、news-weekly、data-export、papers-ingest均active。
- 周报周一与早报同运行；独立news-weekly仅手动入口，无周六定时；evals-weekly暂停。
- 本月实际账单仍未读到：CLI缺账单权限、浏览器保存的拒绝设置；不沿用旧余额。
- 每日23:15新加坡检查是Codex本机ACTIVE自动任务，需要Mac唤醒且应用运行，合盖可能漏检。
- 已更新检查：核对启用状态，意外停用则重新启用、复核并通知；真实失败/漏跑通知，正常静默。
- 不依赖Mac的建议：Cloudflare Cron调用GitHub核对状态/结果、重新启用并邮件通知；仅提案，未部署。
- PR123已合并48a9fff，CI37293032531通过；10月8日真实收盘、10月12日周报待观察。
