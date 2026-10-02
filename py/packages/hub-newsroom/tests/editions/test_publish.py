"""三版真实管线/Runtime与内存API/SMTP组合；不把替身当实际送达。"""

import asyncio
from dataclasses import replace
from datetime import UTC, date, datetime

import pytest

from hub_ai.registry import Registry
from hub_ai.runtime import Request, Response, Runtime, TransportError
from hub_contracts import WatchItem
from hub_core.calendar import NyseCalendar
from hub_newsroom.common.settings import Settings
from hub_newsroom.editions.service import Options, PublicationError, Publisher, edition_time
from hub_newsroom.pipeline.windows import EditionKind

from .helpers import ROOT, FakeCollector, FakeStore, FakeTransport, fixture


async def no_sleep(seconds: float) -> None:
    pass


class FailedAdapter:
    async def generate(self, request: Request) -> Response:
        raise TransportError("离线模拟错误模型key")


def publisher(
    kind: EditionKind, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> tuple[Publisher, FakeStore, FakeCollector, FakeTransport]:
    now, data, history = fixture(kind)
    store = FakeStore(watchlist, history)
    collector = FakeCollector(data)
    transport = FakeTransport(store)
    return (
        Publisher(
            settings,
            store,
            collector,
            calendar,
            transport,
            clock=lambda: now,
            subjects={
                "morning": "📰 美股早报｜{date}",
                "premarket": "⏰ 盘前简报｜{date}",
                "weekly": "🗓 美股周报｜{date}",
            },
            console_url="https://console.test",
            run_suffix="offline",
        ),
        store,
        collector,
        transport,
    )


@pytest.mark.parametrize("kind", ["morning", "premarket", "weekly"])
def test_three_editions_archive_then_send(
    kind: EditionKind, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, collector, transport = publisher(kind, settings, calendar, watchlist)
    outcome = asyncio.run(service.publish(Options(kind, no_ai=True)))
    assert outcome.edition
    assert outcome.mail
    assert outcome.sent
    assert outcome.edition.email
    assert outcome.edition.email.sentAt
    assert store.events.index("html") < store.events.index("smtp") < store.events.index("sentAt")
    assert store.runs[0].status == "running"
    assert store.runs[-1].status == "succeeded"
    assert store.runs[-1].stats["sent"] is True
    assert outcome.mail.body_chars <= settings.newsroom.editions[kind].readingBudgetChars
    assert "Bowen" not in transport.messages[0][2]
    assert "控制台网页版" in transport.messages[0][1]
    assert len(collector.calls) == 1
    # 备用触发点复用同一期：不重新采集、不重复SMTP。
    again = asyncio.run(service.publish(Options(kind, no_ai=True)))
    assert again.skipped
    assert len(transport.messages) == 1
    assert len(collector.calls) == 1
    forced = asyncio.run(service.publish(Options(kind, no_ai=True, force=True)))
    assert forced.sent
    assert len(transport.messages) == 2


def test_force_morning_reuses_full_period_instead_of_current_sent_marker(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, _, collector, _ = publisher("morning", settings, calendar, watchlist)
    original = asyncio.run(service.publish(Options("morning", no_ai=True)))
    resent = asyncio.run(service.publish(Options("morning", no_ai=True, force=True)))
    assert original.edition
    assert resent.edition
    assert resent.edition.window.fromAt == original.edition.window.fromAt
    assert collector.calls[1].start == collector.calls[0].start
    assert collector.calls[1].mode == collector.calls[0].mode == "regular"


def test_no_email_never_creates_sent_marker(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, collector, transport = publisher("morning", settings, calendar, watchlist)
    outcome = asyncio.run(service.publish(Options("morning", no_ai=True, no_email=True)))
    assert outcome.edition
    assert outcome.edition.email
    assert outcome.edition.email.sentAt is None
    assert not outcome.sent
    assert not transport.messages
    # 未发送归档不推进下一期成功发送起点。
    service.clock = lambda: datetime(2026, 9, 30, 23, 10, tzinfo=UTC)
    collector.data = replace(collector.data, snapshot=None, snapshot_session=None)
    again = asyncio.run(service.publish(Options("morning", no_ai=True, no_email=True)))
    assert again.edition
    assert again.edition.window.fromAt == datetime(2026, 9, 29, 23, 10, tzinfo=UTC)
    assert store.runs[-1].status == "succeeded"


@pytest.mark.parametrize("stage", ["/v1/internal/news/articles/batch", "html", "smtp", "sentAt"])
def test_failure_retains_archive_and_failed_run(
    stage: str, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, _, transport = publisher("morning", settings, calendar, watchlist)
    store.fail_at = stage
    transport.fail = stage == "smtp"
    with pytest.raises(PublicationError) as caught:
        asyncio.run(service.publish(Options("morning", no_ai=True)))
    assert store.runs[-1].status == "failed"
    assert "敏感" not in str(caught.value)
    assert all("敏感" not in text for text in transport.notifications)
    assert bool(transport.messages) == (stage == "sentAt")
    if stage in {"smtp", "sentAt"}:
        assert store.htmls
        assert store.items
        assert next(iter(store.items.values())).email.sentAt is None  # pyright: ignore[reportOptionalMemberAccess]
    if stage == "sentAt":
        assert store.runs[-1].stats["sent"] is True
        assert "重跑前核对邮箱" in str(caught.value)


@pytest.mark.parametrize(
    ("instant", "runs"),
    [
        ("2026-07-07T12:34:59+00:00", False),
        ("2026-07-07T12:35:00+00:00", True),
        ("2026-07-07T12:40:00+00:00", True),
        ("2026-07-07T13:40:00+00:00", False),
        ("2026-07-07T13:15:00+00:00", True),
        ("2026-07-07T13:15:01+00:00", False),
        ("2026-12-08T12:40:00+00:00", False),
        ("2026-12-08T13:40:00+00:00", True),
        ("2026-07-03T12:40:00+00:00", False),
    ],
)
def test_dst_guard_before_io(
    instant: str, runs: bool, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, collector, transport = publisher("premarket", settings, calendar, watchlist)
    now = datetime.fromisoformat(instant)
    service.clock = lambda: now
    # 仅生成同日早报覆盖起点；所有正文是合成测试。
    store.items = {
        row.id: row.model_copy(
            update={
                "id": "morning-" + now.date().isoformat(),
                "date": now.date(),
                "window": row.window.model_copy(update={"toAt": now.replace(hour=5)}),
            }
        )
        for row in store.items.values()
    }
    outcome = asyncio.run(
        service.publish(Options("premarket", no_ai=True, no_email=True, force=True))
    )
    assert (not outcome.skipped) == runs
    assert bool(collector.calls) == runs
    assert ("history" in store.events) == runs
    assert not transport.messages


def test_ignore_window_does_not_bypass_holiday(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, _, collector, _ = publisher("premarket", settings, calendar, watchlist)
    service.clock = lambda: datetime(2026, 7, 3, 12, 40, tzinfo=UTC)
    outcome = asyncio.run(
        service.publish(Options("premarket", force=True, ignore_window=True, no_ai=True))
    )
    assert outcome.skipped
    assert not collector.calls


def test_missing_morning_is_explicit_failure(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, collector, _ = publisher("premarket", settings, calendar, watchlist)
    store.items = {}
    with pytest.raises(PublicationError):
        asyncio.run(service.publish(Options("premarket", no_ai=True, no_email=True)))
    assert not collector.calls
    assert store.runs[-1].status == "failed"


def test_wrong_model_key_runtime_fallback(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, _, transport = publisher("morning", settings, calendar, watchlist)
    service.runtime = Runtime(Registry(ROOT), FailedAdapter(), sleep=no_sleep)
    outcome = asyncio.run(service.publish(Options("morning")))
    assert outcome.edition
    assert outcome.mail
    assert outcome.sent
    assert "标题清单版" in outcome.mail.text
    calls = store.batches["/v1/internal/ai-calls/batch"]
    assert calls
    assert all(not row.model_dump()["ok"] for row in calls)
    assert outcome.edition.aiUsage
    assert outcome.edition.aiUsage.costUsd == 0
    assert transport.messages


def test_date_preserves_sg_wall_clock() -> None:
    assert edition_time(
        datetime(2026, 9, 29, 23, 10, tzinfo=UTC), date(2026, 8, 10), "Asia/Singapore"
    ) == datetime(2026, 8, 9, 23, 10, tzinfo=UTC)
    with pytest.raises(ValueError, match="时区"):
        edition_time(datetime(2026, 9, 30), None, "Asia/Singapore")


def test_trim_omits_stale_lede_and_international_overview(
    settings: Settings,
    calendar: NyseCalendar,
    watchlist: list[WatchItem],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    from hub_contracts import EditionLede, NewsInternationalSection
    from hub_newsroom.ai import EnrichmentResult
    from hub_newsroom.pipeline.editions import PipelineResult

    service, store, _, _ = publisher("morning", settings, calendar, watchlist)
    service.runtime = Runtime(Registry(ROOT), FailedAdapter(), sleep=no_sleep)
    service.settings = settings.model_copy(deep=True)
    service.settings.newsroom.editions["morning"].readingBudgetChars = 250

    async def enriched(
        pipeline: PipelineResult, settings: Settings, runtime: Runtime, *, run_id: str | None = None
    ) -> EnrichmentResult:
        assert pipeline.edition
        value = pipeline.edition.model_copy(deep=True)
        value.lede = EditionLede(lines=["裁剪前本期事实导语。"] * 3, generatedBy=None)
        for section in value.sections:
            if isinstance(section, NewsInternationalSection):
                section.items[0].data.overview = "裁剪前国际综述。"
        return EnrichmentResult(value, (), (), (), {}, False)

    monkeypatch.setattr("hub_newsroom.editions.service.enrich_edition", enriched)
    outcome = asyncio.run(service.publish(Options("morning", no_email=True)))
    assert outcome.edition
    assert outcome.mail
    assert outcome.edition.lede is None
    assert "裁剪前" not in outcome.mail.text
    assert "omit 降级" in outcome.mail.text
    assert store.runs[-1].stats["removedIds"]
    assert outcome.mail.body_chars <= 250


class SuccessfulAdapter:
    async def generate(self, request: Request) -> Response:
        from hub_ai.runtime import Usage

        outputs: dict[str, object] = {
            "EarningsCardOutput": {
                "period": "Q1 2026",
                "figures": [],
                "guidance": None,
                "takeaway": "合成测试正文",
            },
            "FilingDigestOutput": {"digest": "合成公告原文"},
            "TickerDigestOutput": {
                "whatHappened": "合成测试正文",
                "whyItMatters": None,
                "sourceIds": [],
                "points": [],
            },
            "UsRankOutput": {
                "items": [
                    {
                        "id": "market",
                        "summary": "合成测试正文",
                        "whyItMatters": "材料披露进展",
                        "topic": "macro_fed",
                    }
                ]
            },
            "ClassifyOutput": {"classifications": [{"id": "international", "topic": "us_china"}]},
            "CurateOutput": {
                "overview": "合成测试正文",
                "top5": [
                    {
                        "id": "international",
                        "summary": "合成测试正文",
                        "whyItMatters": "材料披露进展",
                    }
                ],
            },
            "BriefOutput": {"briefs": []},
            "EditionLedeOutput": {"lines": ["合成测试正文。"] * 3},
        }
        return Response(outputs[request.output_model.__name__], Usage(10, 5))


def test_runtime_success_usage_and_generated_by_persisted(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, _, _ = publisher("morning", settings, calendar, watchlist)
    service.runtime = Runtime(Registry(ROOT), SuccessfulAdapter(), sleep=no_sleep)
    result = asyncio.run(service.publish(Options("morning", no_email=True)))
    assert result.edition
    assert result.edition.aiUsage
    assert result.edition.aiUsage.costUsd > 0
    calls = store.batches["/v1/internal/ai-calls/batch"]
    assert any(row.model_dump()["ok"] for row in calls)
    assert all(row.model_dump()["runId"] == store.runs[0].id for row in calls)
    assert result.edition.aiUsage.inputTokens == sum(
        int(row.model_dump()["inputTokens"]) for row in calls
    )
    assert "generatedBy" in result.edition.model_dump_json()
