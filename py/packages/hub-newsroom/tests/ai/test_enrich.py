"""假模型真实经过Runtime；不访问模型服务、不伪称金融事实。"""

import asyncio
import hashlib
import json
from dataclasses import replace
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import pytest
import yaml

from hub_ai.registry import Registry
from hub_ai.runtime import Request, Response, Runtime, Usage
from hub_contracts import (
    Article,
    CalendarEvent,
    EarningsCardOutput,
    Filing,
    InsiderTrade,
    NewsArticlesSection,
    NewsCloseSnapshot,
    NewsEarningsSection,
    NewsInternationalSection,
    NewsTickerSection,
    WatchItem,
)
from hub_core.calendar import NyseCalendar
from hub_newsroom.ai import enrich_edition
from hub_newsroom.ai.enrich import is_earnings_release, unique_source_rows
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline import PipelineInput, build_edition
from hub_newsroom.pipeline.international import digest_item

ROOT = Path(__file__).resolve().parents[5]


async def no_sleep(_: float) -> None:
    pass


class FakeAdapter:
    def __init__(self, failed: set[str] | None = None) -> None:
        self.failed = failed or set()
        self.names: list[str] = []

    async def generate(self, request: Request) -> Response:
        name = request.output_model.__name__
        self.names.append(name)
        if name in self.failed:
            raise ValueError("假模型失败")
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
            "BriefOutput": {"briefs": [{"id": "extra", "brief": "合成测试正文"}]},
            "EditionLedeOutput": {"lines": ["合成测试正文。"] * 3},
        }
        return Response(outputs[name], Usage(10, 5))


def pipeline(settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]):
    raw: dict[str, Any] = json.loads(
        (ROOT / "py/packages/hub-newsroom/tests/pipeline/data/morning-input.json").read_text()
    )
    result = build_edition(
        "morning",
        datetime.fromisoformat(raw["now"]),
        PipelineInput(
            articles=[Article.model_validate(x) for x in raw["articles"]],
            filings=[Filing.model_validate(x) for x in raw["filings"]],
            insiders=[InsiderTrade.model_validate(x) for x in raw["insiders"]],
            events=[CalendarEvent.model_validate(x) for x in raw["events"]],
            exhibit_texts=raw["exhibit_texts"],
            filing_texts=raw["filing_texts"],
            snapshot=NewsCloseSnapshot.model_validate(raw["snapshot"]),
            snapshot_session=date.fromisoformat(raw["snapshot_session"]),
        ),
        settings,
        watchlist,
        calendar,
    )
    assert result.edition is not None
    edition = result.edition.model_copy(deep=True)
    group = next(
        s.items[0].data for s in edition.sections if isinstance(s, NewsInternationalSection)
    )
    extra = Article.model_validate(
        {
            **raw["articles"][2],
            "id": "extra",
            "title": "不同事件测试",
            "url": "https://example.test/extra",
        }
    )
    group.briefs.append(digest_item(extra, 1, "other"))
    return replace(result, edition=edition)


NAMES = [
    "EarningsCardOutput",
    "FilingDigestOutput",
    "TickerDigestOutput",
    "UsRankOutput",
    "ClassifyOutput",
    "CurateOutput",
    "BriefOutput",
    "EditionLedeOutput",
]


