# T10 来源接线

适配器实现 `hub_core.protocols` 的同步协议。调用方注入 `HttpClient`，密钥仅从 `Settings` 的 `SecretStr` 解包到适配器请求头/参数；适配器不会读 dotenv、访问账户或交易接口、写 API、调用模型。每次采集后读取 `source.health`（生成的 `NewsSourceHealth`）；上游请求、解析失败明确抛异常，编排层捕获单源失败后继续其它源。

- `RssSource(http, SourceConfig)`：配置来源 ID、语言、付费墙、最大条数和停用状态；HTTP 超时在注入的 HttpClient 上按来源配置设置。发布时间缺失的条目不以抓取时间补造；股票关联留给 T11。
- `AlpacaSource(http, key, secret, adjustment=..., index_symbols=..., source_id=...)`：新闻含美股与加密，新闻代码 BTCUSD/XRPUSD 归 BTC/XRP；IEX 股票日线按美东交易日，加密日线按 UTC。构造时必须显式给复权选项（官方 raw/split/dividend/spin-off/all）；check 使用 raw 只探测来源，不裁定版次口径。
- `TiingoSource(http, key, price_field=..., index_symbols=...)`：字段明确选 close 或 adjClose；不拿股票接口代替加密日线。`metadata(symbol)` 仅读供应商代码/公司事实，供根核实身份，不能根据 HTTP 200 自动删除 verify。
- `SecSource(http, user_agent, forms=...)`：表单名单来自 newsroom.filings。company_tickers 对照 CIK；所有请求（含重试）满足每秒不超过 10 次。Form 4 保留 P/S/M/F 等所有交易代码，展示筛选与卖出金额阈值由 T11/T13 处理。交易序号跨非衍生/衍生表沿 XML 顺序，缺价格保留 null；原始股数缺失时明确失败，不猜数。`fetch_text(url)` 提供公告/附件 HTML 转出的原文供能力输入。
- `FredSource(http, key, releases, importance=...)`：release 名称必须与官方返回精确一致，不写死 ID；按配置美东时刻换 UTC，日历日期保持官方发布日。重要性须调用方显式给定，文档口径尚待决定。
- `FinnhubSource(http, key, importance=...)`：日期与 bmo/amc 原样保留，未知时间 at/timing 为 null；不从日期推断盘前/盘后，不补精确发布时间。
- `TreasurySource.fetch_yield(session)` / `CboeSource.fetch_vix(session)`：只取精确日期，缺日返回 None；收益率保持来源的百分数单位，VIX 保持指数值。格式损坏会失败而不是冒充“没有数据”。

`fetch_bars` / `fetch_snapshot` 的变化率是小数；没有前一有效交易日/UTC 日的观测则为空，不跨缺日比较。快照只含存在的变化率，两个可选序列由编排层按配置补入，适配器不以前值冒充当天。

`hub news sources --check` 和 `hub providers check` 只诊断，不写 API。显式 `--date` 固定美东完整一天的窗口，`--record` 保存公共响应与脱敏请求匹配字段；必须由根在审查后注入已批准环境执行。RSS 只能拿当时提供的前 N 条，不能声称历史全日覆盖。`ReplayTransport` 严格匹配录制请求，未录窗口或页会失败，T13 回放须据 manifest 选择真实覆盖窗口，缺来源明确降级。

T20 聚合入口约定 `hub_providers.tushare.check_sources(settings)` 返回健康序列；尚未接入时 CLI 明确提示 T20 未完成。T10/T20 不互改命令登记。
