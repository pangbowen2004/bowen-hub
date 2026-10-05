"""版次窗口与日程：只使用调用方传入的时钟和交易日历。"""

from collections.abc import Sequence
from dataclasses import dataclass
from datetime import date, datetime, time, timedelta
from typing import Literal
from zoneinfo import ZoneInfo

from hub_contracts import CalendarEvent, Edition, EditionWindow, WatchItem
from hub_core.protocols import TradingCalendar
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline.articles import utc

EditionKind = Literal["morning", "premarket", "weekly"]


@dataclass(frozen=True)
class WindowPlan:
    kind: EditionKind
    day: date
    start: datetime
    end: datetime
    mode: Literal["regular", "weekend", "lookahead", "premarket", "weekly"]
    sessions: tuple[date, ...] = ()
    skip: bool = False

    @property
    def window(self) -> EditionWindow:
        return EditionWindow(fromAt=self.start, toAt=self.end)

    def contains(self, at: datetime, settings: Settings) -> bool:
        at = utc(at)
        inside = self.start <= at <= self.end
        if self.kind == "weekly":
            return (
                inside
                and at.astimezone(ZoneInfo(settings.newsroom.usMarket["timezone"])).date()
                in self.sessions
            )
        return inside


def edition_window(
    kind: EditionKind,
    now: datetime,
    settings: Settings,
    calendar: TradingCalendar,
    history: Sequence[Edition] = (),
) -> WindowPlan:
    now = utc(now)
    sg = ZoneInfo(settings.newsroom.timezone)
    et = ZoneInfo(settings.newsroom.usMarket["timezone"])
    day = now.astimezone(sg).date()
    et_day = now.astimezone(et).date()
    if kind == "weekly":
        monday = (
            day - timedelta(days=7)
            if day.weekday() == 0
            else et_day - timedelta(days=et_day.weekday())
        )
        start = datetime.combine(monday, time.min, et)
        sessions = tuple(calendar.sessions(monday, min(monday + timedelta(days=4), et_day)))
        return WindowPlan(kind, day, utc(start), now, "weekly", sessions)
    if kind == "premarket":
        if not calendar.is_session(et_day):
            return WindowPlan(kind, day, now, now, "premarket", skip=True)
        mornings = [
            e
            for e in history
            if e.kind == "morning"
            and e.date == day
            and e.window.toAt is not None
            and utc(e.window.toAt) <= now
        ]
        if not mornings:
            raise ValueError("盘前窗口缺少当天早报；不能猜造覆盖起点")
        latest = max(mornings, key=lambda e: utc(e.window.toAt or now))
        return WindowPlan(kind, day, utc(latest.window.toAt or now), now, "premarket")
    rule = settings.newsroom.editions[kind]
    if rule.maxWindowHours is None or rule.initialWindowHours is None:
        raise ValueError("早报缺少最大窗口或首次窗口配置")
    sent = [
        utc(e.email.sentAt)
        for e in history
        if e.kind == "morning"
        and e.email
        and e.email.sentAt is not None
        and utc(e.email.sentAt) <= now
    ]
    start = max(
        max(sent) if sent else now - timedelta(hours=rule.initialWindowHours),
        now - timedelta(hours=rule.maxWindowHours),
    )
    closes = [
        calendar.close_at(d)
        for d in calendar.sessions(start.astimezone(et).date(), et_day)
        if start < utc(calendar.close_at(d)) <= now
    ]
    mode: Literal["regular", "weekend", "lookahead"] = "regular" if closes else "weekend"
    if day.weekday() == 0:
        mode = "lookahead"
    # 周末要闻/周一前瞻沿用发送窗口，但起点至少为新加坡周六，避免重播周五盘中。
    if mode != "regular" and day.weekday() in {0, 6}:
        saturday = day - timedelta(days=(day.weekday() - 5) % 7)
        start = max(start, utc(datetime.combine(saturday, time.min, sg)))
    return WindowPlan(kind, day, start, now, mode)


