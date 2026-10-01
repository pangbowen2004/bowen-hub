"""合成输入的确定性回归；不抓HTTP、不调用AI、不写金融生产数据。"""

import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Literal
from zoneinfo import ZoneInfo

import pytest

from hub_contracts import (
    Article,
    CalendarEvent,
    Edition,
    EditionEmail,
    EditionLede,
    EditionWindow,
    Filing,
    FilingExhibit,
    InsiderTrade,
    NewsArticlesSection,
    NewsCloseSnapshot,
    NewsEarningsSection,
    NewsFilingsSection,
    NewsInsidersSection,
    NewsInternationalSection,
    NewsNewsInternationalItem,
    NewsQuietSection,
    NewsSnapshotSection,
    NewsTickerSection,
    WatchItem,
)
from hub_core.calendar import NyseCalendar
from hub_core.protocols import PriceBar
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline import (
    EarningsRelease,
    PipelineInput,
    associate_tickers,
    build_edition,
    close_snapshot,
    cluster_articles,
    earnings_facts,
    edition_window,
    insider_text,
    international_score,
    normalise_article,
    normalise_url,
    prepare_calendar,
    rule_score,
    rule_topic,
    sector_sync,
    select_insiders,
    trim_to_budget,
)
from hub_newsroom.pipeline.articles import keyword_matches, same_event, title_tokens, utc
from hub_newsroom.pipeline.facts import eligible_filing, filing_label, filing_prompt
from hub_newsroom.pipeline.international import international_pipeline
from hub_newsroom.pipeline.windows import EditionKind, calendar_range

NOW = datetime(2026, 9, 29, 23, 10, tzinfo=UTC)  # 新加坡周三早报


def article(
    id: str = "nvidia",
    title: str = "Nvidia announces synthetic test earnings",
    source: str = "alpaca-news",
    at: datetime = NOW - timedelta(hours=3),
    symbols: list[str] | None = None,
    url: str | None = None,
) -> Article:
    return Article(
        id=id,
        sourceId=source,
        kind="news",
        title=title,
        url=url or f"https://example.test/{id}",
        publishedAt=at,
        summary="合成测试正文",
        lang="en",
        tickers=symbols or [],
        topics=[],
        paywall="none",
        clusterId=None,
    )


def filing(
    form: str = "8-K",
    items: list[str] | None = None,
    symbol: str = "NVDA",
    accession: str = "synthetic-001",
    at: datetime = NOW - timedelta(hours=2),
) -> Filing:
    return Filing(
        accession=accession,
        cik="0000000001",
        ticker=symbol,
        form=form,
        filedAt=at,
        items=items or [],
        url=f"https://example.test/{accession}",
        exhibits=[FilingExhibit(name="EX-99.1", url=f"https://example.test/{accession}/exhibit")],
    )


def trade(code: str, value: float | None, index: int = 0) -> InsiderTrade:
    return InsiderTrade(
        accession="synthetic-form4",
        transactionIndex=index,
        ticker="NVDA",
        insider="测试人",
        role="测试职位",
        code=code,
        shares=100,
        priceUsd=12.3456,
        valueUsd=value,
        filedAt=NOW - timedelta(hours=1),
        url="https://example.test/form4",
    )


def event(
    day: date,
    kind: Literal["macro", "earnings", "fomc"] = "macro",
    title: str = "Consumer Price Index",
    symbols: list[str] | None = None,
    timing: str | None = None,
) -> CalendarEvent:
    return CalendarEvent(
        kind=kind,
        date=day,
        fredReleaseId=10 if kind == "macro" else None,
        at=None,
        title=title,
        tickers=symbols or [],
        timing=timing,
        importance="high",
    )


def history_morning(at: datetime = NOW, sent: datetime | None = NOW) -> Edition:
    return Edition(
        id="morning-2026-09-30",
        kind="morning",
        date=at.astimezone(ZoneInfo("Asia/Singapore")).date(),
        window=EditionWindow(fromAt=at - timedelta(hours=24), toAt=at),
        generatedAt=at,
        lede=None,
        sections=[],
        sources=[],
        aiUsage=None,
        email=EditionEmail(sentAt=sent) if sent else None,
    )


