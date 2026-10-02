"""新闻能力纯编排：调用注入运行时，按稳定来源ID回填，不做IO。"""

import re
from collections import Counter
from dataclasses import dataclass
from typing import Protocol, TypeVar

from pydantic import BaseModel, ValidationError

from hub_ai.runtime import Runtime
from hub_contracts import (
    AiCall,
    BriefInput,
    BriefOutput,
    ClassifyInput,
    ClassifyOutput,
    CurateInput,
    CurateOutput,
    EarningsCardOutput,
    Edition,
    EditionAiUsage,
    EditionLede,
    EditionLedeInput,
    EditionLedeOutput,
    FilingDigestOutput,
    GeneratedBy,
    NewsArticlesSection,
    NewsEarningsCardItem,
    NewsEarningsSection,
    NewsFilingsSection,
    NewsInsidersSection,
    NewsInternationalSection,
    NewsNewsArticleDigestItem,
    NewsPromptItem,
    NewsTickerEarnings,
    NewsTickerSection,
    TickerDigestOutput,
    TickerDigestPoint,
    UsRankOutput,
)
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline.editions import PipelineResult, lede_facts
from hub_newsroom.pipeline.facts import filing_label, insider_text

T = TypeVar("T", bound=BaseModel)


@dataclass(frozen=True)
class Fallback:
    capability: str
    key: str
    reason: str


@dataclass(frozen=True)
class Headline:
    id: str
    title: str
    url: str


@dataclass(frozen=True)
class EnrichmentResult:
    edition: Edition | None
    calls: tuple[AiCall, ...]
    fallbacks: tuple[Fallback, ...]
    unconfirmed: tuple[str, ...]
    headlines: dict[str, tuple[Headline, ...]]
    headline_only: bool


class _Calls:
    def __init__(self, runtime: Runtime, run_id: str | None) -> None:
        self.runtime = runtime
        self.run_id = run_id
        self.calls: list[AiCall] = []
        self.fallbacks: list[Fallback] = []

    def reject(self, capability: str, key: str, reason: str) -> None:
        self.fallbacks.append(Fallback(capability, key, reason))

    async def run(self, capability: str, key: str, inputs: BaseModel, model: type[T]) -> T | None:
        result = await self.runtime.run(
            capability, inputs.model_dump(mode="json"), run_id=self.run_id
        )
        self.calls.append(result.call)
        if not result.ok or result.status != "ready" or result.output is None:
            self.reject(capability, key, result.reason or f"非自动发布状态：{result.status}")
            return None
        try:
            return model.model_validate(result.output)
        except ValidationError:
            self.reject(capability, key, "校验后输出契约不合格")
            return None


class _Identified(Protocol):
    id: str


def unique_source_rows[T: _Identified](rows: list[T], allowed: set[str]) -> dict[str, T]:
    """重复ID整组拒绝，不用最后一条覆盖；未知ID不回填。"""
    counts = Counter(row.id for row in rows)
    return {row.id: row for row in rows if row.id in allowed and counts[row.id] == 1}


def _summary(
    item: NewsNewsArticleDigestItem,
    text: str | None,
    why: str | None,
    topic: str | None,
    generated: GeneratedBy | None,
) -> None:
    item.data = item.data.model_copy(
        update={
            "summary": text,
            "whyItMatters": why,
            "topic": topic,
            "generatedBy": generated,
        }
    )


