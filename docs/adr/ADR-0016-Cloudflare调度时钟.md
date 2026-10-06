# ADR-0016：现有Worker承担时钟，Actions承担计算

## 背景
2026-10-06 Kevin明确授权搬迁时钟。GitHub schedule实际入队迟到数小时，盘前过窗而跳过，早报11:06才发送。

## 决定
现有bowen-hub-api增加10分钟Cron，依据交易日历与D1产出派发既有workflow_dispatch；GitHub原定时作为备用。业务重计算和AI仍在Python，Worker只查存储、排程、通知和记录。使用现有SMTP TLS账户，不增加服务或付费。

## 后果
Github令牌需要单仓Actions读写，沿用Contents权限。早报/市场截止缺产出明确通知，不强制覆盖；14天观察存现有D1 documents。交易日历由Python按XNYS/TuShare生成，有明确覆盖期，过期告警而非猜测。
