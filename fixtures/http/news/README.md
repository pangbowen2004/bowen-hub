# T10 HTTP 回放

`*-edge` 是明确合成的离线边界输入，只用于解析/故障测试，不是市场新闻或完整交易日录制。真实验收通过 `hub news sources --check --date YYYY-MM-DD --record fixtures/http/news/recorded-YYYY-MM-DD` 录制，manifest 逐源报告成功、失败、查询窗口与 RSS 历史覆盖限制。录制不保存请求头、key/token 查询参数或账户接口。当前完整真实交易日录制待根注入已批准环境执行，不伪造。
