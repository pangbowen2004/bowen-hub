"""来源事实的最小转换；缺失值不补造。"""

from datetime import UTC, date, datetime, timedelta
from hashlib import sha256
from math import isfinite
from typing import Any
from zoneinfo import ZoneInfo

from hub_core.calendar import NyseCalendar
from hub_core.protocols import PriceBar

ET = ZoneInfo("America/New_York")


def instant(value: str) -> datetime:
    result = datetime.fromisoformat(value.replace("Z", "+00:00"))
    if result.tzinfo is None:
        raise ValueError("来源时间缺少时区")
    return result.astimezone(UTC)


def number(value: Any) -> float | None:
    if value is None or value == "" or value == ".":
        return None
    result = float(value)
    if not isfinite(result):
        raise ValueError("来源数值非有限")
    return result


def article_id(source: str, identity: str) -> str:
    return source + ":" + sha256(identity.encode()).hexdigest()


def bars(
    symbol: str, values: list[tuple[date, float]], start: date, end: date, *, crypto: bool = False
) -> list[PriceBar]:
    # 调用者提供前一交易日；没有前一日数据时首条不猜涨跌。
    previous: float | None = None
    previous_date: date | None = None
    calendar = None if crypto else NyseCalendar()
    result: list[PriceBar] = []
    for day, close in sorted(dict(values).items()):
        if not isfinite(close):
            raise ValueError("日线价格非有限")
        expected = day - timedelta(days=1) if calendar is None else calendar.previous_session(day)
        change = (
            close / previous - 1
            if previous is not None and previous != 0 and previous_date == expected
            else None
        )
        if change is not None and not isfinite(change):
            raise ValueError("日线涨跌非有限")
        if start <= day <= end:
            result.append(PriceBar(symbol, day, close, change))
        previous = close
        previous_date = day
    return result