@pytest.mark.parametrize(
    ("url", "expected"),
    [
        (
            "http://ExAmPlE.test/path/?utm_a=a&x=1&fbclid=q&gclid=z#anchor",
            "https://example.test/path?x=1",
        ),
        ("https://example.test/", "https://example.test"),
        (
            "http://example.test:8080/a/?q=hello%20world&empty=",
            "https://example.test:8080/a?q=hello+world&empty=",
        ),
        ("http://[::1]:80/a/?UTM_SOURCE=x", "https://[::1]/a"),
    ],
)
def test_url(url: str, expected: str) -> None:
    assert normalise_url(url) == expected


@pytest.mark.parametrize("url", ["/relative", "file:///private", "https:///bad"])
def test_reject_non_http(url: str) -> None:
    with pytest.raises(ValueError, match="完整"):
        normalise_url(url)


def test_normalise(settings: Settings, watchlist: list[WatchItem]) -> None:
    original = article(
        title="Nvidia and $TSMX partner",
        at=NOW.astimezone(ZoneInfo("Asia/Singapore")),
        source="cnbc-top",
    )
    result = normalise_article(original, settings, watchlist)
    assert result.publishedAt.utcoffset() == timedelta(0)
    assert result.paywall == "metered"
    assert result.tickers == ["NVDA", "TSM"]
    assert original.tickers == []
    assert associate_tickers(article(title="测试公司", symbols=["BTC"]), watchlist).tickers == [
        "BTC",
        "TEST",
    ]
    with pytest.raises(ValueError, match="时区"):
        utc(datetime(2026, 1, 1))


@pytest.mark.parametrize(
    ("text", "word", "match"),
    [
        ("Musk Warsh", "us", False),
        ("Musk Warsh", "war", False),
        ("U.S. markets", "u.s.", True),
        ("NVIDIA export controls", "export control", True),
        ("中国芯片", "芯片", True),
        ("AI chip", "ai", True),
        ("paid", "ai", False),
    ],
)
def test_keyword_boundaries(text: str, word: str, match: bool) -> None:
    assert keyword_matches(text, word) is match


def test_tokens_and_cluster_representative(settings: Settings) -> None:
    assert title_tokens("AI is chip 芯片厂") == {"chip", "芯片", "片厂"}
    first = article("first", title="Synthetic company changes policy", source="cnbc-top")
    second = article("second", title="Synthetic company changes policy", source="marketwatch-top")
    best = article("best", title="Synthetic company changes policy", source="fed-monetary")
    result = cluster_articles([second, first, best], settings)
    assert len(result) == 1
    assert result[0].representative.id == "best"
    assert [a.id for a in result[0].other_reports] == ["first", "second"]
    assert result == cluster_articles([best, first, second], settings)
    assert result[0].id == "event:best"
    assert cluster_articles([first, second], settings)[0].representative.id == "first"


def test_same_ticker_strict_six_hours(settings: Settings) -> None:
    left = article("a", "alpha beta gamma delta omega", symbols=["NVDA"])
    right = article(
        "b",
        "alpha beta gamma different information",
        symbols=["NVDA"],
        at=left.publishedAt + timedelta(hours=5, minutes=59),
    )
    assert same_event(left, right, settings)
    assert not same_event(
        left,
        right.model_copy(update={"publishedAt": left.publishedAt + timedelta(hours=6)}),
        settings,
    )
    assert not same_event(left, right, settings, international=True)
    assert same_event(left, right.model_copy(update={"url": left.url}), settings)


def test_rule_score_and_no_future(settings: Settings, watchlist: list[WatchItem]) -> None:
    a = article(title="Nvidia AI earnings merger partnership", symbols=["NVDA"])
    assert rule_score(a, NOW, settings, watchlist) == 12  # 2来源+2时效+4关键词+3自选+1大市值
    assert rule_score(a.model_copy(update={"paywall": "metered"}), NOW, settings, watchlist) == 11
    assert rule_score(a.model_copy(update={"paywall": "hard"}), NOW, settings, watchlist) == 9
    assert (
        rule_score(
            a.model_copy(update={"publishedAt": NOW - timedelta(hours=13)}),
            NOW,
            settings,
            watchlist,
        )
        == 10
    )
    with pytest.raises(ValueError, match="未来"):
        rule_score(
            a.model_copy(update={"publishedAt": NOW + timedelta(seconds=1)}),
            NOW,
            settings,
            watchlist,
        )