def is_earnings_release(output: EarningsCardOutput, source: str) -> bool:
    """必须有明确财务业绩发布原文；不把EPS缺省当作非财报。"""
    announcement = re.search(
        r"(?:announc(?:es|ed)|report(?:s|ed)|releases|released).{0,100}"
        r"(?:financial results|quarterly results|annual results|earnings)|"
        r"(?:financial results|quarterly results|annual results).{0,100}"
        r"(?:quarter|fiscal|year)|(?:公布|发布).{0,40}(?:财报|财务业绩|季度业绩|年度业绩)",
        source,
        re.IGNORECASE | re.DOTALL,
    )
    # 仅标题中的results不够：正文还应包含历史业绩量，不要求特定营收/EPS组合。
    evidence = any(
        re.search(
            r"(?:revenue|net (?:income|profit|loss)|earnings per share|cash flow|total assets|营收|收入|净利|每股|现金流|总资产).{0,80}\d",
            sentence,
            re.IGNORECASE,
        )
        and not re.search(
            r"\b(?:will|expect|forecast|guidance|not reported)\b|预计|指引|计划",
            sentence,
            re.IGNORECASE,
        )
        for sentence in re.split(r"[。!?\n]|\.\s", source)
    )
    return bool(announcement and evidence and output.period.strip())


