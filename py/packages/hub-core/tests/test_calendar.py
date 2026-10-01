"""XNYS 日历离线计算，测试美东夏令时、假日及提前收市。"""

from datetime import date, timedelta

import pytest

from hub_core.calendar import NyseCalendar
from hub_core.protocols import TradingCalendar


@pytest.mark.parametrize(
    ("day", "open_hour", "close_hour"),
    [
        ("2026-03-06", 14, 21),
        ("2026-03-09", 13, 20),
        ("2026-10-30", 13, 20),
        ("2026-11-02", 14, 21),
    ],
)
def test_dst(day: str, open_hour: int, close_hour: int) -> None:
    calendar: TradingCalendar = NyseCalendar(date(2026, 1, 1), date(2026, 12, 31))
    session = date.fromisoformat(day)
    assert calendar.open_at(session).hour == open_hour
    assert calendar.open_at(session).minute == 30
    assert calendar.close_at(session).hour == close_hour
    assert calendar.close_at(session).utcoffset() == timedelta(0)


def test_holidays_early_close_and_adjacency() -> None:
    calendar = NyseCalendar(date(2026, 1, 1), date(2026, 12, 31))
    assert not calendar.is_session(date(2026, 7, 3))
    assert not calendar.is_session(date(2026, 3, 8))
    assert calendar.previous_session(date(2026, 3, 9)) == date(2026, 3, 6)
    assert calendar.next_session(date(2026, 3, 6)) == date(2026, 3, 9)
    assert calendar.previous_session(date(2026, 3, 8)) == date(2026, 3, 6)
    assert calendar.next_session(date(2026, 3, 8)) == date(2026, 3, 9)
    assert calendar.close_at(date(2026, 11, 27)).hour == 18
    assert list(calendar.sessions(date(2026, 3, 6), date(2026, 3, 9))) == [
        date(2026, 3, 6),
        date(2026, 3, 9),
    ]