def calendar_range(plan: WindowPlan, settings: Settings) -> tuple[date, date]:
    if plan.kind == "weekly":
        monday = plan.start.astimezone(
            ZoneInfo(settings.newsroom.usMarket["timezone"])
        ).date() + timedelta(days=7)
        return monday, monday + timedelta(days=4)
    if plan.mode == "lookahead":
        monday = plan.day - timedelta(days=plan.day.weekday())
        return monday, monday + timedelta(days=4)
    # 早报的“今晚”与盘前均按新加坡当天对应的美东交易日期，而非当前UTC日期。
    return plan.day, plan.day


def prepare_calendar(
    events: Sequence[CalendarEvent],
    start: date,
    end: date,
    settings: Settings,
    watchlist: Sequence[WatchItem],
    *,
    premarket: bool = False,
) -> tuple[CalendarEvent, ...]:
    rules = settings.newsroom
    et = ZoneInfo(rules.usMarket["timezone"])
    sg = ZoneInfo(rules.timezone)
    allowed = {w.symbol for w in watchlist if w.active} | set(rules.megaCaps)
    releases = {name: r for r in rules.macro.releases for name in (r.fredName, r.label)}
    result: list[CalendarEvent] = []
    for event in events:
        if not start <= event.date <= end:
            continue
        if event.kind == "macro":
            release = releases.get(event.title)
            if release is None:
                continue
            at = datetime.combine(event.date, time.fromisoformat(release.timeEt), et).astimezone(sg)
            result.append(event.model_copy(update={"title": release.label, "at": at}))
        elif event.kind == "earnings":
            symbols = sorted(allowed.intersection(event.tickers))
            if symbols and (not premarket or event.timing == "amc"):
                result.append(
                    event.model_copy(
                        update={
                            "tickers": symbols,
                            "at": event.at.astimezone(sg) if event.at is not None else None,
                        }
                    )
                )
    for meeting in rules.macro.fomc:
        day = date.fromisoformat(meeting.dates[-1])
        if start <= day <= end:
            at = datetime.combine(day, time.fromisoformat(rules.macro.fomcStatementTimeEt), et)
            result.append(
                CalendarEvent(
                    kind="fomc",
                    date=day,
                    fredReleaseId=None,
                    at=at.astimezone(sg),
                    title="FOMC 声明" + ("与经济预测" if meeting.sep else ""),
                    tickers=[],
                    timing=None,
                    importance="high",
                )
            )
    # 相同日程不因多个适配器而重复。
    unique = {(e.kind, e.date, e.title, tuple(e.tickers), e.timing): e for e in result}
    return tuple(
        sorted(
            unique.values(),
            key=lambda e: (e.date, e.at.isoformat() if e.at else "", e.title, tuple(e.tickers)),
        )
    )


def premarket_due_at(day: date, calendar: TradingCalendar, settings: Settings) -> datetime | None:
    """开盘前45分钟的运行时刻；节假日无任务，DST由交易所日历处理。"""
    if not calendar.is_session(day):
        return None
    minutes = settings.newsroom.editions["premarket"].minutesBeforeOpen
    if minutes is None:
        raise ValueError("盘前缺少开盘前分钟数配置")
    return (calendar.open_at(day) - timedelta(minutes=minutes)).astimezone(
        ZoneInfo(settings.newsroom.timezone)
    )


def premarket_in_guard(now: datetime, calendar: TradingCalendar, settings: Settings) -> bool:
    local = utc(now).astimezone(ZoneInfo(settings.newsroom.usMarket["timezone"]))
    guard = settings.newsroom.editions["premarket"].guardWindowEt
    if guard is None or len(guard) != 2:
        raise ValueError("盘前缺少有效美东运行窗口配置")
    return calendar.is_session(local.date()) and time.fromisoformat(
        guard[0]
    ) <= local.time() <= time.fromisoformat(guard[1])