async def enrich_edition(
    pipeline: PipelineResult, settings: Settings, runtime: Runtime, *, run_id: str | None = None
) -> EnrichmentResult:
    """跳过版次不调用模型；返回独立副本与所有调用/降级，T13负责持久化和裁剪。"""
    if pipeline.edition is None:
        return EnrichmentResult(None, (), (), (), {}, False)
    edition = pipeline.edition.model_copy(deep=True)
    if edition.kind == "legacy":
        raise ValueError("legacy归档不参与新闻AI加工")
    calls = _Calls(runtime, run_id)
    unconfirmed: list[str] = []
    earnings_section = next(
        (s for s in edition.sections if isinstance(s, NewsEarningsSection)), None
    )
    for key, prompt in pipeline.earnings_inputs.items():
        fact = pipeline.earnings_candidates[key]
        output = await calls.run("news.earnings_card", key, prompt, EarningsCardOutput)
        if (
            output is not None
            and not fact.confirmed
            and not is_earnings_release(output, prompt.sourceText)
        ):
            calls.reject("news.earnings_card", key, "原文未明确确证财务业绩发布")
            output = None
        if not fact.confirmed and output is None:
            unconfirmed.append(key)
            continue
        card = fact.card.model_copy(deep=True)
        if output is not None:
            card = card.model_copy(
                update={key: getattr(output, key) for key in output.model_fields_set}
            )
        else:
            card.takeaway = "已发布财报"
        if earnings_section is None:
            earnings_section = NewsEarningsSection(
                kind="premarket_earnings" if edition.kind == "premarket" else "earnings",
                title="盘前已发布财报" if edition.kind == "premarket" else "财报",
                items=[],
            )
            # 财报仍位于公告/日程之前。
            index = next(
                (i for i, s in enumerate(edition.sections) if s.kind in {"filings", "calendar"}),
                len(edition.sections),
            )
            edition.sections.insert(index, earnings_section)
        existing = next((i for i in earnings_section.items if i.id == key), None)
        if existing is None:
            earnings_section.items.append(NewsEarningsCardItem(id=key, data=card))
        else:
            existing.data = card
    filing_data = {}
    for section in edition.sections:
        if isinstance(section, NewsFilingsSection):
            for item in section.items:
                prompt = pipeline.filing_inputs.get(item.id)
                if prompt is None and item.data.digest:
                    # 周报复用历史已审摘要与出处，不用规则标签覆盖。
                    filing_data[item.id] = item.data.digest
                    continue
                output = (
                    await calls.run("news.filing_digest", item.id, prompt, FilingDigestOutput)
                    if prompt
                    else None
                )
                item.data.digest = (
                    output.digest
                    if output and output.digest.strip()
                    else filing_label(item.data.filing, settings)
                )
                item.data.generatedBy = (
                    output.generatedBy if output and output.digest.strip() else None
                )
                filing_data[item.id] = item.data.digest
    # 完整标题与原URL在sidecar保存；字段字数限制不能让降级丢掉原链接。
    source_headlines = {a.id: Headline(a.id, a.title, a.url) for a in pipeline.articles}
    for section in edition.sections:
        if isinstance(section, NewsFilingsSection):
            for entry in section.items:
                source_headlines[entry.id] = Headline(
                    entry.id, filing_label(entry.data.filing, settings), entry.data.filing.url
                )
        elif isinstance(section, NewsInsidersSection):
            for trade in section.items:
                source_headlines[trade.id] = Headline(
                    trade.id, insider_text(trade.data, settings), trade.data.url
                )
        elif isinstance(section, NewsEarningsSection):
            for earning in section.items:
                source_headlines[earning.id] = Headline(
                    earning.id, earning.data.symbol + " 已发布财报", earning.data.sourceUrl
                )
    headlines: dict[str, tuple[Headline, ...]] = {}
    for section in edition.sections:
        if not isinstance(section, NewsTickerSection):
            continue
        for item in section.items:
            original = pipeline.ticker_inputs[item.data.symbol]
            prompt = original.model_copy(deep=True)
            for filing in prompt.filings:
                if filing.id in filing_data:
                    filing.digest = filing_data[filing.id]
            prompt.earnings = [
                NewsTickerEarnings(**e.data.model_dump(), id=e.id)
                for s in edition.sections
                if isinstance(s, NewsEarningsSection)
                for e in s.items
                if e.data.symbol == prompt.symbol
            ]
            source_ids = (
                [a.id for a in prompt.articles]
                + [f.id for f in prompt.filings]
                + [e.id for e in prompt.earnings]
            )
            headlines[prompt.symbol] = tuple(
                source_headlines[id] for id in source_ids if id in source_headlines
            )
            output = await calls.run("news.ticker_digest", item.id, prompt, TickerDigestOutput)
            if not source_ids and output is not None:
                # 没有直接资料的槽位只允许确定性“同步/未找到”事实，不能让模型补归因。
                direction = "下跌" if (prompt.changeText or "").startswith("-") else "上涨"
                text = (
                    f"与板块（{prompt.sectorEtf}）同步{direction}"
                    if prompt.withSector is True and prompt.changeText
                    else "未找到直接相关消息"
                )
                output = output.model_copy(
                    update={
                        "whatHappened": text,
                        "whyItMatters": None,
                        "sourceIds": [],
                        "points": [TickerDigestPoint(text=text, sourceIds=[])]
                        if prompt.mode == "weekly"
                        else [],
                    }
                )
            valid = output is not None and bool(output.whatHappened.strip())
            if output is not None:
                valid = (
                    valid
                    and len(output.sourceIds) <= 3
                    and all(len(p.sourceIds) <= 3 for p in output.points)
                )
                valid = valid and (
                    not output.points
                    if prompt.mode == "daily"
                    else 1 <= len(output.points) <= 3
                    and len(output.whatHappened) <= 60
                    and output.whyItMatters is None
                )
            if valid and output is not None:
                item.data = item.data.model_copy(
                    update={key: getattr(output, key) for key in output.model_fields_set}
                )
            else:
                if output is not None:
                    calls.reject("news.ticker_digest", item.id, "模式条数或来源数量不合格")
                titles = [a.title for a in prompt.articles] + [
                    "、".join(f.items) or f.form for f in prompt.filings
                ]
                item.data.whatHappened = (
                    titles[0][: 60 if prompt.mode == "weekly" else 80]
                    if titles
                    else "未找到直接相关消息"
                )
                item.data.whyItMatters = None
                item.data.sourceIds = [h.id for h in headlines[prompt.symbol][:3]]
                item.data.points = (
                    [
                        TickerDigestPoint(text=h.title[:60], sourceIds=[h.id])
                        for h in headlines[prompt.symbol][:3]
                    ]
                    if prompt.mode == "weekly"
                    else []
                )
                item.data.generatedBy = None
    for section in edition.sections:
        if isinstance(section, NewsArticlesSection) and section.kind in {"us_news", "new_messages"}:
            original = pipeline.us_rank_input
            maximum = (
                min(
                    len(original.candidates),
                    original.maxItems,
                    settings.newsroom.editions["premarket"].maxMarketItems or original.maxItems,
                )
                if edition.kind == "premarket"
                else min(len(original.candidates), original.maxItems)
            )
            prompt = original.model_copy(
                update={"minItems": min(original.minItems, maximum), "maxItems": maximum}
            )
            output = (
                await calls.run("news.us_rank", section.kind, prompt, UsRankOutput)
                if maximum
                else None
            )
            candidates = {i.id: i for i in section.items}
            selected = unique_source_rows(output.items, set(candidates)) if output else {}
            if output and prompt.minItems <= len(selected) <= maximum:
                section.items = [candidates[k] for k in selected]
                for key, row in selected.items():
                    _summary(
                        candidates[key],
                        row.summary,
                        row.whyItMatters,
                        row.topic,
                        output.generatedBy,
                    )
            else:
                if output:
                    calls.reject("news.us_rank", section.kind, "入选条数/ID不合格")
                section.items = section.items[: min(6, maximum)]
                for item in section.items:
                    _summary(item, None, None, item.data.topic, None)
    await _international(edition, pipeline, settings, calls)
    facts = lede_facts(edition, settings)
    by_fact = {fact.id: fact for fact in facts}
    for section in edition.sections:
        if isinstance(section, NewsFilingsSection):
            for filing in section.items:
                if filing.id in by_fact and filing.data.digest:
                    by_fact[filing.id].text += "；" + filing.data.digest
        elif isinstance(section, NewsInternationalSection):
            for group in section.items:
                if group.id in by_fact:
                    summaries = [
                        item.data.summary
                        for item in [*group.data.top5, *group.data.briefs]
                        if item.data.summary
                    ]
                    by_fact[group.id].text += "；" + "；".join(summaries)
    if facts:
        prompt = EditionLedeInput(mode=edition.kind, date=edition.date, facts=facts)
        output = await calls.run("news.edition_lede", edition.id, prompt, EditionLedeOutput)
        valid = output is not None and all(line.strip() for line in output.lines)
        if output is not None:
            valid = valid and (
                2 <= len(output.lines) <= 3 and 250 <= sum(map(len, output.lines)) <= 350
                if edition.kind == "weekly"
                else len(output.lines) == 3
            )
        if valid and output:
            edition.lede = EditionLede(lines=output.lines, generatedBy=output.generatedBy)
        elif output:
            calls.reject("news.edition_lede", edition.id, "导语模式长度/条数不合格")
    edition.aiUsage = EditionAiUsage(
        inputTokens=sum(c.inputTokens for c in calls.calls),
        outputTokens=sum(c.outputTokens for c in calls.calls),
        costUsd=sum(c.costUsd for c in calls.calls),
    )
    headline_only = bool(calls.calls) and all(not c.ok for c in calls.calls)
    if headline_only:
        for section in edition.sections:
            if isinstance(section, NewsInternationalSection):
                for group in section.items:
                    group.data.overview = ""
                    for item in [*group.data.top5, *group.data.briefs]:
                        _summary(item, None, None, item.data.topic, None)
    # 回填结果再走契约，避免model_copy update绕过校验。
    edition = Edition.model_validate(edition.model_dump())
    return EnrichmentResult(
        edition,
        tuple(calls.calls),
        tuple(calls.fallbacks),
        tuple(unconfirmed),
        headlines,
        headline_only,
    )


