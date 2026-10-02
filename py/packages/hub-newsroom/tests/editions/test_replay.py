"""N-1：真实单日HTTP录制回放三版，不将缺录制请求当成功。"""

import asyncio
import json
from datetime import UTC, date, datetime
from pathlib import Path

import httpx
import pytest

from hub_contracts import Edition, EditionEmail, EditionWindow, WatchItem
from hub_core.calendar import NyseCalendar
from hub_core.config import load_config
from hub_core.http import HttpClient
from hub_core.settings import Settings as EnvironmentSettings
from hub_newsroom.common.settings import Settings
from hub_newsroom.editions.collect import Collector
from hub_newsroom.editions.service import Options, Outcome, Publisher
from hub_newsroom.pipeline.windows import EditionKind
from hub_providers.common.config import sources_config
from hub_providers.common.replay import ReplayTransport
from hub_providers.sec.adapter import SecRateLimiter

from .helpers import ROOT, FakeStore, FakeTransport


def replay_edition(
    kind: EditionKind, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> tuple[Outcome, FakeStore]:
    now = (
        datetime(2026, 10, 3, 1, 10, tzinfo=UTC)
        if kind == "weekly"
        else datetime(2026, 10, 1, 4, tzinfo=UTC)
    )
    history = (
        [
            Edition(
                id="morning-2026-10-01",
                kind="morning",
                date=date(2026, 10, 1),
                window=EditionWindow(
                    fromAt=datetime(2026, 9, 29, 4, tzinfo=UTC),
                    toAt=datetime(2026, 9, 30, 4, tzinfo=UTC),
                ),
                generatedAt=None,
                lede=None,
                sections=[],
                sources=[],
                aiUsage=None,
                email=EditionEmail(sentAt=None),
            )
        ]
        if kind == "premarket"
        else []
    )
    store = FakeStore(watchlist, history)
    transport = FakeTransport(store)
    # 仅假凭据占位匹配录制请求，不读取本机环境、不联网。
    env = EnvironmentSettings.model_construct()
    from pydantic import SecretStr

    env.alpaca_api_key_id = SecretStr("offline")
    env.alpaca_api_secret_key = SecretStr("offline")
    env.sec_user_agent = "offline fixtures test contact@example.test"
    env.fred_api_key = SecretStr("offline")
    env.finnhub_api_key = SecretStr("offline")
    env.tiingo_api_key = SecretStr("offline")
    with httpx.Client(
        transport=ReplayTransport(ROOT / "fixtures/http/news/recorded-2026-09-30"),
        follow_redirects=True,
    ) as client:
        http = HttpClient(client=client, retries=0, sleeper=lambda _: None)
        collector = Collector(
            env,
            settings,
            sources_config(load_config(ROOT / "config/news_sources.yaml")),
            http,
            calendar,
        )
        publisher = Publisher(
            settings,
            store,
            collector,
            calendar,
            transport,
            clock=lambda: now,
            subjects={name: name + "｜{date}" for name in ("morning", "premarket", "weekly")},
            run_suffix="replay",
        )
        return asyncio.run(
            publisher.publish(
                Options(kind, no_ai=True, no_email=True, ignore_window=kind == "premarket")
            )
        ), store


@pytest.mark.parametrize("kind", ["morning", "premarket", "weekly"])
def test_real_recorded_three_editions(
    kind: EditionKind,
    settings: Settings,
    calendar: NyseCalendar,
    watchlist: list[WatchItem],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def wait(_self: SecRateLimiter) -> None:
        pass

    monkeypatch.setattr(SecRateLimiter, "wait", wait)
    outcome, store = replay_edition(kind, settings, calendar, watchlist)
    assert outcome.edition
    assert outcome.mail
    assert store.batches["/v1/internal/news/articles/batch"]
    assert any(row.status == "failed" for row in outcome.edition.sources)
    assert "暂不可用" in outcome.mail.text
    assert outcome.mail.body_chars <= settings.newsroom.editions[kind].readingBudgetChars
    actual = [section.model_dump(mode="json") for section in outcome.edition.sections]
    expected = json.loads((Path(__file__).parent / "data" / f"replay-{kind}.json").read_text())
    assert actual == expected
