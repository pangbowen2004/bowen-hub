# T11 手写离线样例

`morning-input.json`、`premarket-input.json`、`weekly-input.json` 是明确标注 synthetic / 合成的固定输入，网址均为 example.test，数字、人物和事件不代表真实金融事实。早报输入覆盖实际配置的 3% / 2% 边界、8-K 原文、Form 4、宏观日历、国际科技；盘前与周报分别提供独立的固定时钟和新消息。

`morning.json`、`premarket.json`、`weekly.json` 是经逐项核对的完整 Edition 预期：早报9个栏目，盘前2个栏目，周报6个栏目。盘前/周报复用固定早报作为已存历史。快照不包含AI产出的摘要、期数或财务数字；它们留空等待 T12。

测试不会重写快照。变更规则时需人工审查输入及栏目差异，不能用自动更新掩盖回归。只读旧归档的单独用例仅检查既有标题的分类与URL规范化，不把旧AI摘要当作新事实。
