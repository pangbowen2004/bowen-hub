"""行情协议的最小快照，只保留存在且可计算的涨跌事实。"""

from collections.abc import Sequence

from hub_contracts import NewsCloseSnapshot, NewsPriceChange
from hub_core.protocols import PriceBar


def snapshot(
    rows: Sequence[PriceBar], indices: Sequence[str], watchlist: Sequence[str]
) -> NewsCloseSnapshot:
    return NewsCloseSnapshot(
        indices=[
            NewsPriceChange(symbol=row.symbol, change=row.return1d)
            for row in rows
            if row.symbol in indices and row.return1d is not None
        ],
        watchlist=[
            NewsPriceChange(symbol=row.symbol, change=row.return1d)
            for row in rows
            if row.symbol in watchlist and row.return1d is not None
        ],
        treasury10Year=None,
        vix=None,
    )
