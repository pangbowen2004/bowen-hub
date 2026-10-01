"""境内股票ETF分组，份额变动只比较相邻市场交易日的真实记录。"""

from datetime import date
from typing import Any

import polars as pl

from hub_contracts import MarketEtfGroup, MarketEtfGroups, MarketEtfRepresentative

from .aggregate import required, value


def etf_groups(
    basic: pl.DataFrame | None,
    daily: pl.DataFrame | None,
    shares: pl.DataFrame | None,
    configuration: dict[str, Any],
    on: date,
    previous: date,
) -> MarketEtfGroups | None:
    if basic is None or daily is None or basic.is_empty() or daily.is_empty():
        return None
    stamp, prev = on.strftime("%Y%m%d"), previous.strftime("%Y%m%d")
    history = (
        daily.filter(pl.col("trade_date") <= stamp)
        .sort("ts_code", "trade_date")
        .with_columns(
            (pl.col("pct_chg") / 100).alias("return1d"),
            (pl.col("amount") * 1000).alias("amountCny"),
            (pl.col("close") / pl.col("close").shift(5).over("ts_code") - 1).alias("return5d"),
            (pl.col("close") / pl.col("close").shift(20).over("ts_code") - 1).alias("return20d"),
        )
    )
    pool = basic.filter(
        pl.col("name").str.contains("ETF")
        & pl.col("fund_type").str.contains(configuration["requireFundTypeContains"])
        & (pl.col("list_date") <= stamp)
    )
    for word in configuration["excludeKeywords"]:
        pool = pool.filter(~pl.col("name").str.contains(word, literal=True))
    pool = history.filter((pl.col("trade_date") == stamp) & pl.col("pct_chg").is_not_null()).join(
        pool.select("ts_code", "name"), on="ts_code", how="inner"
    )
    if shares is not None:
        if shares.is_empty():
            shares = pl.DataFrame(
                schema={"trade_date": pl.String, "ts_code": pl.String, "fd_share": pl.Float64}
            )
        current_share = shares.filter(pl.col("trade_date") == stamp).select("ts_code", "fd_share")
        previous_share = shares.filter(pl.col("trade_date") == prev).select(
            "ts_code", pl.col("fd_share").alias("previousShare")
        )
        delta = current_share.join(previous_share, on="ts_code").with_columns(
            pl.when(pl.col("previousShare") > 0)
            .then(pl.col("fd_share") / pl.col("previousShare") - 1)
            .otherwise(None)
            .alias("shareDelta")
        )
        pool = pool.join(delta.select("ts_code", "shareDelta"), on="ts_code", how="left")
    else:
        pool = pool.with_columns(pl.lit(None, dtype=pl.Float64).alias("shareDelta"))
    result: list[MarketEtfGroup] = []
    # Python正则支持配置既定负向前瞻；不改为Rust不支持的表达式。
    import re

    for config in configuration["groups"]:
        names = [name for name in pool["name"].to_list() if re.search(config["pattern"], name)]
        group = pool.filter(pl.col("name").is_in(names))
        if group.is_empty():
            continue
        amount = required(group, "amountCny", "sum")
        weighted = (
            required(
                group.with_columns((pl.col("return1d") * pl.col("amountCny")).alias("weighted")),
                "weighted",
                "sum",
            )
            / amount
            if amount > 0
            else required(group, "return1d")
        )
        representative = group.sort(["amountCny", "ts_code"], descending=[True, False]).row(
            0, named=True
        )
        result.append(
            MarketEtfGroup(
                name=config["name"],
                rule=config["pattern"],
                sampleCount=group.height,
                amountWeightedReturn1d=weighted,
                medianReturn1d=required(group, "return1d", "median"),
                medianReturn5d=value(group, "return5d", "median"),
                medianReturn20d=value(group, "return20d", "median"),
                amountCny=amount,
                shareCoverage=group.filter(pl.col("shareDelta").is_not_null()).height / group.height
                if shares is not None
                else None,
                shareIncreaseCount=group.filter(pl.col("shareDelta") > 0).height
                if shares is not None
                else None,
                shareDecreaseCount=group.filter(pl.col("shareDelta") < 0).height
                if shares is not None
                else None,
                representative=MarketEtfRepresentative(
                    code=representative["ts_code"],
                    name=representative["name"],
                    return1d=representative["return1d"],
                    amountCny=representative["amountCny"],
                    shareDelta=representative["shareDelta"],
                ),
            )
        )
    return MarketEtfGroups(
        groups=sorted(result, key=lambda row: (-row.amountWeightedReturn1d, row.name))
    )
