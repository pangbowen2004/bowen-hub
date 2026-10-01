"""来源适配器和日历协议；不包含 IO 实现。"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime
from typing import Any, Protocol

from hub_contracts import Article, CalendarEvent, Filing, InsiderTrade, NewsCloseSnapshot


class NewsSource(Protocol):
    def fetch_news(
        self, start: datetime, end: datetime, symbols: Sequence[str] = ()
    ) -> Sequence[Article]: ...


class FilingSource(Protocol):
    def fetch_filings(
        self, start: datetime, end: datetime, symbols: Sequence[str]
    ) -> Sequence[Filing]: ...


class InsiderSource(Protocol):
    def fetch_insiders(
        self, start: datetime, end: datetime, symbols: Sequence[str]
    ) -> Sequence[InsiderTrade]: ...


class CalendarSource(Protocol):
    def fetch_events(
        self, start: date, end: date, symbols: Sequence[str] = ()
    ) -> Sequence[CalendarEvent]: ...


@dataclass(frozen=True)
class PriceBar:
    # 契约 IndexBar 不含股票标识；内部日线只增加 symbol，不新增 API 类型。
    symbol: str
    date: date
    close: float
    return1d: float | None
    amountCny: float | None


class QuoteSource(Protocol):
    def fetch_bars(self, symbols: Sequence[str], start: date, end: date) -> Sequence[PriceBar]: ...
    def fetch_snapshot(self, session: date, symbols: Sequence[str]) -> NewsCloseSnapshot: ...


class TushareSource(Protocol):
    # TuShare 表包含 API 未定义的原始面板字段；适配器返回命名列记录，再交纯函数计算。
    def query(self, endpoint: str, **params: str) -> Sequence[dict[str, Any]]: ...


class TradingCalendar(Protocol):
    def is_session(self, day: date) -> bool: ...
    def previous_session(self, day: date) -> date: ...
    def next_session(self, day: date) -> date: ...
    def sessions(self, start: date, end: date) -> Sequence[date]: ...
    def open_at(self, day: date) -> datetime: ...
    def close_at(self, day: date) -> datetime: ...
