"""原始列保持不变，归一列只由原始数据显式派生一次。"""

import polars as pl

AMOUNTS = ("net_amount", "buy_elg_amount", "buy_lg_amount", "buy_md_amount", "buy_sm_amount")


def normalize(endpoint: str, raw: pl.DataFrame) -> pl.DataFrame:
    expressions: list[pl.Expr] = []
    if endpoint in {"daily", "fund_daily", "index_daily"} and "amount" in raw.columns:
        expressions.append((pl.col("amount").cast(pl.Float64) * 1000).alias("amountCny"))
    if endpoint == "daily_basic":
        for name, target in (
            ("total_mv", "totalMarketCapCny"),
            ("circ_mv", "circulatingMarketCapCny"),
        ):
            if name in raw.columns:
                expressions.append((pl.col(name).cast(pl.Float64) * 10000).alias(target))
    if endpoint in {"moneyflow_dc", "moneyflow_mkt_dc"}:
        factor = 10000 if endpoint == "moneyflow_dc" else 1
        for name in AMOUNTS:
            if name in raw.columns:
                expressions.append((pl.col(name).cast(pl.Float64) * factor).alias(f"{name}_cny"))
    if endpoint == "fund_share" and "fd_share" in raw.columns:
        expressions.append((pl.col("fd_share").cast(pl.Float64) * 10000).alias("shares"))
    percentages = ["pct_chg", "pct_change", "net_amount_rate"]
    if endpoint in {"daily_basic", "ths_daily"}:
        percentages.extend(("turnover_rate", "turnover_rate_f"))
    if endpoint in {"moneyflow_dc", "moneyflow_mkt_dc"}:
        percentages.extend(f"{name}_rate" for name in AMOUNTS[1:])
    if endpoint == "moneyflow_mkt_dc":
        percentages.extend(("pct_change_sh", "pct_change_sz"))
    for name in percentages:
        if name in raw.columns:
            expressions.append((pl.col(name).cast(pl.Float64) / 100).alias(f"{name}_ratio"))
    return raw.with_columns(expressions)
