"""原始日线生成逐股面板；历史窗口按股票自己的有行情日期。"""

from datetime import date
from decimal import Decimal

import polars as pl


def panel(
    daily: pl.DataFrame,
    limits: pl.DataFrame,
    basic: pl.DataFrame,
    names: pl.DataFrame,
    members: pl.DataFrame,
    on: date,
    previous: date,
) -> tuple[pl.DataFrame, pl.DataFrame]:
    for label, frame, keys in [
        ("daily", daily, ["ts_code", "trade_date"]),
        ("stk_limit", limits, ["ts_code", "trade_date"]),
        ("daily_basic", basic, ["ts_code"]),
    ]:
        if frame.select(keys).unique().height != frame.height:
            raise ValueError(f"{label} 存在重复自然键")
    stamp, prev = on.strftime("%Y%m%d"), previous.strftime("%Y%m%d")
    history = daily.filter(pl.col("trade_date") <= stamp).sort("ts_code", "trade_date")
    history = history.with_columns(
        (pl.col("pct_chg") / 100).alias("return1d"),
        (pl.col("amount") * 1000).alias("amountCny"),
        (pl.col("close") / pl.col("close").shift(5).over("ts_code") - 1).alias("return5d"),
        (pl.col("close") / pl.col("close").shift(20).over("ts_code") - 1).alias("return20d"),
        pl.col("close").rolling_mean(20, min_samples=1).over("ts_code").alias("ma20"),
        pl.col("close").rolling_max(20, min_samples=1).over("ts_code").alias("high20"),
        pl.col("close").rolling_min(20, min_samples=1).over("ts_code").alias("low20"),
    ).join(
        limits.select("ts_code", "trade_date", "up_limit", "down_limit"),
        on=["ts_code", "trade_date"],
        how="left",
    )
    history = history.with_columns(
        (pl.col("close") > pl.col("ma20")).alias("aboveMa20"),
        (pl.col("close") >= pl.col("high20")).alias("newHigh20"),
        (pl.col("close") <= pl.col("low20")).alias("newLow20"),
        ((pl.col("close") - pl.col("up_limit")).abs() < 0.001).alias("limitUp"),
        (pl.col("high") >= pl.col("up_limit") - 0.001).alias("touchLimitUp"),
        ((pl.col("close") - pl.col("down_limit")).abs() < 0.001).alias("limitDown"),
    )
    # 缺限价不能证明断板。只有目标与前日涨停股的连续链需要完整证据。
    heights: list[dict[str, object]] = []
    for group in history.partition_by("ts_code", maintain_order=True):
        rows = group.select("ts_code", "trade_date", "limitUp", "close").to_dicts()
        for index, row in enumerate(rows):
            if row["trade_date"] not in (stamp, prev):
                continue
            height = 0
            for old in reversed(rows[max(0, index - 29) : index + 1]):
                if old["limitUp"] is None:
                    if height:
                        raise ValueError(f"{row['ts_code']} 连板历史限价缺失：{old['trade_date']}")
                    break
                if not old["limitUp"]:
                    break
                height += 1
            heights.append(
                {
                    "ts_code": row["ts_code"],
                    "trade_date": row["trade_date"],
                    "boardHeight": height,
                    "exactAboveMa20": Decimal(str(row["close"]))
                    * len(rows[max(0, index - 19) : index + 1])
                    > sum(
                        Decimal(str(price["close"]))
                        for price in rows[max(0, index - 19) : index + 1]
                    ),
                }
            )
    history = history.join(pl.DataFrame(heights), on=["ts_code", "trade_date"], how="left")
    previous_rows = history.filter((pl.col("trade_date") == prev) & pl.col("pct_chg").is_not_null())
    if previous_rows.select(
        pl.any_horizontal(pl.col("limitUp", "limitDown").is_null()).any()
    ).item():
        raise ValueError("上一市场交易日限价证据不足")
    prev_up = history.filter((pl.col("trade_date") == prev) & pl.col("limitUp")).select(
        "ts_code", pl.col("boardHeight").alias("prevBoardHeight")
    )
    mapping = (
        members.filter(
            (pl.col("in_date") <= stamp)
            & (
                pl.col("out_date").is_null()
                | (pl.col("out_date") == "")
                | (pl.col("out_date") > stamp)
            )
        )
        .sort("ts_code", "in_date")
        .unique("ts_code", keep="last")
        .select("ts_code", pl.col("l1_name").alias("industry"))
    )
    current = (
        history.filter((pl.col("trade_date") == stamp) & pl.col("pct_chg").is_not_null())
        .join(
            basic.select("ts_code", "turnover_rate", "pe_ttm", "pb", "total_mv"),
            on="ts_code",
            how="left",
        )
        .join(
            names.select("ts_code", "name").unique("ts_code", keep="first"),
            on="ts_code",
            how="left",
        )
        .join(mapping, on="ts_code", how="left")
        .join(prev_up, on="ts_code", how="left")
    )
    current = current.with_columns(
        pl.col("prevBoardHeight").fill_null(0),
        pl.col("exactAboveMa20").alias("aboveMa20"),
        (pl.col("turnover_rate") / 100).alias("turnoverRate"),
        (pl.col("total_mv") * 10000).alias("marketCapCny"),
        pl.col("industry").fill_null("未分类"),
        pl.col("name").fill_null(pl.col("ts_code")),
        pl.when(pl.col("ts_code").str.starts_with("300") | pl.col("ts_code").str.starts_with("301"))
        .then(pl.lit("创业板"))
        .when(pl.col("ts_code").str.starts_with("688") | pl.col("ts_code").str.starts_with("689"))
        .then(pl.lit("科创板"))
        .when(
            pl.col("ts_code").str.starts_with("4")
            | pl.col("ts_code").str.starts_with("8")
            | pl.col("ts_code").str.starts_with("92")
        )
        .then(pl.lit("北交所"))
        .otherwise(pl.lit("主板"))
        .alias("board"),
    )
    if (
        current.is_empty()
        or current.select(
            pl.any_horizontal(pl.col("limitUp", "limitDown", "touchLimitUp").is_null()).any()
        ).item()
    ):
        raise ValueError("有效样本或当日限价证据不足")
    return current, history
