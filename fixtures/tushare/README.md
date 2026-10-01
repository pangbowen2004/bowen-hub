# T20 TuShare原始数据

本目录仅存T20根审查后注入环境真实录制的公开行情/成员数据；两日全量已由根于2026-10-02注入凭据真实录制成功，每日170张原始表、15接口全部可访问；合计Parquet34,863,538字节。测试中的合成边界数据只在pytest临时目录，不冒充交易日原始记录。

录制命令：`mise exec -- uv run --project py --no-sync python -m hub_providers.tushare --dates 2026-08-27 2026-08-28 --output fixtures/tushare`。每日期子目录按端点存Parquet，manifest含原查询参数、行数、raw单位、核心就绪与缺失；不保存HTTP token/请求体/凭据。核心只验当日可加`--current-only`，这种录制不能替代完整回看验收。

全量回看依据config：daily65、stk_limit30、index_daily250、fund_daily21、ths_daily30交易日，fund_share当日/前日，完整16方向成员。成员只能当前快照，membershipAsOf是真实抓取日；不把历史目录名称当成历史成员证据。行业包含Y/N历史in/out_date。

`RecordedTushareSource(<日期目录>)`严格按manifest参数读原始表，缺查询抛明确错误；不能扩展窗口。`normalize(endpoint, frame)`保留原列并增加换算列，原始文件不能预先换算或二次乘金额。

真实覆盖边界：两日daily/daily_basic均5547行、6指数各250行；MLCC（886112.TI）最早仅2026-07-30，两日回看20/21行，其余15方向各30行。不得补造缺失历史。全部ths_member为2026-10-02实际采集快照，不是目录日期的点时成员。8/28 moneyflow_mkt_dc净额原始−34371002368元，约−343.71002368亿元，不乘10000。
