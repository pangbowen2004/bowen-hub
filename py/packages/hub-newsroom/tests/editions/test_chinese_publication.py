"""中英文混合版次不得夹带失败条目；零中文不能借行情/日程发送。"""

import asyncio
from datetime import UTC, date, datetime

import pytest

from hub_contracts import NewsArticlesSection, NewsInternationalSection, WatchItem
from hub_core.calendar import NyseCalendar
from hub_newsroom.common.chinese import chinese_edition
from hub_newsroom.common.settings import Settings
from hub_newsroom.editions.service import Options, PublicationError
from hub_newsroom.pipeline.windows import calendar_range, edition_window
from hub_newsroom.render.mail import render_mail

from .test_publish import publisher
from .test_render import sample


def test_mixed_chinese_and_english_are_filtered_without_mutating_source(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    edition, context = sample(settings, calendar, watchlist)
    section = next(s for s in edition.sections if isinstance(s, NewsArticlesSection))
    item = section.items[0]
    item.data.article.title = "An English source headline"
    item.data.summary = "公司公布新的项目进展。项目将按计划推进。"
    item.data.whyItMatters = "An English fallback reason"
    rejected = item.model_copy(deep=True)
    rejected.id = "english-fallback"
    rejected.data.summary = "English fallback summary"
    section.items.append(rejected)
    for group in edition.sections:
        if isinstance(group, NewsInternationalSection):
            for entry in group.items:
                for row in [*entry.data.top5, *entry.data.briefs]:
                    row.data.summary = None
    before = edition.model_dump_json()
    filtered, count = chinese_edition(edition)
    assert count == 1
    assert edition.model_dump_json() == before
    assert all(row.id != "english-fallback" for s in filtered.sections for row in s.items)
    mail = render_mail(filtered, context, "中文测试")
    assert "公司公布新的项目进展" in mail.html
    assert "An English" not in mail.text
    assert "English fallback" not in mail.text
    assert "↗" in mail.text


def test_no_ai_cannot_send_a_headline_only_email(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, _, transport = publisher("morning", settings, calendar, watchlist)
    with pytest.raises(PublicationError, match="未发送"):
        asyncio.run(service.publish(Options("morning", no_ai=True)))
    assert not transport.messages
    assert not store.htmls
    assert transport.notifications
    assert store.runs[-1].status == "failed"


@pytest.mark.parametrize("hour", [0, 5, 15])
def test_monday_weekly_uses_completed_us_week_even_if_morning_is_delayed(
    hour: int, settings: Settings, calendar: NyseCalendar
) -> None:
    now = datetime(2026, 10, 5, hour, tzinfo=UTC)
    plan = edition_window("weekly", now, settings, calendar)
    assert plan.start == datetime(2026, 9, 28, 4, tzinfo=UTC)
    assert plan.sessions == (
        *tuple(date(2026, 9, day) for day in [28, 29, 30]),
        date(2026, 10, 1),
        date(2026, 10, 2),
    )
    assert calendar_range(plan, settings) == (date(2026, 10, 5), date(2026, 10, 9))