@pytest.mark.parametrize(
    ("title", "source", "topic"),
    [
        ("Trump China stock policy", "bbc-world", "us_china"),
        ("Fed tariff", "bbc-world", "markets_macro"),
        ("AI chips", "bbc-world", "ai_tech"),
        ("ordinary synthetic report", "36kr", "china_business"),
        ("ordinary synthetic report", "bbc-world", "other"),
    ],
)
def test_topic(title: str, source: str, topic: str, settings: Settings) -> None:
    assert rule_topic(article(title=title, source=source), settings) == topic


def test_international_window_category_cap_and_top_diversity(settings: Settings) -> None:
    rows = [
        article(f"china{i}", f"Trump China synthetic unique {i * 123457}", source="bbc-world")
        for i in range(8)
    ]
    # 标题相似不应把人为重复合成用例当作八件新闻：关闭相似聚类只为单测分类条数。
    rules = settings.model_copy(deep=True)
    rules.international.pipeline.titleSimilarity = 1.01
    rows += [
        article("old", "Old AI report", source="bbc-world", at=NOW - timedelta(hours=37)),
        article("future", "Future AI report", source="bbc-world", at=NOW + timedelta(seconds=1)),
        article("technology", "OpenAI synthetic experiment", source="the-verge"),
    ]
    result = international_pipeline(rows, NOW, rules)
    assert len([a for a in result.candidates if a.id.startswith("china")]) == 5
    assert len([i for i in result.data.top5 if i.data.topic == "us_china"]) == 2
    assert "old" not in {c.id for c in result.candidates}
    assert "future" not in {c.id for c in result.candidates}
    assert result.data.overview.startswith("今日新闻主线集中在 ")
    assert (
        international_score(article(title="Trump China stock", source="bbc-world"), settings) == 12
    )


def test_morning_window_success_only_and_cap(settings: Settings, calendar: NyseCalendar) -> None:
    old = NOW - timedelta(days=4)
    sent = history_morning(old, old)
    failed = history_morning(NOW - timedelta(hours=1), None)
    plan = edition_window("morning", NOW, settings, calendar, [sent, failed])
    assert plan.start == NOW - timedelta(hours=72)
    assert edition_window("morning", NOW, settings, calendar).start == NOW - timedelta(hours=24)
    recent = history_morning(NOW - timedelta(hours=22), NOW - timedelta(hours=21))
    assert edition_window("morning", NOW, settings, calendar, [recent]).start == NOW - timedelta(
        hours=21
    )


def test_premarket_same_day_and_holiday(settings: Settings, calendar: NyseCalendar) -> None:
    now = datetime(2026, 9, 30, 12, 45, tzinfo=UTC)
    assert edition_window("premarket", now, settings, calendar, [history_morning()]).start == NOW
    with pytest.raises(ValueError, match="当天早报"):
        edition_window("premarket", now, settings, calendar)
    holiday = datetime(2026, 11, 26, 13, 45, tzinfo=UTC)
    assert edition_window("premarket", holiday, settings, calendar).skip


@pytest.mark.parametrize(
    ("at", "mode"),
    [
        ("2026-10-03T23:10:00+00:00", "weekend"),
        ("2026-10-04T23:10:00+00:00", "lookahead"),
        ("2026-11-26T23:10:00+00:00", "weekend"),
        ("2026-09-29T23:10:00+00:00", "regular"),
    ],
)
def test_morning_modes(at: str, mode: str, settings: Settings, calendar: NyseCalendar) -> None:
    assert edition_window("morning", datetime.fromisoformat(at), settings, calendar).mode == mode


@pytest.mark.parametrize(("day", "hour"), [(date(2026, 7, 1), 20), (date(2026, 12, 1), 21)])
def test_macro_dst(day: date, hour: int, settings: Settings, watchlist: list[WatchItem]) -> None:
    result = prepare_calendar(
        [event(day), event(day, title="Unapproved macro")], day, day, settings, watchlist
    )
    assert len(result) == 1
    assert result[0].at is not None
    assert result[0].at.hour == hour
    assert result[0].at.minute == 30
    assert result[0].title == "CPI"
    assert result[0].fredReleaseId == 10


