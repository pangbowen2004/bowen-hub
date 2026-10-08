"""月历范围、真实来源边界及不重发版次的离线测试。"""

from datetime import date

import httpx
import pytest
import yaml
from pydantic import SecretStr
from typer.testing import CliRunner

from hub_cli.main import create_app
from hub_contracts import CalendarEvent, WatchItem
from hub_core.http import HttpClient
from hub_core.settings import Settings as EnvironmentSettings
from hub_newsroom.common.settings import Settings
from hub_newsroom.editions.calendar import calendar_events, month_range, refresh_calendar

from .helpers import ROOT, FakeStore


def test_month_range_year_boundary() -> None:
    assert month_range(date(2026, 12, 31)) == (date(2026, 12, 1), date(2027, 1, 31))
    assert month_range(date(2028, 1, 1)) == (date(2028, 1, 1), date(2028, 2, 29))


def test_calendar_only_active_stocks_and_real_fomc_decisions(
    settings: Settings, watchlist: list[WatchItem]
) -> None:
    rows = [
        CalendarEvent(
            kind="earnings",
            date=date(2026, 10, 29),
            fredReleaseId=None,
            at=None,
            title=symbol,
            tickers=[symbol],
            timing=None,
            importance="unspecified",
        )
        for symbol in ["NVDA", "BTC", "TSMX", "UNKNOWN"]
    ]
    rows += [
        CalendarEvent(
            kind="macro",
            date=date(2026, 10, day),
            fredReleaseId=101,
            at=None,
            title=settings.newsroom.calendar.fomcRelease.label,
            tickers=[],
            timing="14:00",
            importance="high",
        )
        for day in [7, 27, 28]
    ]
    result = calendar_events(rows, watchlist, settings)
    assert [(event.kind, event.date, event.tickers) for event in result] == [
        ("fomc", date(2026, 10, 28), []),
        ("earnings", date(2026, 10, 29), ["NVDA"]),
    ]


def test_refresh_per_stock_aliases_unknown_time_and_api_only(
    settings: Settings, watchlist: list[WatchItem]
) -> None:
    requested: list[str] = []

    def replay(request: httpx.Request) -> httpx.Response:
        if request.url.host == "finnhub.io":
            symbol = request.url.params["symbol"]
            requested.append(symbol)
            return httpx.Response(
                200,
                json={
                    "earningsCalendar": [
                        {
                            "symbol": "2330.TW" if symbol == "TSM" else symbol,
                            "date": "2026-10-29",
                            "hour": "amc" if symbol in {"TSM", "NVDA"} else "dmh",
                        }
                    ]
                },
            )
        if request.url.path.endswith("/releases"):
            return httpx.Response(
                200,
                json={
                    "count": 3,
                    "releases": [
                        {"id": 10, "name": "Consumer Price Index"},
                        {"id": 50, "name": "Employment Situation"},
                        {"id": 101, "name": "FOMC Press Release"},
                    ],
                },
            )
        return httpx.Response(
            200,
            json={
                "count": 1,
                "release_dates": [
                    {
                        "date": "2026-10-28"
                        if request.url.params["release_id"] == "101"
                        else "2026-10-14"
                    }
                ],
            },
        )

    store = FakeStore(watchlist)
    with httpx.Client(transport=httpx.MockTransport(replay)) as client:
        http = HttpClient(client=client, retries=0)
        stocks, count = refresh_calendar(
            date(2026, 10, 7),
            EnvironmentSettings(
                fred_api_key=SecretStr("offline"), finnhub_api_key=SecretStr("offline")
            ),
            settings,
            store,
            http,
        )
    assert stocks == len(requested) == 4
    assert set(requested) == {"NVDA", "TSM", "AAPL", "TEST"}
    assert count == 7
    saved = store.batches["/v1/internal/news/calendar/batch"]
    assert all(isinstance(event, CalendarEvent) for event in saved)
    earnings = [
        event for event in saved if isinstance(event, CalendarEvent) and event.kind == "earnings"
    ]
    assert all(event.at is None for event in earnings)
    assert next(event for event in earnings if event.tickers == ["NVDA"]).timing == "amc"
    assert next(event for event in earnings if event.tickers == ["TSM"]).timing is None
    assert any(event.tickers == ["TSM"] for event in earnings)
    assert not store.items
    assert not store.htmls
    assert not store.runs
    assert set(store.batches) == {"/v1/internal/news/calendar/batch"}


def test_missing_credentials_fails_without_touching_editions(
    settings: Settings, watchlist: list[WatchItem]
) -> None:
    store = FakeStore(watchlist)
    with pytest.raises(ValueError, match="日历来源未完成"):
        refresh_calendar(date(2026, 10, 7), EnvironmentSettings(), settings, store, HttpClient())
    assert store.events.count("source-health") == 2
    assert not store.items
    assert not store.htmls


def test_calendar_cli_help_and_runs_after_mail() -> None:
    result = CliRunner().invoke(create_app(), ["news", "calendar", "--help"])
    assert result.exit_code == 0
    workflow = yaml.load(
        (ROOT / ".github/workflows/news-morning.yml").read_text(), Loader=yaml.BaseLoader
    )
    steps = workflow["jobs"]["publish"]["steps"]
    calendar_index = next(index for index, step in enumerate(steps) if "刷新控制台" in step["name"])
    publish_index = next(index for index, step in enumerate(steps) if "发送早报" in step["name"])
    assert calendar_index > publish_index
    run = steps[calendar_index]["run"]
    assert "args=(news calendar)" in run
    assert "--force" not in run
