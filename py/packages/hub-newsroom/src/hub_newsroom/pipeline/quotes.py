"""已取得日线的收盘事实包；缺少端点就缺省，绝不跨缺失交易日计算。"""

from collections.abc import Sequence
from datetime import date
from decimal import Decimal

from hub_contracts import NewsCloseSnapshot, NewsPriceChange, WatchItem
from hub_core.protocols import PriceBar, TradingCalendar
from hub_newsroom.common.settings import Settings


def price_changes(
    bars: Sequence[PriceBar], symbols: Sequence[str], start: date, end: date
) -> list[NewsPriceChange]:
    lookup = {(bar.symbol, bar.date): bar for bar in bars}
    changes: list[NewsPriceChange] = []
    for symbol in dict.fromkeys(symbols):
        first, last = lookup.get((symbol, start)), lookup.get((symbol, end))
        if first is not None and last is not None and first.close > 0:
            changes.append(
                NewsPriceChange(
                    symbol=symbol,
                    change=float(Decimal(str(last.close)) / Decimal(str(first.close)) - 1),
                )
            )
    return changes


def close_snapshot(
    bars: Sequence[PriceBar],
    session: date,
    calendar: TradingCalendar,
    watchlist: Sequence[WatchItem],
    settings: Settings,
    *,
    week_sessions: Sequence[date] | None = None,
    crypto_day: date | None = None,
    treasury10_year: float | None = None,
    vix: float | None = None,
) -> NewsCloseSnapshot:
    if not calendar.is_session(session):
        raise ValueError("快照日期必须是交易日")
    if week_sessions is not None:
        if not week_sessions or week_sessions[-1] != session:
            raise ValueError("周涨跌端点必须对应本周真实交易日")
        start = calendar.previous_session(week_sessions[0])
    else:
        start = calendar.previous_session(session)
    symbols = [w.symbol for w in watchlist if w.active and w.kind != "crypto"]
    indices = price_changes(bars, settings.newsroom.snapshot.indexEtfs, start, session)
    watched = price_changes(bars, symbols, start, session)
    # 加密日线端点由调用者从UTC日期确定，不复用纽约交易日。
    if crypto_day is not None and week_sessions is None:
        from datetime import timedelta

        watched.extend(
            price_changes(
                bars,
                [w.symbol for w in watchlist if w.active and w.kind == "crypto"],
                crypto_day - timedelta(days=1),
                crypto_day,
            )
        )
    watched.sort(key=lambda item: (-item.change, item.symbol))
    return NewsCloseSnapshot(
        indices=indices,
        watchlist=watched,
        treasury10Year=treasury10_year if settings.newsroom.snapshot.treasury10y else None,
        vix=vix if settings.newsroom.snapshot.vix else None,
    )


def sector_sync(
    change: float | None, sector_change: float | None, settings: Settings
) -> bool | None:
    if change is None or sector_change is None:
        return None
    return (
        change * sector_change > 0
        and abs(sector_change) >= settings.newsroom.thresholds.sectorSyncMove
    )
