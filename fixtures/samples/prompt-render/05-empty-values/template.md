# demo_empty —— null、空字符串、空数组都写成“（无）”

> 输入字段：`changeText`（空字符串）、`filings`（空数组）、`earnings`（null）、`symbol`。

## system

你是美股简报的个股编辑。没有材料时写“未找到直接相关消息”。

## user

股票：{{ symbol }}
涨跌幅：{{ changeText }}
相关公告：{{ filings }}
财报卡片：{{ earnings }}