def test_fomc_cross_midnight_and_earnings_unknown_time(
    settings: Settings, watchlist: list[WatchItem]
) -> None:
    day = date(2026, 12, 9)
    events = [
        event(day, "earnings", "测试财报", ["NVDA", "OUTSIDE"], "amc"),
        event(day, "earnings", "盘前测试", ["TSM"], "bmo"),
    ]
    result = prepare_calendar(events, day, day, settings, watchlist, premarket=True)
    assert len(result) == 2
    earnings = next(e for e in result if e.kind == "earnings")
    assert earnings.at is None
    assert earnings.tickers == ["NVDA"]
    fomc = next(e for e in result if e.kind == "fomc")
    assert fomc.at is not None
    assert fomc.at.date() == date(2026, 12, 10)
    assert fomc.at.hour == 3
    assert "经济预测" in fomc.title


@pytest.mark.parametrize(
    ("code", "value", "selected"),
    [
        ("P", None, True),
        ("P", 1, True),
        ("S", 999999, False),
        ("S", 1000000, True),
        ("S", None, False),
        ("M", 2000000, False),
        ("F", 2000000, False),
    ],
)
def test_form4(code: str, value: float | None, selected: bool, settings: Settings) -> None:
    assert bool(select_insiders([trade(code, value)], settings, {"NVDA"})) is selected
    assert not select_insiders([trade(code, value)], settings, {"TSM"})


def test_form4_natural_key_and_decimal(settings: Settings) -> None:
    rows = [trade("P", None), trade("P", None), trade("S", 1000000, 1)]
    assert len(select_insiders(rows, settings, {"NVDA"})) == 2
    assert "12.3456" in insider_text(rows[0], settings)
    assert "合计金额未提供" in insider_text(rows[0], settings)


@pytest.mark.parametrize(
    ("form", "selected"),
    [
        ("8-K", True),
        ("6-K", True),
        ("20-F", True),
        ("10-Q/A", True),
        ("424B5", True),
        ("SC 13G/A", True),
        ("SCHEDULE 13D/A", True),
        ("4", False),
        ("3", False),
    ],
)
def test_filing_forms(form: str, selected: bool, settings: Settings) -> None:
    assert eligible_filing(filing(form), settings) is selected


def test_filing_digest_only_authorized_items(settings: Settings) -> None:
    f = filing(items=["5.02", "2.02", "UNKNOWN"])
    assert filing_label(f, settings) == "董事或高管变动、财报、Item UNKNOWN"
    assert filing_prompt(f, "真实原文由调用方提供", "合成公司", settings) is not None
    assert filing_prompt(f, None, "合成公司", settings) is None
    assert filing_prompt(filing(items=["2.02", "9.01"]), "原文", "公司", settings) is None
    assert filing_prompt(filing("6-K"), "原文", "公司", settings) is None


def test_earnings_prefer_actual_exhibit_and_keep_numbers(
    settings: Settings, watchlist: list[WatchItem]
) -> None:
    f = filing(items=["2.02"])
    fallback = EarningsRelease("NVDA", "https://example.test/news", "合成新闻 123", NOW)
    result = earnings_facts(
        [f], {f.exhibits[0].url: "合成新闻稿 revenue 123.456 USD"}, [fallback], watchlist, settings
    )
    assert len(result) == 1
    assert result[0].prompt.sourceKind == "press_release"
    assert result[0].prompt.sourceText == "合成新闻稿 revenue 123.456 USD"
    assert result[0].card.figures == []
    assert result[0].card.period == ""
    assert result[0].card.generatedBy is None
    assert result[0].card.sourceAccession == f.accession
    fallback_result = earnings_facts([f], {}, [fallback], watchlist, settings)
    assert fallback_result[0].prompt.sourceKind == "news"
    assert fallback_result[0].card.sourceAccession is None
    foreign = filing("6-K", symbol="TSM").model_copy(
        update={"exhibits": [FilingExhibit(name="EX-99.2", url="https://example.test/foreign")]}
    )
    assert (
        earnings_facts([foreign], {"https://example.test/foreign": "123"}, [], watchlist, settings)[
            0
        ].card.symbol
        == "TSM"
    )


@pytest.mark.parametrize(
    ("change", "sector", "expected"),
    [
        (0.03, 0.02, True),
        (-0.03, -0.02, True),
        (0.03, -0.02, False),
        (0.03, 0.01999, False),
        (0, 0.02, False),
        (None, 0.02, None),
        (0.03, None, None),
    ],
)
def test_sector_fact(
    change: float | None, sector: float | None, expected: bool | None, settings: Settings
) -> None:
    assert sector_sync(change, sector, settings) is expected