@pytest.mark.parametrize("failed", NAMES)
def test_each_failure_fallback(
    failed: str, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    result = pipeline(settings, calendar, watchlist)
    before = result.edition.model_dump_json() if result.edition else ""
    adapter = FakeAdapter({failed})
    enriched = asyncio.run(
        enrich_edition(
            result, settings, Runtime(Registry(ROOT), adapter, sleep=no_sleep), run_id="offline"
        )
    )
    assert enriched.edition is not None
    assert failed in adapter.names
    assert enriched.fallbacks
    assert all(c.runId == "offline" for c in enriched.calls)
    assert result.edition is not None
    assert before == result.edition.model_dump_json()
    assert any(not c.ok for c in enriched.calls)


def test_all_fail_titles_only(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    result = pipeline(settings, calendar, watchlist)
    out = asyncio.run(
        enrich_edition(
            result, settings, Runtime(Registry(ROOT), FakeAdapter(set(NAMES)), sleep=no_sleep)
        )
    )
    edition = out.edition
    assert edition is not None
    assert edition.lede is None
    assert len({f.capability for f in out.fallbacks}) == 8
    assert edition.aiUsage is not None
    assert edition.aiUsage.costUsd == 0
    for section in edition.sections:
        if isinstance(section, NewsArticlesSection):
            assert all(i.data.generatedBy is None and i.data.summary is None for i in section.items)
        if isinstance(section, NewsTickerSection):
            assert all(i.data.generatedBy is None for i in section.items)
        if isinstance(section, NewsEarningsSection):
            assert all(
                i.data.takeaway == "已发布财报" and not i.data.figures for i in section.items
            )


def test_success_provenance_and_cost(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    out = asyncio.run(
        enrich_edition(
            pipeline(settings, calendar, watchlist),
            settings,
            Runtime(Registry(ROOT), FakeAdapter(), sleep=no_sleep),
        )
    )
    assert out.edition is not None
    assert out.edition.lede is not None
    assert out.edition.lede.generatedBy is not None
    assert out.edition.lede.generatedBy.capability == "news.edition_lede"
    assert out.edition.aiUsage is not None
    assert out.edition.aiUsage.inputTokens == sum(c.inputTokens for c in out.calls)
    assert out.edition.aiUsage.costUsd > 0


def test_unconfirmed_requires_explicit_results_not_eps():
    out = EarningsCardOutput(period="Q1 2026", figures=[], guidance=None, takeaway="测试")
    assert is_earnings_release(
        out,
        "Synthetic company announced financial results for Q1 2026. Revenue was $12 million. EPS was not disclosed.",
    )
    assert not is_earnings_release(
        out,
        "The company opened a factory. Revenue may improve. Earnings report link is on the website.",
    )
    assert not is_earnings_release(out, "Q1 results")


def test_duplicate_unknown_ids_rejected():
    from hub_contracts import NewsBrief

    rows = [
        NewsBrief(id="1", brief="甲"),
        NewsBrief(id="1", brief="乙"),
        NewsBrief(id="2", brief="丙"),
        NewsBrief(id="missing", brief="丁"),
    ]
    assert set(unique_source_rows(rows, {"1", "2"})) == {"2"}


CAPABILITIES = [
    "classify",
    "curate",
    "brief",
    "earnings_card",
    "filing_digest",
    "ticker_digest",
    "us_rank",
    "edition_lede",
]


@pytest.mark.parametrize("name", CAPABILITIES)
def test_eval_inputs_independent_and_offline_runtime(name: str):
    registry = Registry(ROOT)
    cap = registry.capabilities["news." + name]
    folder = ROOT / "evals" / ("news." + name)
    cases: list[dict[str, Any]] = yaml.safe_load((folder / "cases.yaml").read_text())
    responses: dict[str, Any] = yaml.safe_load((folder / "responses.yaml").read_text())
    assert len(cases) >= (20 if name in {"us_rank", "ticker_digest"} else 10)
    hashes = {
        hashlib.sha256(
            json.dumps(c["input"], sort_keys=True, ensure_ascii=False).encode()
        ).hexdigest()
        for c in cases
    }
    assert len(hashes) == len(cases)
    for case in cases:
        registry.model(cap["io"]["input"]).model_validate(case["input"])
        registry.model(cap["io"]["output"]).model_validate(responses[case["id"]]["output"])
        assert case["tags"] == ["edge"]
        assert case["expect"]["reference"]
        if "must_include" in cap["evals"]["thresholds"]:
            assert case["expect"]["must_include"]

        class Replay:
            def __init__(self, output: object):
                self.output = output

            async def generate(self, request: Request) -> Response:
                return Response(self.output)

        result = asyncio.run(
            Runtime(registry, Replay(responses[case["id"]]["output"]), sleep=no_sleep).run(
                "news." + name, case["input"]
            )
        )
        assert result.ok, (case["id"], result.reason, result.reports)
        assert result.schema_valid
        assert not any(r.changes for r in result.reports), (case["id"], result.reports)


def test_skip_no_model(settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]):
    adapter = FakeAdapter()
    out = asyncio.run(
        enrich_edition(
            replace(pipeline(settings, calendar, watchlist), edition=None),
            settings,
            Runtime(Registry(ROOT), adapter),
        )
    )
    assert out.edition is None
    assert out.calls == ()
    assert adapter.names == []


def test_shadow_never_published(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    registry = Registry(ROOT)
    for key in registry.capabilities:
        if key.startswith("news."):
            registry.capabilities[key]["autonomy"] = "L0"
    out = asyncio.run(
        enrich_edition(
            pipeline(settings, calendar, watchlist),
            settings,
            Runtime(registry, FakeAdapter(), sleep=no_sleep),
        )
    )
    assert out.edition is not None
    assert out.edition.lede is None
    assert out.fallbacks
    assert all(c.ok for c in out.calls)
    for section in out.edition.sections:
        if isinstance(section, NewsTickerSection):
            assert all(i.data.generatedBy is None for i in section.items)


@pytest.mark.parametrize("failure", ["transport", "structure", "tokens"])
def test_runtime_failure_limits(
    failure: str, settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    from hub_ai.runtime import TransportError

    class Broken(FakeAdapter):
        async def generate(self, request: Request) -> Response:
            self.names.append(request.output_model.__name__)
            if failure == "transport":
                raise TransportError("显式假传输")
            if failure == "structure":
                return Response({"invalid": "合成错误"}, Usage(7, 2))
            response = await super().generate(request)
            return Response(response.output, Usage(7, request.max_output_tokens + 1))

    adapter = Broken()
    out = asyncio.run(
        enrich_edition(
            pipeline(settings, calendar, watchlist),
            settings,
            Runtime(Registry(ROOT), adapter, sleep=no_sleep),
        )
    )
    assert out.edition is not None
    assert out.edition.lede is None
    assert out.headline_only
    assert all(not c.ok for c in out.calls)
    if failure != "transport":
        assert out.edition.aiUsage is not None
        assert out.edition.aiUsage.costUsd > 0


def test_domain_invalid_ids_and_modes(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    class Invalid(FakeAdapter):
        async def generate(self, request: Request) -> Response:
            if request.output_model.__name__ == "TickerDigestOutput":
                return Response(
                    {
                        "whatHappened": "合成测试正文",
                        "whyItMatters": None,
                        "sourceIds": [],
                        "points": [{"text": "合成测试正文", "sourceIds": []}],
                    }
                )
            if request.output_model.__name__ == "UsRankOutput":
                return Response(
                    {
                        "items": [
                            {
                                "id": "market",
                                "summary": "合成测试正文",
                                "whyItMatters": "进展",
                                "topic": "other",
                            }
                        ]
                        * 2
                    }
                )
            if request.output_model.__name__ == "EditionLedeOutput":
                return Response({"lines": ["合成测试正文"]})
            return await super().generate(request)

    out = asyncio.run(
        enrich_edition(
            pipeline(settings, calendar, watchlist),
            settings,
            Runtime(Registry(ROOT), Invalid(), sleep=no_sleep),
        )
    )
    assert out.edition is not None
    assert out.edition.lede is None
    assert {f.capability for f in out.fallbacks} >= {
        "news.ticker_digest",
        "news.us_rank",
        "news.edition_lede",
    }
    tickers = next(s for s in out.edition.sections if isinstance(s, NewsTickerSection))
    assert all(not i.data.points for i in tickers.items)
    assert out.headlines["NVDA"][0].url == "https://example.test/nvidia"
    us = next(s for s in out.edition.sections if isinstance(s, NewsArticlesSection))
    assert len(us.items) == 1
    assert us.items[0].data.generatedBy is None


def test_confirm_six_k_without_eps(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    from hub_contracts import EarningsCardInput
    from hub_newsroom.pipeline.facts import EarningsFact

    initial = pipeline(settings, calendar, watchlist)
    key = next(iter(initial.earnings_candidates))
    fact = initial.earnings_candidates[key]
    prompt = EarningsCardInput(
        symbol="NVDA",
        name="Nvidia",
        sourceKind="press_release",
        sourceUrl=fact.card.sourceUrl,
        sourceText="Synthetic company announced financial results for Q1 2026. Revenue was $12 million. 合成测试正文",
    )
    edition = initial.edition
    assert edition is not None
    edition = edition.model_copy(deep=True)
    edition.sections = [s for s in edition.sections if not isinstance(s, NewsEarningsSection)]
    result = replace(
        initial,
        edition=edition,
        earnings_candidates={key: EarningsFact(key, fact.card, prompt, False)},
        earnings_inputs={key: prompt},
    )
    out = asyncio.run(
        enrich_edition(result, settings, Runtime(Registry(ROOT), FakeAdapter(), sleep=no_sleep))
    )
    assert out.edition is not None
    assert out.unconfirmed == ()
    assert any(isinstance(s, NewsEarningsSection) for s in out.edition.sections)
    ordinary = prompt.model_copy(update={"sourceText": "We opened a factory. 合成测试正文"})
    result = replace(
        result,
        earnings_candidates={key: EarningsFact(key, fact.card, ordinary, False)},
        earnings_inputs={key: ordinary},
    )
    out = asyncio.run(
        enrich_edition(result, settings, Runtime(Registry(ROOT), FakeAdapter(), sleep=no_sleep))
    )
    assert out.edition is not None
    assert out.unconfirmed == (key,)
    assert not any(isinstance(s, NewsEarningsSection) for s in out.edition.sections)


def test_lede_rebuilt_after_filing_and_summary(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    class Spy(FakeAdapter):
        def __init__(self):
            super().__init__()
            self.lede_prompt = ""

        async def generate(self, request: Request) -> Response:
            if request.output_model.__name__ == "EditionLedeOutput":
                self.lede_prompt = request.prompt["user"]
            return await super().generate(request)

    adapter = Spy()
    asyncio.run(
        enrich_edition(
            pipeline(settings, calendar, watchlist), settings, Runtime(Registry(ROOT), adapter)
        )
    )
    assert "合成公告原文" in adapter.lede_prompt
    assert "合成测试正文" in adapter.lede_prompt


@pytest.mark.parametrize(
    "source",
    [
        "Company reports financial results for Q1 2026.",
        "Company expects financial results next quarter. Revenue is projected to improve.",
        "Company opened a factory. No financial results were published.",
    ],
)
def test_title_or_future_not_confirmed(source: str):
    output = EarningsCardOutput(period="Q1 2026", figures=[], guidance=None, takeaway="测试")
    assert not is_earnings_release(output, source)


def test_existing_filing_without_new_source_preserved(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
):
    from hub_contracts import GeneratedBy, NewsFilingsSection

    original = pipeline(settings, calendar, watchlist)
    edition = original.edition
    assert edition is not None
    edition = edition.model_copy(deep=True)
    section = next(s for s in edition.sections if isinstance(s, NewsFilingsSection))
    section.items[0].data.digest = "既有已审核公告摘要"
    provenance = GeneratedBy(
        capability="news.filing_digest",
        version=1,
        model="offline-prior-model",
        at=datetime(2026, 9, 29, tzinfo=UTC),
    )
    section.items[0].data.generatedBy = provenance
    adapter = FakeAdapter()
    result = replace(original, edition=edition, filing_inputs={})
    out = asyncio.run(
        enrich_edition(result, settings, Runtime(Registry(ROOT), adapter, sleep=no_sleep))
    )
    assert out.edition is not None
    updated = next(s for s in out.edition.sections if isinstance(s, NewsFilingsSection))
    assert updated.items[0].data.digest == "既有已审核公告摘要"
    assert updated.items[0].data.generatedBy == provenance
    assert "FilingDigestOutput" not in adapter.names
