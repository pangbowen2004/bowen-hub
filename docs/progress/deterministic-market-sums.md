# 市场金额聚合确定性修复

状态：独立审查发现的方向金额分位P2已修复，复审通过；待PR CI与合并。工作区 `bowen-hub-market-sums`，分支 `orchestrator/deterministic-market-sums`，基线 `2c65c1a`。

## 根因和范围

原 `aggregate.overview` 用 Polars `group_by().agg(amountCny.sum())` 得到每日总额；`value(..., "sum")` 的全市场、行业、方向、ETF等金额也直接浮点求和。浮点加法不满足结合律，分组/连接形成的遍历布局及归约顺序变化会改变低位。同一日期、相同金额多重集合不应因可选数据端点缺失而改变，但旧路径没有保证此性质。

Polars 1.44.2、10线程，真实2026-08-27原始录制：固定布局重复100次本机同值 `.6682`；仅shuffle行顺序则得到 `2140962320554.6704`、`.6702`、`.67` 等尾数，复现根失败日志中的 `.6682` 与 `.6704`。这证明行布局/求和顺序敏感，不声称同一固定布局每次都随机失败。金额原样乘1000换元；没有筛改样本或历史来源。

修复仅在 `compute/aggregate.py`：金额统一去null、固定数值排序后 `math.fsum`，历史按日期聚合原值列表后使用同一函数。补偿求和保留小金额和净资金抵消低位，固定排序保证相同数值集合固定累加顺序。不量化金额、不设置epsilon、不改变业务阈值或单位；保留旧求和忽略null、空集合/全null返回0的语义（业务可选块缺失仍原样null）。均值、评分、历史MA和M1容差不改。

独立用60位Decimal对已转换的真实IEEE浮点金额精确累加核对，最近可表示float为 `2140962320554.67`。原始来源和对照期望文件完全未改。

## 真实验收

- `mise run setup`：退出0，无新增依赖或锁改动。
- 新增 `test_sums.py` 在旧实现运行：退出1，3失败/1通过；分别锁定大金额吞小金额、正负抵消和真实前日聚合尾数。日志 `/tmp/bowen-market-sums-before.log`。
- 修正后同测试：退出0，4通过，1.77秒；六种真实录制行排列、重复计算逐位一致，Decimal独立核对，null/空集合语义不变。日志 `/tmp/bowen-market-sums-regression.log`。
- 原8类可选端点缺失回归保留 `rel=1e-15, abs=1e-12`，另新增5个金额/派生字段逐位相等断言，未放宽旧断言。
- `mise run test:py -- packages/hub-market/tests`：退出0，85通过，57.55秒；真实录制全指标块、五日演化及61账本融合继续通过。日志 `/tmp/bowen-market-sums-domain.log`。
- `mise run check`：退出0；新增测试最后补Decimal独立核对后再运行 `mise run check:pyright`，退出0、0错误；最终 `mise run check:ruff` 与 `git diff --check` 均退出0。日志 `/tmp/bowen-market-sums-check.log`、`/tmp/bowen-market-sums-pyright-final.log`。
- `mise run test:py`：退出0，536通过、1既定真实PDF联网验收跳过、5已有警告，80.26秒。日志 `/tmp/bowen-market-sums-full-python.log`。
- `mise run test:ts`：退出0，12任务成功、735测试通过。日志 `/tmp/bowen-market-sums-full-ts.log`。
- `mise exec -- uv run --project py --no-sync hub market compare 2026-08-28`：退出1，严格184/218通过、34失败；保留docs07§4.1已记录的公式/来源差异，不声称M1严格全过。完整结果 `/tmp/bowen-market-sums-m1.json`。
- 原始旧求和与修正后六种排列、Decimal独立核对证据：`/tmp/bowen-market-sums-order-evidence.log`。

首次把 `check:pyright` 写成 `check:ruff` 的位置参数导致命令退出2（不是源码失败），已改为完整 `mise run check` 和独立 `check:pyright` 实际通过。没有运行外部供应商请求、读取秘密、修改T32或生成物。CI和独立审查由根后续执行。

## 独立审查补齐

审查发现 directions 当日金额已走统一求和，而历史20日仍直接Polars.sum，相同金额低位差会改变分位。现历史方向金额也按同一函数聚合；真实0827的5547金额复制20日，修前严格分位回归得到0.55（预期1.0），修后六种排列均1.0。未改金额来源、比较符号或容差。

追加领域测试86通过（37.36秒），完整check退出0；独立复审5项通过（2.98秒），无新增P1/P2，diffcheck通过。日志 `/tmp/bowen-market-direction-before.log`、`/tmp/bowen-market-direction-fixed.log`、`/tmp/bowen-market-direction-check-final.log`。此前全量Python/TS结果针对第一版修复；方向增量由以上领域测试和检查验证，最终完整CI另行执行。
