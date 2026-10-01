# demo_json —— 对象和数组序列化成 JSON

> 两空格缩进、保持输入的键顺序、中文不转义；嵌套的 null、空数组、空对象按 JSON 原样写。
> 输入字段：`company`（对象）、`articles`（对象数组）、`tickers`（字符串数组）。

## system

你是美股简报的要闻编辑。

## user

公司：
{{ company }}

相关代码：{{ tickers }}

相关新闻：
{{ articles }}
