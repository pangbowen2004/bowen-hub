# 市场新格式样例

这些文件用于契约校验、MSW 和页面展示；原始 `fixtures/market/` 全部只读。旧日期样例不代表新计算流水线已经复算通过。

## 真实数据转换

- `MarketDay.2026-08-27/28.json`：同日 `close-analysis-*`，保留市场数字、温度、情绪九维、风格组、涨停生态、行业、主题、16方向、ETF组、分层、个股榜及上证技术位。`sentimentProfile` → `sentiment`、`marketStyle.distribution` → `style.groups`、`temperature.components` → `temperature.parts`（breadth/trend/limitEcology/liquidity/positiveIndices）、`directionMatrix.directions` → `directions.items`、`etfRotation.groups` → `etfGroups.groups`；行业仅保留完整 ranking 数组。删去哈希、旧准入等级、硬编码外部价位和 `relativeVsCsi300`。
- `MarketDaySummary.2026-08-27/28.json`：由上述市场日、摘要标题、前3行业和方向、全部方向相对收益摘取。
- 6份 `IndexBar.<指数代码>.json`：`index-daily-2026-08-28.json` 的每个 series 原始268根日线。`tradeDate` → `date`、已为小数的 `pctChange` → `return1d`，`amount` 千元 ×1000 → `amountCny`。样例文件按旧日线顺序；GET模拟按日期倒序且默认最多250条。
- `Hypothesis.ledger.json`：61条完整账本；五类rule的thresholds、baseline与settlement.actual逐项保留；11条手写假设 `rule=null`；覆盖PENDING、CONFIRMED、NOT_CONFIRMED、INCONCLUSIVE。`DATA_PENDING` → PENDING，`SOURCE_CONFIRMED` → CONFIRMED且说明加“来源确认：”；generation.engineVersion按存在与否保留，mode统一realtime。删除完整性、证据ID和快照哈希。
- `MarketEvent.calendar.json`：79条事件；状态按docs06转换，删discovery；原数据缺sourceUrl时保留null，不能虚构链接。
- `MarketReference.config.json`：直接取 `market_metrics/directions/etf_groups/themes/indices/sources.yaml`；保留指标id、label、group、可选boundary；方向sourceName、mappingNote；可选technical标记；数据源optional、limitations与disclaimer。
- `WeeklyReport/WeeklySummary.2026-08-28.json`：旧周报转换为新6节结构，23条已结算=7确认+4未确认+12证据不足；Research Error仅4条NOT_CONFIRMED，12条INCONCLUSIVE单列。WeeklyReport含全部WeeklySummary同名字段，Markdown由相同结构生成。持续居前、反复次数及末日弱方向沿用旧周报的完整五日统计；未用演化样例的手写行重新推算。

## 按公式推导的值

- 28日 `turnoverPrevCny` 取27日旧市场同口径成交额，`turnoverChange=当日/前日−1`。
- 两天 `turnoverMedian20Cny` 由老情绪turnover分项的明确输入倍数推出：当日成交额 / 输入倍数（docs03中该分项输入是成交额/20日中位数）。
- `marketNetRatePct/100` → `marketNetRate`；旧换手率百分数 `/100` → market.medianTurnoverRate、segments.boards.turnoverRateMedian，契约中均为0–1小数。
- 摘要标题、标签、text/support/counterEvidence、3项风险与4项次日验证，依docs03§4.16将当天字段代入文字模板；不是AI生成，不含generatedBy。
- previousDate：27日从旧limitEcology.previousSessionDate取得26日，28日为27日；schemaVersion=1。
- validation从全部账本筛选生成日、结算日与规则类型，分母仅已结算条数；账本覆盖8月7日至28日，全部处于样例日的最近20交易日窗口内。

## 手写与资料不足（不能作为精确复算对照）

- **手写**：27日turnoverPrevCny=1.9万亿元（没有26日全市场完整快照）；27日turnoverChange及引用它的摘要文字由此推导。温度51.9/77.3等真实旧结果保留，未用手写历史重算旧温度。
- **资料不足**：旧方向moneyflowCoverage用的是coveredCount分母，文化传媒为197/196≈1.0051。旧样例没有独立明确的资金流成员股数；不能仅把比率乘回coveredCount便当作核实了股数。全部方向moneyflowCoverage置null，保留真实moneyflowProxyCny；新公式仅是“有资金流数据成员数/memberCount”。因此两天dataStatus.complete=false，missing含moneyflow，摘要complete=false。
- **手写**：演化始终保留最近5个交易日；27日窗口为21/24/25/26/27日，28日为24/25/26/27/28日。缺完整快照的行复制当日市场展示数字，并改日期、标题；24日明确存在于旧周报from的advanceShare/aboveMa20Share/medianReturn1d/turnoverCny/涨跌停/封板率/最高板使用真实旧周报值。缺方向行topDirections与directionsRelative为null，不补造方向。
- 演化edgeChanges、五日中位/区间、行业出现次数、传导与signals由上面混合展示行推导，故相关历史/窗口统计都属于**手写展示样例**，不做精确断言。方向出现次数仅统计有资料的天，coverage分别1/5和2/5；不跨缺口比较。当天缺方向时transmission.direction和signals.direction可为null（领域测试覆盖）。
- 周报Markdown是从转换后的真实周报数据按新口径生成的文字版；没有复制旧版“16条Research Error”的错误统计。
