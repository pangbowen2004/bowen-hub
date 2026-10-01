# demo_strings —— 字符串原样放入

> 输入字段：`symbol`、`name`、`note`、`snippet`。同一个占位符可以出现多次，system 里也可以有占位符。

## system

你在为 {{ symbol }} 写今天的摘要。

## user

股票：{{ symbol }} {{ name }}
备注：{{ note }}
原文片段：
{{ snippet }}
