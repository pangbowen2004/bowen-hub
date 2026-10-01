"""SSE交易日历直接依据trade_cal；不把工作日当交易日。"""

from collections.abc import Sequence
from datetime import date, datetime, time

from .adapter import SHANGHAI, TushareError, TushareSource


class SseCalendar:
    def __init__(self, source: TushareSource) -> None:
        self.source = source

    def sessions(self, start: date, end: date) -> Sequence[date]:
        if start > end:
            return []
        dates: set[date] = set()
        for year in range(start.year, end.year + 1):
            rows = self.source.query(
                "trade_cal", exchange="SSE", start_date=f"{year}0101", end_date=f"{year}1231"
            )
            if not rows:
                raise TushareError("trade_cal：交易日历为空")
            for row in rows:
                day = datetime.strptime(str(row["cal_date"]), "%Y%m%d").date()
                if start <= day <= end and str(row["is_open"]) == "1":
                    dates.add(day)
        return sorted(dates)

    def is_session(self, day: date) -> bool:
        rows = self.source.query(
            "trade_cal", exchange="SSE", start_date=f"{day.year}0101", end_date=f"{day.year}1231"
        )
        for row in rows:
            if row["cal_date"] == day.strftime("%Y%m%d"):
                return str(row["is_open"]) == "1"
        raise TushareError("trade_cal：目标日期没有记录")

    def previous_session(self, day: date) -> date:
        for year in range(day.year, day.year - 3, -1):
            values = self.sessions(date(year, 1, 1), min(day, date(year, 12, 31)))
            preceding = [value for value in values if value < day]
            if preceding:
                return preceding[-1]
        raise TushareError("trade_cal：缺少上一交易日")

    def next_session(self, day: date) -> date:
        for year in range(day.year, day.year + 3):
            values = self.sessions(max(day, date(year, 1, 1)), date(year, 12, 31))
            following = [value for value in values if value > day]
            if following:
                return following[0]
        raise TushareError("trade_cal：缺少下一交易日")

    def open_at(self, day: date) -> datetime:
        if not self.is_session(day):
            raise ValueError("不是SSE交易日")
        return datetime.combine(day, time(9, 30), SHANGHAI)

    def close_at(self, day: date) -> datetime:
        if not self.is_session(day):
            raise ValueError("不是SSE交易日")
        return datetime.combine(day, time(15), SHANGHAI)

    def lookback(self, day: date, count: int) -> list[date]:
        if count < 1:
            raise ValueError("回看交易日数必须为正")
        values: set[date] = set()
        year = day.year
        while len(values) < count:
            rows = self.sessions(date(year, 1, 1), min(day, date(year, 12, 31)))
            if not rows:
                raise TushareError("trade_cal：回看窗口日历不足")
            values.update(rows)
            year -= 1
        return sorted(values)[-count:]