def test_snapshot_missing_endpoint_no_backfill(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    bars = [
        PriceBar("NVDA", date(2026, 9, 25), 100, None),
        PriceBar("NVDA", date(2026, 9, 29), 103, 0.03),
        PriceBar("TSMX", date(2026, 9, 28), 100, None),
        PriceBar("TSMX", date(2026, 9, 29), 105, 0.05),
    ]
    result = close_snapshot(bars, date(2026, 9, 29), calendar, watchlist, settings)
    assert [p.symbol for p in result.watchlist] == ["TSMX"]
    assert result.watchlist[0].change == pytest.approx(0.05)
    assert result.treasury10Year is None
    assert result.vix is None


def test_snapshot_weekly_and_crypto_utc(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    bars = [
        PriceBar("NVDA", date(2026, 9, 25), 100, None),
        PriceBar("NVDA", date(2026, 10, 2), 110, None),
        PriceBar("BTC", date(2026, 9, 28), 100, None),
        PriceBar("BTC", date(2026, 9, 29), 101, None),
    ]
    sessions = calendar.sessions(date(2026, 9, 28), date(2026, 10, 2))
    weekly = close_snapshot(
        bars, date(2026, 10, 2), calendar, watchlist, settings, week_sessions=sessions
    )
    assert weekly.watchlist[0].change == pytest.approx(0.1)
    daily = close_snapshot(
        bars, date(2026, 9, 29), calendar, watchlist, settings, crypto_day=date(2026, 9, 29)
    )
    assert daily.watchlist[0].symbol == "BTC"
    assert daily.watchlist[0].change == pytest.approx(0.01)


def input_data(kind: EditionKind = "morning") -> tuple[datetime, PipelineInput]:
    path = Path(__file__).parent / "data" / f"{kind}-input.json"
    payload = json.loads(path.read_text())
    return datetime.fromisoformat(payload["now"]), PipelineInput(
        articles=[Article.model_validate(a) for a in payload.get("articles", [])],
        filings=[Filing.model_validate(f) for f in payload.get("filings", [])],
        insiders=[InsiderTrade.model_validate(t) for t in payload.get("insiders", [])],
        events=[CalendarEvent.model_validate(e) for e in payload.get("events", [])],
        exhibit_texts=payload.get("exhibit_texts", {}),
        filing_texts=payload.get("filing_texts", {}),
        snapshot=NewsCloseSnapshot.model_validate(payload["snapshot"])
        if "snapshot" in payload
        else None,
        snapshot_session=date.fromisoformat(payload["snapshot_session"])
        if "snapshot_session" in payload
        else None,
    )


def synthetic_input() -> PipelineInput:
    return input_data()[1]


def test_ticker_three_percent_and_sorting(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    result = build_edition("morning", NOW, synthetic_input(), settings, watchlist, calendar)
    assert result.edition is not None
    section = next(s for s in result.edition.sections if isinstance(s, NewsTickerSection))
    assert [i.data.symbol for i in section.items] == ["NVDA", "TSM"]
    assert section.items[1].data.whatHappened == "未找到直接相关消息"
    assert section.items[1].data.sourceIds == []
    assert section.items[1].data.withSector is True
    quiet = next(s for s in result.edition.sections if isinstance(s, NewsQuietSection))
    assert quiet.items[0].data.symbols == ["AAPL", "TEST", "BTC"]
    assert [c.id for c in result.us_rank_input.candidates] == ["market"]
    assert "synthetic-001" in result.filing_inputs
    assert result.ticker_inputs["NVDA"].articles[0].id == "nvidia"
    assert result.earnings_inputs["earnings:synthetic-001"].sourceText == "合成财报原文 123.456"
    assert result.edition.lede is None
    assert result.edition.aiUsage is None


def test_premarket_prices_not_selection(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    at = datetime(2026, 9, 30, 12, 45, tzinfo=UTC)
    result = build_edition(
        "premarket", at, synthetic_input(), settings, watchlist, calendar, [history_morning()]
    )
    assert result.edition is not None
    assert not any(isinstance(s, NewsSnapshotSection) for s in result.edition.sections)
    assert result.ticker_inputs == {}  # 所有消息都在早报之前；3%价格不能入选盘前。
    holiday = build_edition(
        "premarket",
        datetime(2026, 11, 26, 13, 45, tzinfo=UTC),
        PipelineInput(),
        settings,
        watchlist,
        calendar,
    )
    assert holiday.edition is None
    assert holiday.plan.skip


def test_weekly_from_saved_editions_no_duplicate(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    morning = build_edition(
        "morning", NOW, synthetic_input(), settings, watchlist, calendar
    ).edition
    assert morning is not None
    at = datetime(2026, 10, 3, 1, 10, tzinfo=UTC)
    result = build_edition(
        "weekly",
        at,
        PipelineInput(articles=synthetic_input().articles, filings=synthetic_input().filings),
        settings,
        watchlist,
        calendar,
        [morning, morning],
    )
    assert result.edition is not None
    assert result.plan.sessions == tuple(calendar.sessions(date(2026, 9, 28), date(2026, 10, 2)))
    assert calendar_range(result.plan, settings) == (date(2026, 10, 5), date(2026, 10, 9))
    assert (
        len(next(s for s in result.edition.sections if isinstance(s, NewsEarningsSection)).items)
        == 1
    )
    assert (
        len(next(s for s in result.edition.sections if isinstance(s, NewsFilingsSection)).items)
        == 1
    )
    assert (
        len(next(s for s in result.edition.sections if isinstance(s, NewsInsidersSection)).items)
        == 1
    )
    assert (
        next(s for s in result.edition.sections if isinstance(s, NewsArticlesSection)).kind
        == "international_weekly"
    )
    assert not result.earnings_inputs


def test_reject_stale_snapshot(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    data = PipelineInput(snapshot=synthetic_input().snapshot, snapshot_session=date(2026, 9, 28))
    with pytest.raises(ValueError, match="最新收盘"):
        build_edition("morning", NOW, data, settings, watchlist, calendar)


def test_budget_deletes_whole_lowest_item(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    edition = build_edition(
        "morning", NOW, synthetic_input(), settings, watchlist, calendar
    ).edition
    assert edition is not None

    # 模拟T13邮件正文渲染，URL和页脚均不在这个回调；每条100字固定可核算。
    def body(e: Edition) -> str:
        return "甲" * sum(len(s.items) * 100 for s in e.sections)

    original = edition.model_dump_json()
    result = trim_to_budget(edition, 400, body)
    assert result.body_chars <= 400
    assert edition.model_dump_json() == original
    assert "snapshot" in result.removed_ids
    assert "ticker:NVDA" not in result.removed_ids
    result0 = trim_to_budget(edition, 0, body)
    assert result0.body_chars == 0
    impossible = edition.model_copy(
        update={"sections": [], "lede": EditionLede(lines=["长导语"], generatedBy=None)}
    )
    with pytest.raises(ValueError, match="非条目正文"):
        trim_to_budget(impossible, 1, lambda _: "长导语")


def test_budget_international_atomic(settings: Settings) -> None:
    rules = settings.model_copy(deep=True)
    rules.international.pipeline.titleSimilarity = 1.01
    result = international_pipeline(
        [
            article("high", "Trump China tariff", "bbc-world"),
            article("low", "ordinary synthetic story", "bbc-world"),
        ],
        NOW,
        rules,
    )
    edition = history_morning().model_copy(
        update={
            "sections": [
                NewsInternationalSection(
                    kind="international",
                    title="国际",
                    items=[NewsNewsInternationalItem(id="intl", data=result.data)],
                )
            ]
        }
    )

    def body(e: Edition) -> str:
        return "".join(
            i.id
            for s in e.sections
            if isinstance(s, NewsInternationalSection)
            for group in s.items
            for i in [*group.data.top5, *group.data.briefs]
        )

    trimmed = trim_to_budget(edition, len("high"), body)
    assert trimmed.removed_ids == ("low",)
    assert body(trimmed.edition) == "high"


@pytest.mark.parametrize("kind", ["morning", "premarket", "weekly"])
def test_edition_snapshots(
    kind: EditionKind, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    morning = build_edition(
        "morning", NOW, synthetic_input(), settings, watchlist, calendar
    ).edition
    assert morning is not None
    at, data = input_data(kind)
    result = build_edition(
        kind, at, data, settings, watchlist, calendar, [morning] if kind != "morning" else []
    )
    assert result.edition is not None
    actual = result.edition.model_dump(mode="json")
    path = Path(__file__).parent / "data" / f"{kind}.json"
    assert actual == json.loads(path.read_text())


@pytest.mark.parametrize(("day", "hour"), [(date(2026, 7, 1), 20), (date(2026, 12, 1), 21)])
def test_premarket_due_and_guard(
    day: date, hour: int, settings: Settings, calendar: NyseCalendar
) -> None:
    from hub_newsroom.pipeline.windows import premarket_due_at, premarket_in_guard

    due = premarket_due_at(day, calendar, settings)
    assert due is not None
    assert due.hour == hour
    assert due.minute == 45
    assert premarket_in_guard(due, calendar, settings)
    assert not premarket_in_guard(due - timedelta(minutes=11), calendar, settings)
    assert not premarket_in_guard(due + timedelta(minutes=31), calendar, settings)
    assert premarket_due_at(date(2026, 11, 26), calendar, settings) is None


def test_readonly_archive_titles(settings: Settings) -> None:
    from email.utils import parsedate_to_datetime

    path = Path(__file__).resolve().parents[5] / "fixtures/news/archive-sample.jsonl"
    row = json.loads(path.read_text().splitlines()[0])
    titles = row["top_5"]
    # 只读取既存标题/链接/明确发布日期，不把旧AI摘要当成新的事实，也不推断无时区timestamp。
    sample = Article(
        id="archive-title",
        sourceId="bbc-world",
        kind="news",
        title=titles[0]["title"],
        url=titles[0]["link"],
        publishedAt=parsedate_to_datetime(titles[0]["published"]),
        summary=None,
        lang="en",
        tickers=[],
        topics=[],
        paywall="none",
        clusterId=None,
    )
    assert rule_topic(sample, settings) == "us_china"
    assert normalise_url(sample.url).startswith("https://www.bbc.co.uk/")


def test_cluster_preserves_ticker_from_other_report(
    settings: Settings, watchlist: list[WatchItem], calendar: NyseCalendar
) -> None:
    high = article("highest", "Synthetic identical event", source="fed-monetary")
    low = article("lowest", "Synthetic identical event", source="alpaca-news", symbols=["NVDA"])
    result = build_edition(
        "morning", NOW, PipelineInput(articles=[low, high]), settings, watchlist, calendar
    )
    assert result.clusters[0].representative.id == "highest"
    assert result.clusters[0].representative.tickers == ["NVDA"]
    assert "NVDA" in result.ticker_inputs
    assert result.us_rank_input.candidates == []
    assert result.clusters[0].other_reports[0].id == "lowest"


def test_form4_alone_selects_ticker(
    settings: Settings, watchlist: list[WatchItem], calendar: NyseCalendar
) -> None:
    result = build_edition(
        "morning", NOW, PipelineInput(insiders=[trade("P", None)]), settings, watchlist, calendar
    )
    prompt = result.ticker_inputs["NVDA"]
    assert prompt.articles == []
    assert prompt.filings[0].id == "synthetic-form4:0"
    assert prompt.filings[0].form == "4"
    assert prompt.filings[0].digest is not None
    assert "12.3456" in prompt.filings[0].digest


def test_snapshot_exact_threshold_from_close(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    bars = [
        PriceBar("TEST", date(2026, 9, 28), 100, None),
        PriceBar("TEST", date(2026, 9, 29), 103, None),
    ]
    snapshot = close_snapshot(bars, date(2026, 9, 29), calendar, watchlist, settings)
    assert snapshot.watchlist[0].change == 0.03
    result = build_edition(
        "morning",
        NOW,
        PipelineInput(snapshot=snapshot, snapshot_session=date(2026, 9, 29)),
        settings,
        watchlist,
        calendar,
    )
    assert "TEST" in result.ticker_inputs


def test_budget_uses_config(settings: Settings) -> None:
    from hub_newsroom.pipeline import trim_edition

    edition = history_morning()
    result = trim_edition(edition, settings, lambda _: "甲" * 2500)
    assert result.body_chars == 2500
    with pytest.raises(ValueError, match="非条目正文"):
        trim_edition(edition, settings, lambda _: "甲" * 2501)


def test_weekend_omits_snapshot_and_move_only_ticker(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    at = datetime(2026, 10, 3, 23, 10, tzinfo=UTC)
    result = build_edition(
        "morning",
        at,
        PipelineInput(
            snapshot=synthetic_input().snapshot,
            articles=[
                article("weekend", "Nvidia synthetic weekend event", at=at - timedelta(hours=1))
            ],
        ),
        settings,
        watchlist,
        calendar,
    )
    assert result.edition is not None
    assert result.plan.mode == "weekend"
    assert list(result.ticker_inputs) == ["NVDA"]
    assert result.ticker_inputs["NVDA"].changeText is None
    assert not any(isinstance(s, NewsSnapshotSection) for s in result.edition.sections)


def test_premarket_market_cap(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    at = datetime(2026, 9, 30, 12, 45, tzinfo=UTC)
    rules = settings.model_copy(deep=True)
    rules.newsroom.thresholds.cluster.titleSimilarity = 1.01
    articles = [
        article(
            f"market-{i}",
            f"Independent synthetic market event {i}",
            at=at - timedelta(minutes=30),
            source="fed-monetary",
        )
        for i in range(8)
    ]
    result = build_edition(
        "premarket",
        at,
        PipelineInput(articles=articles),
        rules,
        watchlist,
        calendar,
        [history_morning()],
    )
    assert len(result.us_rank_input.candidates) == 5


def test_six_k_is_candidate_not_confirmed_earnings(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    foreign = filing("6-K", symbol="TSM")
    data = PipelineInput(
        filings=[foreign], exhibit_texts={foreign.exhibits[0].url: "合成普通业务公告 123"}
    )
    result = build_edition("morning", NOW, data, settings, watchlist, calendar)
    assert result.edition is not None
    assert not any(isinstance(s, NewsEarningsSection) for s in result.edition.sections)
    assert (
        result.earnings_candidates["earnings:synthetic-001:" + foreign.exhibits[0].url].confirmed
        is False
    )
    assert (
        result.earnings_inputs["earnings:synthetic-001:" + foreign.exhibits[0].url].sourceText
        == "合成普通业务公告 123"
    )
    assert result.lede_input is not None
    assert not any("已发布财报" in f.text for f in result.lede_input.facts)
    assert "TSM" in result.ticker_inputs  # 有公告，因此仍在自选股动态。


def test_source_failure_is_preserved_and_empty_calendar(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    from hub_contracts import NewsSourceHealth

    health = NewsSourceHealth(
        id="alpaca-news", checkedAt=NOW, status="failed", error="合成离线失败"
    )
    result = build_edition(
        "morning", NOW, PipelineInput(source_health=[health]), settings, watchlist, calendar
    )
    assert result.edition is not None
    assert result.edition.sources == [health]
    assert result.edition.sections[-1].title == "今晚没有重要日程"
    quiet = next(s for s in result.edition.sections if isinstance(s, NewsQuietSection))
    assert "TSMX" in quiet.items[0].data.symbols


def test_six_k_retains_all_exhibits_for_later_earnings_confirmation(
    settings: Settings, watchlist: list[WatchItem]
) -> None:
    foreign = filing("6-K", symbol="TSM").model_copy(
        update={
            "exhibits": [
                FilingExhibit(name="EX-99.1", url="https://example.test/ordinary"),
                FilingExhibit(name="EX-99.2", url="https://example.test/earnings"),
            ]
        }
    )
    facts = earnings_facts(
        [foreign],
        {
            "https://example.test/ordinary": "普通业务",
            "https://example.test/earnings": "完整财报原文",
        },
        [],
        watchlist,
        settings,
    )
    assert len(facts) == 2
    assert len({fact.id for fact in facts}) == 2
    assert {fact.prompt.sourceText for fact in facts} == {"普通业务", "完整财报原文"}
    assert all(not fact.confirmed for fact in facts)
    assert all(fact.card.sourceAccession == foreign.accession for fact in facts)


def test_weekly_merges_same_event_with_different_daily_report_ids(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    editions: list[Edition] = []
    for i, at in enumerate([NOW - timedelta(days=1), NOW]):
        report = article(
            id=f"bbc-{i}",
            title="Synthetic lunar mission test",
            source="bbc-world",
            at=at - timedelta(hours=1),
            url="https://example.test/same-event",
        )
        edition = build_edition(
            "morning", at, PipelineInput(articles=[report]), settings, watchlist, calendar
        ).edition
        assert edition is not None
        editions.append(edition)
    result = build_edition(
        "weekly", NOW + timedelta(days=3), PipelineInput(), settings, watchlist, calendar, editions
    )
    assert result.edition is not None
    section = next(
        s
        for s in result.edition.sections
        if isinstance(s, NewsArticlesSection) and s.kind == "international_weekly"
    )
    assert len(section.items) == 1
    assert section.items[0].data.article.url == "https://example.test/same-event"
