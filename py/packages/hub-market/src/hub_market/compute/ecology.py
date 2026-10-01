"""涨停生态名单与分布，价格判定复用逐股面板。"""

from typing import Any

import polars as pl

from hub_contracts import (
    MarketHeightDistribution,
    MarketIndustryCluster,
    MarketLimitDetail,
    MarketLimitEcology,
    MarketProgression,
    MarketProviderDetail,
    MarketStock,
    MarketStocks,
)

from .aggregate import required, value


def details(frame: pl.DataFrame | None) -> dict[str, MarketLimitDetail]:
    if frame is None:
        return {}
    result: dict[str, MarketLimitDetail] = {}
    for row in frame.to_dicts():

        def integer(key: str, row: dict[str, Any] = row) -> int | None:
            return int(row[key]) if row.get(key) is not None else None

        def string(key: str, row: dict[str, Any] = row) -> str | None:
            return str(row[key]) if row.get(key) is not None else None

        result[str(row["ts_code"])] = MarketLimitDetail(
            type=row["limit"],
            firstTime=string("first_time"),
            lastTime=string("last_time"),
            upStat=string("up_stat"),
            openTimes=integer("open_times"),
            limitTimes=integer("limit_times"),
            sealedAmountCny=row.get("fd_amount"),
        )
    return result


def stock(row: dict[str, Any], extra: dict[str, MarketLimitDetail]) -> MarketStock:
    return MarketStock(
        code=row["ts_code"],
        name=row["name"],
        industry=row["industry"],
        board=row["board"],
        return1d=row["return1d"],
        boardHeight=row["boardHeight"],
        amountCny=row["amountCny"],
        limitDetail=extra.get(row["ts_code"]),
    )


def ecology(
    current: pl.DataFrame, history: pl.DataFrame, previous_stamp: str, detail: pl.DataFrame | None
) -> MarketLimitEcology:
    extra = details(detail)
    up, down, touched = (
        current.filter(pl.col(key)) for key in ("limitUp", "limitDown", "touchLimitUp")
    )
    yesterday = history.filter((pl.col("trade_date") == previous_stamp) & pl.col("limitUp"))
    prev_current = current.filter(pl.col("ts_code").is_in(yesterday["ts_code"].implode()))
    advanced = prev_current.filter(pl.col("limitUp"))
    ranked = up.sort(["boardHeight", "amountCny", "ts_code"], descending=[True, True, False])
    distributions = [
        MarketHeightDistribution(
            height=int(frame["boardHeight"][0]),
            count=frame.height,
            names=frame["name"].head(8).to_list(),
        )
        for frame in ranked.partition_by("boardHeight", maintain_order=True)
    ]
    clusters = [
        MarketIndustryCluster(
            industry=str(frame["industry"][0]),
            count=frame.height,
            maxBoardHeight=int(required(frame, "boardHeight", "max")),
            names=frame.sort(["boardHeight", "amountCny"], descending=True)["name"]
            .head(6)
            .to_list(),
        )
        for frame in up.partition_by("industry")
    ]

    def progression(row: dict[str, Any], failed: bool = False) -> MarketProgression:
        state = (
            "晋级未完成"
            if failed
            else "连续晋级"
            if row["prevBoardHeight"] > 0 and row["boardHeight"] == row["prevBoardHeight"] + 1
            else "首板建立"
            if row["boardHeight"] == 1
            else "重新封板"
        )
        return MarketProgression(
            **stock(row, extra).model_dump(),
            previousBoardHeight=row["prevBoardHeight"],
            progressionState=state,
        )

    provider = (
        MarketProviderDetail(
            rowCount=detail.height,
            classification="供应商U/D/Z明细，仅交叉核对",
            limitUpCount=detail.filter(pl.col("limit") == "U").height
            if not detail.is_empty()
            else 0,
            limitDownCount=detail.filter(pl.col("limit") == "D").height
            if not detail.is_empty()
            else 0,
            openedOrTouchedNotClosedCount=detail.filter(pl.col("limit") == "Z").height
            if not detail.is_empty()
            else 0,
        )
        if detail is not None
        else None
    )
    return MarketLimitEcology(
        limitUpCount=up.height,
        limitDownCount=down.height,
        touchedCount=touched.height,
        failedCount=touched.filter(~pl.col("limitUp")).height,
        maxBoardHeight=int(required(up, "boardHeight", "max")) if not up.is_empty() else 0,
        firstBoardCount=up.filter(pl.col("boardHeight") == 1).height,
        multiBoardCount=up.filter(pl.col("boardHeight") >= 2).height,
        previousLimitUpCount=yesterday.height,
        advancementCount=advanced.height,
        advancementRate=advanced.height / yesterday.height if yesterday.height else None,
        sealRate=up.height / touched.height if touched.height else None,
        previousLimitPremium=value(prev_current, "return1d"),
        largeLoss7Count=current.filter(pl.col("return1d") <= -0.07).height,
        providerDetail=provider,
        heightDistribution=distributions,
        industryClusters=sorted(clusters, key=lambda row: (-row.count, row.industry)),
        progression=[progression(row) for row in ranked.head(20).to_dicts()],
        failedPromotions=[
            progression(row, True)
            for row in prev_current.filter(~pl.col("limitUp"))
            .sort(["prevBoardHeight", "return1d", "ts_code"], descending=[True, False, False])
            .head(16)
            .to_dicts()
        ],
        leaders=[stock(row, extra) for row in ranked.head(20).to_dicts()],
        limitDownSamples=[
            stock(row, extra) for row in down.sort("amountCny", descending=True).head(12).to_dicts()
        ],
        largeLossSamples=[
            stock(row, extra) for row in current.sort("return1d").head(12).to_dicts()
        ],
    )


def stocks(current: pl.DataFrame, detail: pl.DataFrame | None) -> MarketStocks:
    extra = details(detail)
    return MarketStocks(
        top=[
            stock(row, extra)
            for row in current.sort(["return1d", "amountCny"], descending=True).head(12).to_dicts()
        ],
        bottom=[stock(row, extra) for row in current.sort("return1d").head(12).to_dicts()],
    )
