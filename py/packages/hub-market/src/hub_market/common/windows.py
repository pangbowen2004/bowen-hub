"""交易日窗口与出现次数；缺方向数据保留原日期。"""

from collections import Counter
from collections.abc import Sequence

from hub_contracts import MarketAppearance, MarketDaySummary


def five_sessions(rows: Sequence[MarketDaySummary]) -> list[MarketDaySummary]:
    if len(rows) != 5 or len({row.date for row in rows}) != 5:
        raise ValueError("必须提供五个不同交易日的摘要，不填造或跨缺日补位")
    return sorted(rows, key=lambda row: row.date)


def appearances(rows: Sequence[MarketDaySummary], *, directions: bool) -> list[MarketAppearance]:
    counts: Counter[str] = Counter()
    for row in rows:
        ranks = (
            (row.topDirections if row.directionsRelative is not None else None)
            if directions
            else row.topIndustries
        )
        if ranks is not None:
            counts.update(item.name for item in ranks[:3])
    return [
        MarketAppearance(name=name, top3Appearances=count)
        for name, count in sorted(counts.items(), key=lambda pair: (-pair[1], pair[0]))
    ]
