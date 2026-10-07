"""控制台月历刷新：只采集日程并经 API 保存，不生成或改写新闻版次。"""

from collections.abc import Sequence
from datetime import UTC, date, datetime, timedelta

from hub_contracts import CalendarEvent, NewsSourceHealth, WatchItem
from hub_core.http import HttpClient
from hub_core.settings import Settings as EnvironmentSettings
from hub_newsroom.common.settings import Settings
from hub_providers.finnhub.adapter import FinnhubSource
from hub_providers.fred.adapter import FredSource

from .repository import Store


def month_range(day: date) -> tuple[date, date]:
    """覆盖本月与下月，跨年时也按自然月边界。"""
    start = day.replace(day=1)
    month = start.month + 2
    after = date(start.year + (month - 1) // 12, (month - 1) % 12 + 1, 1)
    return start, after - timedelta(days=1)


def calendar_events(
    events: Sequence[CalendarEvent], watchlist: Sequence[WatchItem], settings: Settings
) -> list[CalendarEvent]:
    active = {row.symbol for row in watchlist if row.active and row.kind == "stock"}
    rules = settings.newsroom
    decisions = {date.fromisoformat(meeting.dates[-1]) for meeting in rules.macro.fomc}
    result: dict[tuple[str, date, str], CalendarEvent] = {}
    for event in events:
        if event.kind == "earnings":
            if not event.tickers or not all(symbol in active for symbol in event.tickers):
                continue
        elif event.title == rules.calendar.fomcRelease.label:
            # FRED 101 同时包含每日利率数据；只认已核对的官方会议决议日。
            if event.date not in decisions:
                continue
            event = event.model_copy(update={"kind": "fomc"})
        result[(event.kind, event.date, ",".join(event.tickers) or str(event.fredReleaseId))] = (
            event
        )
    return sorted(
        result.values(),
        key=lambda event: (event.date, event.at.isoformat() if event.at else "", event.title),
    )


def refresh_calendar(
    day: date, environment: EnvironmentSettings, settings: Settings, store: Store, http: HttpClient
) -> tuple[int, int]:
    watchlist = store.watchlist()
    symbols = [row.symbol for row in watchlist if row.active and row.kind == "stock"]
    start, end = month_range(day)
    events: list[CalendarEvent] = []
    failures: list[str] = []
    providers: list[FredSource | FinnhubSource] = []
    rules = settings.newsroom.calendar
    if environment.fred_api_key:
        releases = [
            release.model_dump()
            for release in settings.newsroom.macro.releases
            if release.fredName in rules.releaseNames
        ]
        providers.append(
            FredSource(
                http,
                environment.fred_api_key.get_secret_value(),
                [*releases, rules.fomcRelease.model_dump()],
                importance="high",
            )
        )
    else:
        failures.append("fred-calendar")
    if environment.finnhub_api_key:
        providers.append(
            FinnhubSource(
                http, environment.finnhub_api_key.get_secret_value(), importance="unspecified"
            )
        )
    else:
        failures.append("finnhub-earnings")
    for provider in providers:
        try:
            if isinstance(provider, FinnhubSource):
                if symbols:
                    events.extend(
                        provider.fetch_events(
                            start, end, symbols, per_symbol=True, aliases=rules.symbolAliases
                        )
                    )
            else:
                events.extend(provider.fetch_events(start, end))
        except Exception:
            failures.append(provider.source_id)
        if provider.health is not None:
            store.health(provider.health)
    for missing in failures:
        if not any(provider.source_id == missing for provider in providers):
            store.health(
                NewsSourceHealth(
                    id=missing,
                    checkedAt=datetime.now(UTC),
                    status="failed",
                    error="缺少日历供应商凭据",
                )
            )
    rows = calendar_events(events, watchlist, settings)
    store.batch("/v1/internal/news/calendar/batch", rows)
    if failures:
        raise ValueError("日历来源未完成：" + "、".join(failures))
    return len(symbols), len(rows)
