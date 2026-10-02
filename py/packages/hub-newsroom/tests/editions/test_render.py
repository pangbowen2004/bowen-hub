"""邮件结构、真实正文计数、链接安全与金融事实的边界。"""

from dataclasses import replace

import pytest

from hub_contracts import (
    Edition,
    EditionLede,
    NewsArticlesSection,
    NewsInternationalSection,
    NewsSnapshotSection,
    WatchItem,
)
from hub_core.calendar import NyseCalendar
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline import build_edition, trim_edition
from hub_newsroom.render.mail import Link, RenderContext, body_text, render_mail, safe_link

from .helpers import fixture


def sample(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> tuple[Edition, RenderContext]:
    now, data, history = fixture("morning")
    value = build_edition("morning", now, data, settings, watchlist, calendar, history).edition
    assert value
    return value, RenderContext(settings, watchlist, console_url="https://console.test/news/id")


@pytest.mark.parametrize(
    "url",
    [
        "javascript:alert(1)",
        "data:text/html,x",
        "https://user:secret@site.test",
        "https://site.test/\nfoo",
        "https:\\evil.test",
        "https://[invalid",
    ],
)
def test_unsafe_url_omitted(url: str) -> None:
    assert safe_link("原文", url) is None


def test_html_escape_inline_table_anchors_and_budget(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    edition, context = sample(settings, calendar, watchlist)
    section = next(s for s in edition.sections if isinstance(s, NewsArticlesSection))
    section.items[0].data.article.title = '<script>alert("x")</script>'
    section.items[0].data.article.url = "javascript:alert(1)"
    snapshot = next(s for s in edition.sections if isinstance(s, NewsSnapshotSection))
    snapshot.items[0].data.watchlist[0].change = -0.03
    result = render_mail(edition, context, "测试 <标题>")
    assert "<script>" not in result.html
    assert "&lt;script&gt;" in result.html
    assert "javascript:" not in result.html
    assert "<table" in result.html
    assert "max-width:640px" in result.html.replace(" ", "")
    assert "<style" not in result.html
    assert "display:flex" not in result.html
    assert "display:grid" not in result.html
    assert 'href="#' in result.html
    assert 'id="' in result.html
    assert "color: #c53d3d" in result.html
    assert "color: #24744e" in result.html
    assert result.body_chars == len(body_text(edition, context))
    assert "https://" not in body_text(edition, context)
    assert "本期未调用 AI" not in body_text(edition, context)
    longer = replace(
        context, console_url="https://console.test/" + "a" * 5000, fallbacks=("x" * 5000,)
    )
    assert render_mail(edition, longer, "测试").body_chars == result.body_chars


def test_renderer_does_not_modify_input(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    edition, context = sample(settings, calendar, watchlist)
    before = edition.model_dump_json()
    render_mail(edition, context, "测试")
    assert edition.model_dump_json() == before


def test_budget_removes_whole_rows_not_text(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    edition, context = sample(settings, calendar, watchlist)
    settings = settings.model_copy(deep=True)
    settings.newsroom.editions["morning"].readingBudgetChars = len(body_text(edition, context)) - 5
    before = {item.id: item.model_dump() for section in edition.sections for item in section.items}
    trimmed = trim_edition(edition, settings, lambda row: body_text(row, context))
    assert trimmed.removed_ids
    assert trimmed.body_chars <= settings.newsroom.editions["morning"].readingBudgetChars
    for section in trimmed.edition.sections:
        for item in section.items:
            if not isinstance(section, NewsInternationalSection):
                assert item.model_dump() == before[item.id]


def test_title_only_does_not_show_ai_summaries(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    edition, context = sample(settings, calendar, watchlist)
    edition.lede = EditionLede(lines=["不得显示的AI导语"], generatedBy=None)
    for section in edition.sections:
        if isinstance(section, NewsArticlesSection):
            for item in section.items:
                item.data.summary = "不得显示的AI摘要"
    rendered = render_mail(edition, replace(context, headline_only=True), "测试")
    assert "不得显示" not in rendered.text
    assert "标题清单版" in rendered.text
    assert "原文 →" in rendered.text


def test_safe_url_in_text_and_html() -> None:
    assert safe_link("原文", "https://source.test/a?q=1#part") == Link(
        "原文", "https://source.test/a?q=1#part"
    )


def test_missing_calendar_source_does_not_assert_no_schedule(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    from datetime import UTC, datetime

    from hub_contracts import NewsCalendarSection, NewsSourceHealth

    edition, context = sample(settings, calendar, watchlist)
    edition.sections = [NewsCalendarSection(kind="calendar", title="今晚日程", items=[])]
    edition.sources = [
        NewsSourceHealth(
            id="fred-calendar", checkedAt=datetime.now(UTC), status="failed", error="HTTP 503"
        )
    ]
    mail = render_mail(edition, context, "测试")
    assert "未能确认今晚安排" in mail.text
    assert "今晚没有重要日程" not in mail.text
    edition.sources = []
    assert "今晚没有重要日程" in render_mail(edition, context, "测试").text


def test_point_sources_link_once_and_visible_label_counts(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    from hub_contracts import NewsTickerSection, TickerDigestPoint

    edition, context = sample(settings, calendar, watchlist)
    section = next(s for s in edition.sections if isinstance(s, NewsTickerSection))
    edition.sections = [section]
    section.items = section.items[:1]
    digest = section.items[0].data
    digest.sourceIds = []
    digest.points = [TickerDigestPoint(text="周报事实", sourceIds=["point", "point"])]
    context = replace(context, references={"point": Link("可见来源标题", "https://source.test/a")})
    text = body_text(edition, context)
    assert text.count("可见来源标题") == 1
    assert "https://source.test" not in text
    larger = replace(
        context, references={"point": Link("可见来源标题加长", "https://source.test/a")}
    )
    assert len(body_text(edition, larger)) - len(text) == 2
    assert render_mail(edition, context, "测试").text.count("https://source.test/a") == 1
