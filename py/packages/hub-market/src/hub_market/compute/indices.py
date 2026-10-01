"""指数日线与技术位，只使用真实窗口。"""

from datetime import date

import polars as pl

from hub_contracts import (
    IndexBar,
    MarketIndex,
    MarketOverview,
    MarketTechnical,
    MarketTechnicalLevel,
)

from .aggregate import required


def index(frame: pl.DataFrame, code: str, name: str, on: date) -> MarketIndex:
    rows = frame.filter(pl.col("trade_date") == on.strftime("%Y%m%d"))
    if rows.height != 1:
        raise ValueError(f"{code} 当日指数证据不足或重复")
    row = rows.row(0, named=True)
    return MarketIndex(
        code=code,
        name=name,
        close=row["close"],
        return1d=row["pct_chg"] / 100,
        amountCny=row["amount"] * 1000,
    )


def bars(frame: pl.DataFrame, on: date) -> list[IndexBar]:
    return [
        IndexBar(
            date=date.fromisoformat(str(row["trade_date"])),
            open=row["open"],
            high=row["high"],
            low=row["low"],
            close=row["close"],
            preClose=row["pre_close"],
            return1d=row["pct_chg"] / 100,
            amountCny=row["amount"] * 1000,
        )
        for row in frame.filter(pl.col("trade_date") <= on.strftime("%Y%m%d"))
        .sort("trade_date")
        .to_dicts()
    ]


def technical(frame: pl.DataFrame, on: date, market: MarketOverview) -> MarketTechnical:
    ordered = frame.filter(pl.col("trade_date") <= on.strftime("%Y%m%d")).sort("trade_date")
    if ordered.height < 21 or ordered["trade_date"][-1] != on.strftime("%Y%m%d"):
        raise ValueError("上证技术位需要包含目标日的21日真实日线")
    last = ordered.tail(20).with_columns(
        pl.max_horizontal(
            pl.col("high") - pl.col("low"),
            (pl.col("high") - pl.col("pre_close")).abs(),
            (pl.col("low") - pl.col("pre_close")).abs(),
        ).alias("tr")
    )
    close, ma20 = float(ordered["close"][-1]), required(last, "close")

    def level(label: str, field: str, count: int, high: bool = False) -> MarketTechnicalLevel:
        return MarketTechnicalLevel(
            label=label,
            value=required(ordered.tail(count), field, "max" if high else "min"),
            kind="observed_high" if high else "observed_low",
        )

    return MarketTechnical(
        indexCode="000001.SH",
        asOf=on,
        close=close,
        ma5=required(ordered.tail(5), "close"),
        ma10=required(ordered.tail(10), "close"),
        ma20=ma20,
        atr20=required(last, "tr"),
        support=[
            MarketTechnicalLevel(label="MA20", value=ma20, kind="dynamic_average"),
            level("近10日最低", "low", 10),
            level("近20日最低", "low", 20),
        ],
        resistance=[level("近10日最高", "high", 10, True), level("近20日最高", "high", 20, True)],
        confirmationRule="收盘高于前20日区间高点，且全A上涨覆盖不低于50%，且全市场成交额不低于近20日中位数。",
        confirmationNow=close > required(ordered.head(ordered.height - 1).tail(20), "high", "max")
        and market.advanceShare >= 0.5
        and market.turnoverCny >= market.turnoverMedian20Cny,
    )
