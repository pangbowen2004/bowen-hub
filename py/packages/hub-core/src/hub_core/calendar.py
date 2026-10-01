"""纽交所日历；UTC 输出开闭市时间，夏令时由 XNYS 处理。"""

from datetime import date, datetime

import exchange_calendars as xcals  # pyright: ignore[reportMissingTypeStubs]
import pandas as pd


class NyseCalendar:
    def __init__(self, start: date | None = None, end: date | None = None) -> None:
        self._calendar = xcals.get_calendar("XNYS", start=start, end=end)

    def is_session(self, day: date) -> bool:
        return bool(self._calendar.is_session(pd.Timestamp(day)))

    def previous_session(self, day: date) -> date:
        before = pd.Timestamp(day) - pd.Timedelta(days=1)
        return self._calendar.date_to_session(before, direction="previous").date()

    def next_session(self, day: date) -> date:
        after = pd.Timestamp(day) + pd.Timedelta(days=1)
        return self._calendar.date_to_session(after, direction="next").date()

    def sessions(self, start: date, end: date) -> list[date]:
        return [
            stamp.date()
            for stamp in self._calendar.sessions_in_range(pd.Timestamp(start), pd.Timestamp(end))
        ]

    def open_at(self, day: date) -> datetime:
        return self._calendar.session_open(pd.Timestamp(day)).to_pydatetime()

    def close_at(self, day: date) -> datetime:
        return self._calendar.session_close(pd.Timestamp(day)).to_pydatetime()
