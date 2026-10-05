# 每日运行（2026-10-05）
- 已按 Kevin 的 A 方案把 bowen-hub 改公开；完整 Git 对象扫描未发现本机密钥/会话/私钥。
- bowen-hub-data 仍私有；业务 API、R2 和后台鉴权保持原配置，正式站未切换。
- 已恢复 market-eod、news-morning、news-premarket、news-weekly、data-export；evals-weekly 仍暂停。
- 全部使用标准 ubuntu-24.04 runner；公开后运行分钟免费，历史账单不因此消除。
- 本月实际账单未读到：CLI 缺 user 账单权限，github.com 浏览器访问被保存的拒绝设置拦截；未用旧截图冒充余额。
- 收盘任务已有完整日期跳过逻辑；10 月 8 日实际运行待观察，尚不能计为成功。
- 已把原暂停续跑改为每日 23:15（新加坡）检查；失败/漏跑才通知，正常时保持安静。
- 已修复中文筛选/零中文失败通知；周一早报同一次运行发送周报，周六独立定时取消；尚待合并。
- 本机 gen、contracts:check、check、test 通过（Python901通过/1既定跳过）；最终配置定向149通过，无真实模型重跑。