async def _international(
    edition: Edition, pipeline: PipelineResult, settings: Settings, calls: _Calls
) -> None:
    for section in edition.sections:
        if not isinstance(section, NewsInternationalSection):
            continue
        for group in section.items:
            data = group.data
            available = {i.id: i for i in [*data.top5, *data.briefs]}
            # 使用T11代表文章补齐整个20候选，不能仅限原规则Top5。
            for cluster in pipeline.clusters:
                article = cluster.representative
                candidate = next(
                    (c for c in pipeline.international_candidates if c.id == article.id), None
                )
                if candidate and article.id not in available:
                    from hub_newsroom.pipeline.international import digest_item

                    available[article.id] = digest_item(
                        article, candidate.ruleScore, candidate.topic
                    )
            candidates = [c.model_copy(deep=True) for c in pipeline.international_candidates]
            classified = (
                await calls.run(
                    "news.classify",
                    group.id,
                    ClassifyInput(
                        items=[
                            NewsPromptItem(id=c.id, title=c.title, summary=(c.summary or "")[:300])
                            for c in candidates
                        ]
                    ),
                    ClassifyOutput,
                )
                if candidates
                else None
            )
            labels = (
                unique_source_rows(classified.classifications, set(available)) if classified else {}
            )
            for c in candidates:
                if classified is not None and c.id not in labels:
                    calls.reject("news.classify", c.id, "缺失/重复/未知分类ID，使用既定关键词")
                if c.id in labels:
                    c = c.model_copy(update={"topic": labels[c.id].topic})
                available[c.id].data.topic = c.topic
            candidates = [
                c.model_copy(
                    update={"topic": available[c.id].data.topic, "summary": (c.summary or "")[:500]}
                )
                for c in candidates
            ]
            output = (
                await calls.run(
                    "news.curate", group.id, CurateInput(candidates=candidates), CurateOutput
                )
                if candidates
                else None
            )
            selected = unique_source_rows(output.top5, {c.id for c in candidates}) if output else {}
            if (
                output
                and len(selected) == min(settings.international.pipeline.topN, len(candidates))
                and output.overview.strip()
            ):
                data.top5 = [available[k] for k in selected]
                data.overview = output.overview
                data.generatedBy = output.generatedBy
                for key, row in selected.items():
                    _summary(
                        available[key],
                        row.summary,
                        row.whyItMatters,
                        available[key].data.topic,
                        output.generatedBy,
                    )
            else:
                if output:
                    calls.reject("news.curate", group.id, "Top5条数/ID或综述不合格")
                topics: Counter[str] = Counter()
                data.top5 = []
                for candidate in sorted(candidates, key=lambda c: (-c.ruleScore, c.id)):
                    topic = candidate.topic or "other"
                    if (
                        len(data.top5) < settings.international.pipeline.topN
                        and topics[topic] < settings.international.pipeline.ruleMaxPerTopic
                    ):
                        data.top5.append(available[candidate.id])
                        topics[topic] += 1
                labels_text = [settings.international.topicLabels[t] for t in topics][:3]
                data.overview = (
                    "今日新闻主线集中在 " + "、".join(labels_text) + "。" if labels_text else ""
                )
                data.generatedBy = None
                for item in data.top5:
                    _summary(item, None, None, item.data.topic, None)
            ids = {i.id for i in data.top5}
            data.briefs = [i for i in available.values() if i.id not in ids][
                : settings.newsroom.thresholds.internationalBriefs
            ]
            english = [i for i in data.briefs if i.data.article.lang.lower().startswith("en")]
            brief = (
                await calls.run(
                    "news.brief",
                    group.id,
                    BriefInput(
                        items=[
                            NewsPromptItem(
                                id=i.id,
                                title=i.data.article.title,
                                summary=(i.data.article.summary or "")[:500],
                            )
                            for i in english
                        ]
                    ),
                    BriefOutput,
                )
                if english
                else None
            )
            rows = unique_source_rows(brief.briefs, {i.id for i in english}) if brief else {}
            for item in data.briefs:
                row = rows.get(item.id)
                if brief is not None and item in english and (row is None or not row.brief.strip()):
                    calls.reject("news.brief", item.id, "缺失/重复/未知摘要ID，使用RSS摘要或标题")
                _summary(
                    item,
                    row.brief
                    if row and row.brief.strip()
                    else (item.data.article.summary or "")[:120] or None,
                    None,
                    item.data.topic,
                    brief.generatedBy if brief and row and row.brief.strip() else None,
                )
