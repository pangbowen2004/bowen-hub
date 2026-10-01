"""三个版次的确定性候选组版；不调用API、模型或邮件。"""

from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import date, datetime

from hub_contracts import (
    Article,
    CalendarEvent,
    EarningsCardInput,
    Edition,
    EditionLedeFact,
    EditionLedeInput,
    Filing,
    FilingDigestInput,
    InsiderTrade,
    NewsArticlesSection,
    NewsCalendarEventItem,
    NewsCalendarSection,
    NewsCandidate,
    NewsCloseSnapshot,
    NewsEarningsCardItem,
    NewsEarningsSection,
    NewsFilingDigest,
    NewsFilingsSection,
    NewsInsidersSection,
    NewsInsiderTradeItem,
    NewsInternationalSection,
    NewsNewsArticleDigestItem,
    NewsNewsCloseSnapshotItem,
    NewsNewsFilingDigestItem,
    NewsNewsInternationalItem,
    NewsNewsUnchangedTickersItem,
    NewsQuietSection,
    NewsSnapshotSection,
    NewsSourceHealth,
    NewsTickerArticle,
    NewsTickerDigestItem,
    NewsTickerEarnings,
    NewsTickerFiling,
    NewsTickerSection,
    NewsUnchangedTickers,
    TickerDigest,
    TickerDigestInput,
    UsRankInput,
    WatchItem,
)
from hub_core.protocols import TradingCalendar
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline.articles import (
    ArticleCluster,
    canonical_symbol,
    cluster_articles,
    normalise_article,
    rule_score,
)
from hub_newsroom.pipeline.facts import (
    EarningsFact,
    EarningsRelease,
    earnings_facts,
    eligible_filing,
    filing_label,
    filing_prompt,
    insider_text,
    select_insiders,
)
from hub_newsroom.pipeline.international import digest_item, international_pipeline
from hub_newsroom.pipeline.quotes import sector_sync
from hub_newsroom.pipeline.windows import (
    EditionKind,
    WindowPlan,
    calendar_range,
    edition_window,
    prepare_calendar,
)

Section = (
    NewsSnapshotSection
    | NewsTickerSection
    | NewsQuietSection
    | NewsArticlesSection
    | NewsEarningsSection
    | NewsFilingsSection
    | NewsInsidersSection
    | NewsCalendarSection
    | NewsInternationalSection
)


@dataclass(frozen=True)
class PipelineInput:
    articles: Sequence[Article] = ()
    filings: Sequence[Filing] = ()
    insiders: Sequence[InsiderTrade] = ()
    events: Sequence[CalendarEvent] = ()
    earnings_news: Sequence[EarningsRelease] = ()
    exhibit_texts: Mapping[str, str] = field(default_factory=lambda: dict[str, str]())
    filing_texts: Mapping[str, str] = field(default_factory=lambda: dict[str, str]())
    snapshot: NewsCloseSnapshot | None = None
    snapshot_session: date | None = None  # 必须明确快照日期，不猜测来自哪一天。
    sector_changes: Mapping[str, float] = field(default_factory=lambda: dict[str, float]())
    source_health: Sequence[NewsSourceHealth] = ()


@dataclass(frozen=True)
class PipelineResult:
    edition: Edition | None
    plan: WindowPlan
    articles: tuple[Article, ...]
    clusters: tuple[ArticleCluster, ...]
    ticker_inputs: Mapping[str, TickerDigestInput]
    earnings_inputs: Mapping[str, EarningsCardInput]
    earnings_candidates: Mapping[str, EarningsFact]
    filing_inputs: Mapping[str, FilingDigestInput]
    us_rank_input: UsRankInput
    international_candidates: tuple[NewsCandidate, ...]
    lede_input: EditionLedeInput | None


def _watch_roots(watchlist: Sequence[WatchItem]) -> list[WatchItem]:
    roots: dict[str, WatchItem] = {}
    for watch in watchlist:
        if not watch.active:
            continue
        symbol = canonical_symbol(watch.symbol, watchlist)
        if symbol not in roots:
            root = next((w for w in watchlist if w.active and w.symbol == symbol), None)
            roots[symbol] = root or watch.model_copy(
                update={"symbol": symbol, "name": symbol, "underlying": None}
            )
    return list(roots.values())


def _weekly_items(
    history: Sequence[Edition], plan: WindowPlan, settings: Settings
) -> tuple[
    list[NewsEarningsCardItem],
    list[NewsNewsFilingDigestItem],
    list[NewsInsiderTradeItem],
    list[NewsNewsArticleDigestItem],
]:
    earnings: dict[str, NewsEarningsCardItem] = {}
    filings: dict[str, NewsNewsFilingDigestItem] = {}
    insiders: dict[str, NewsInsiderTradeItem] = {}
    international: dict[str, NewsNewsArticleDigestItem] = {}
    from zoneinfo import ZoneInfo

    et = ZoneInfo(settings.newsroom.usMarket["timezone"])
    for edition in sorted(history, key=lambda e: e.id):
        if (
            edition.kind not in {"morning", "premarket"}
            or edition.window.toAt is None
            or edition.window.toAt > plan.end
            or edition.window.toAt.astimezone(et).date() not in plan.sessions
        ):
            continue
        for section in edition.sections:
            if isinstance(section, NewsEarningsSection):
                for item in section.items:
                    key = item.data.sourceAccession or item.data.sourceUrl
                    earnings[key] = item
            elif isinstance(section, NewsFilingsSection):
                for item in section.items:
                    filings[item.data.filing.accession] = item
            elif isinstance(section, NewsInsidersSection):
                for item in section.items:
                    insiders[f"{item.data.accession}:{item.data.transactionIndex}"] = item
            elif isinstance(section, NewsInternationalSection):
                for group in section.items:
                    for item in [*group.data.top5, *group.data.briefs]:
                        key = item.clusterId or item.id
                        old = international.get(key)
                        if old is None or (item.ruleScore or 0) > (old.ruleScore or 0):
                            international[key] = item
    ordered = sorted(international.values(), key=lambda i: (-(i.ruleScore or 0), i.id))
    limit = settings.newsroom.editions["weekly"].internationalTop
    if limit is None:
        raise ValueError("周报缺少国际大事条数配置")
    return list(earnings.values()), list(filings.values()), list(insiders.values()), ordered[:limit]


def build_edition(
    kind: EditionKind,
    now: datetime,
    data: PipelineInput,
    settings: Settings,
    watchlist: Sequence[WatchItem],
    calendar: TradingCalendar,
    history: Sequence[Edition] = (),
) -> PipelineResult:
    plan = edition_window(kind, now, settings, calendar, history)
    rank_rule = settings.newsroom.thresholds.usRank
    empty_rank = UsRankInput(candidates=[], minItems=rank_rule.min, maxItems=rank_rule.max)
    if plan.skip:
        return PipelineResult(None, plan, (), (), {}, {}, {}, {}, empty_rank, (), None)
    normal = tuple(normalise_article(a, settings, watchlist) for a in data.articles)
    roots = _watch_roots(watchlist)
    root_symbols = {w.symbol for w in roots}
    us = [
        a
        for a in normal
        if plan.contains(a.publishedAt, settings)
        and settings.source(a.sourceId).section == "us"
        and settings.source(a.sourceId).enabled
    ]
    clusters = cluster_articles(us, settings)
    scores = {c.id: rule_score(c.representative, plan.end, settings, watchlist) for c in clusters}
    articles = sorted(
        (c.representative for c in clusters),
        key=lambda a: (-scores[a.clusterId or ""], settings.source_order(a.sourceId), a.id),
    )
    fresh_filings = [f for f in data.filings if plan.contains(f.filedAt, settings)]
    selected_filings = [
        f for f in fresh_filings if f.ticker in root_symbols and eligible_filing(f, settings)
    ]
    selected_filings = sorted(
        {f.accession: f for f in selected_filings}.values(), key=lambda f: (f.filedAt, f.accession)
    )
    selected_trades = select_insiders(
        [t for t in data.insiders if plan.contains(t.filedAt, settings)], settings, root_symbols
    )
    facts = earnings_facts(
        fresh_filings,
        data.exhibit_texts,
        [r for r in data.earnings_news if plan.contains(r.published_at, settings)],
        watchlist,
        settings,
    )
    earnings_items = [NewsEarningsCardItem(id=f.id, data=f.card) for f in facts if f.confirmed]
    filing_items = [
        NewsNewsFilingDigestItem(
            id=f.accession, data=NewsFilingDigest(filing=f, digest=None, generatedBy=None)
        )
        for f in selected_filings
    ]
    insider_items = [
        NewsInsiderTradeItem(id=f"{t.accession}:{t.transactionIndex}", data=t)
        for t in selected_trades
    ]
    weekly_international: list[NewsNewsArticleDigestItem] = []
    if kind == "weekly":
        earnings_items, filing_items, insider_items, weekly_international = _weekly_items(
            history, plan, settings
        )
    earnings_inputs = {f.id: f.prompt for f in facts} if kind != "weekly" else {}
    filing_inputs: dict[str, FilingDigestInput] = {}
    names = {w.symbol: w.name for w in roots}
    for item in filing_items:
        filing = item.data.filing
        prompt = filing_prompt(
            filing,
            data.filing_texts.get(filing.accession),
            names.get(filing.ticker, filing.ticker),
            settings,
        )
        if prompt is not None and item.data.digest is None:
            filing_inputs[item.id] = prompt
    snapshot = data.snapshot if plan.mode in {"regular", "weekly"} else None
    if snapshot is not None:
        # 适配器输出顺序不决定展示；只保留配置的指数和有效自选代码。
        allowed_quotes = {w.symbol for w in watchlist if w.active}
        by_index = {p.symbol: p for p in snapshot.indices}
        snapshot = snapshot.model_copy(
            update={
                "indices": [
                    by_index[s] for s in settings.newsroom.snapshot.indexEtfs if s in by_index
                ],
                "watchlist": sorted(
                    [p for p in snapshot.watchlist if p.symbol in allowed_quotes],
                    key=lambda p: (-p.change, p.symbol),
                ),
            }
        )
        closes = [
            day
            for day in calendar.sessions(plan.start.date(), plan.end.date())
            if calendar.close_at(day) <= plan.end
        ]
        if not closes or data.snapshot_session != closes[-1]:
            raise ValueError("快照日期不是窗口内最新收盘交易日，不能展示旧行情")
    changes = {item.symbol: item.change for item in snapshot.watchlist} if snapshot else {}
    sectors = dict(data.sector_changes)
    if snapshot:
        sectors.update({item.symbol: item.change for item in snapshot.indices})
    ticker_inputs: dict[str, TickerDigestInput] = {}
    ticker_items: list[NewsTickerDigestItem] = []
    used_clusters: set[str] = set()
    for watch in roots:
        related = [a for a in articles if watch.symbol in a.tickers]
        filings = [f for f in fresh_filings if f.ticker == watch.symbol]
        earnings = [item for item in earnings_items if item.data.symbol == watch.symbol]
        related_insiders = [item for item in insider_items if item.data.ticker == watch.symbol]
        change = changes.get(watch.symbol)
        by_move = (
            plan.mode == "regular"
            and change is not None
            and abs(change) >= settings.newsroom.thresholds.bigMove
        )
        if not (related or filings or earnings or related_insiders or by_move):
            continue
        sector = watch.sectorEtf or settings.newsroom.snapshot.defaultSectorEtf
        sync = sector_sync(change, sectors.get(sector), settings) if kind != "premarket" else None
        ticker_inputs[watch.symbol] = TickerDigestInput(
            mode="weekly" if kind == "weekly" else "daily",
            symbol=watch.symbol,
            name=watch.name,
            changeText=f"{change:+.2%}" if change is not None else None,
            withSector=sync,
            sectorEtf=sector,
            articles=[
                NewsTickerArticle(
                    id=a.id,
                    title=a.title,
                    summary=a.summary,
                    source=settings.source(a.sourceId).name,
                    publishedAt=a.publishedAt,
                )
                for a in related
            ],
            filings=[
                NewsTickerFiling(
                    id=f.accession,
                    form=f.form,
                    items=f.items,
                    digest=next((i.data.digest for i in filing_items if i.id == f.accession), None),
                )
                for f in filings
            ]
            + [
                NewsTickerFiling(
                    id=item.id, form="4", items=[], digest=insider_text(item.data, settings)
                )
                for item in related_insiders
            ],
            earnings=[NewsTickerEarnings(**i.data.model_dump(), id=i.id) for i in earnings],
        )
        ticker_items.append(
            NewsTickerDigestItem(
                id="ticker:" + watch.symbol,
                ruleScore=max((scores[a.clusterId or ""] for a in related), default=None),
                data=TickerDigest(
                    symbol=watch.symbol,
                    change=change,
                    withSector=sync,
                    whatHappened=""
                    if related or filings or earnings or related_insiders
                    else "未找到直接相关消息",
                    whyItMatters=None,
                    sourceIds=[],
                    points=[],
                    generatedBy=None,
                ),
            )
        )
        used_clusters.update(a.clusterId for a in related if a.clusterId)
    ticker_items.sort(
        key=lambda i: (
            -int(any(e.data.symbol == i.data.symbol for e in earnings_items)),
            -abs(i.data.change or 0),
            -len(ticker_inputs[i.data.symbol].articles),
            next(n for n, w in enumerate(roots) if w.symbol == i.data.symbol),
        )
    )
    market = [a for a in articles if a.clusterId not in used_clusters]
    limit = (
        settings.newsroom.editions[kind].maxMarketItems
        if kind == "premarket"
        else rank_rule.candidates
    )
    if limit is None:
        raise ValueError("盘前缺少市场条数配置")
    market = market[:limit]
    market_items = [digest_item(a, scores[a.clusterId or ""]) for a in market]
    rank = UsRankInput(
        minItems=rank_rule.min,
        maxItems=rank_rule.max,
        candidates=[
            NewsCandidate(
                id=a.id,
                title=a.title,
                summary=a.summary,
                topic=None,
                source=settings.source(a.sourceId).name,
                publishedAt=a.publishedAt,
                tickers=a.tickers,
                ruleScore=scores[a.clusterId or ""],
                paywall=a.paywall,
            )
            for a in market
        ],
    )
    start, end = calendar_range(plan, settings)
    events = prepare_calendar(
        data.events, start, end, settings, watchlist, premarket=kind == "premarket"
    )
    calendar_items = [
        NewsCalendarEventItem(
            id=f"calendar:{e.kind}:{e.date}:{e.title}:{','.join(e.tickers)}", data=e
        )
        for e in events
    ]
    sections: list[Section] = []
    if snapshot is not None:
        sections.append(
            NewsSnapshotSection(
                kind="weekly_performance" if kind == "weekly" else "close_snapshot",
                title="本周表现" if kind == "weekly" else "收盘快照",
                items=[NewsNewsCloseSnapshotItem(id="snapshot", data=snapshot)],
            )
        )
    if ticker_items:
        sections.append(
            NewsTickerSection(
                kind="ticker_weekly" if kind == "weekly" else "ticker_digests",
                title="自选股周记" if kind == "weekly" else "自选股动态",
                items=ticker_items,
            )
        )
    if kind == "morning":
        quiet = [
            w.symbol
            for w in watchlist
            if w.active and canonical_symbol(w.symbol, watchlist) not in ticker_inputs
        ]
        if quiet:
            sections.append(
                NewsQuietSection(
                    kind="unchanged_tickers",
                    title="无重要消息",
                    items=[
                        NewsNewsUnchangedTickersItem(
                            id="quiet", data=NewsUnchangedTickers(symbols=quiet)
                        )
                    ],
                )
            )
    if kind != "weekly" and market_items:
        title = {
            "regular": "美股要闻",
            "weekend": "周末要闻",
            "lookahead": "本周前瞻",
            "premarket": "早报之后的新消息",
        }[plan.mode]
        sections.append(
            NewsArticlesSection(
                kind="new_messages" if kind == "premarket" else "us_news",
                title=title,
                items=market_items,
            )
        )
    if earnings_items:
        sections.append(
            NewsEarningsSection(
                kind="earnings_review"
                if kind == "weekly"
                else "premarket_earnings"
                if kind == "premarket"
                else "earnings",
                title="财报回顾"
                if kind == "weekly"
                else "盘前已发布财报"
                if kind == "premarket"
                else "财报",
                items=earnings_items,
            )
        )
    if filing_items and kind != "premarket":
        sections.append(
            NewsFilingsSection(
                kind="important_filings" if kind == "weekly" else "filings",
                title="重要公告" if kind == "weekly" else "公告",
                items=filing_items,
            )
        )
    if insider_items and kind != "premarket":
        sections.append(
            NewsInsidersSection(kind="insider_trades", title="内部人交易", items=insider_items)
        )
    sections.append(
        NewsCalendarSection(
            kind="next_week_calendar" if kind == "weekly" else "calendar",
            title="下周日程"
            if kind == "weekly"
            else "本周日程"
            if plan.mode == "lookahead"
            else "今晚日程"
            if events
            else "今晚没有重要日程",
            items=calendar_items,
        )
    )
    international_candidates: tuple[NewsCandidate, ...] = ()
    if kind == "morning":
        international = international_pipeline(normal, plan.end, settings)
        international_candidates = international.candidates
        clusters = (*clusters, *international.clusters)
        if international.data.top5 or international.data.briefs:
            sections.append(
                NewsInternationalSection(
                    kind="international",
                    title="国际与科技",
                    items=[NewsNewsInternationalItem(id="international", data=international.data)],
                )
            )
    elif kind == "weekly" and weekly_international:
        sections.append(
            NewsArticlesSection(
                kind="international_weekly", title="国际大事一周", items=weekly_international
            )
        )
    edition = Edition(
        id=f"{kind}-{plan.day}",
        kind=kind,
        date=plan.day,
        window=plan.window,
        generatedAt=plan.end,
        lede=None,
        sections=sections,
        sources=list(data.source_health),
        aiUsage=None,
        email=None,
    )
    facts_for_lede = lede_facts(edition, settings)
    lede = EditionLedeInput(mode=kind, date=plan.day, facts=facts_for_lede)
    return PipelineResult(
        edition,
        plan,
        normal,
        tuple(clusters),
        ticker_inputs,
        earnings_inputs,
        {f.id: f for f in facts} if kind != "weekly" else {},
        filing_inputs,
        rank,
        international_candidates,
        lede,
    )


def lede_facts(edition: Edition, settings: Settings) -> list[EditionLedeFact]:
    facts: list[EditionLedeFact] = []
    for section in edition.sections:
        for item in section.items:
            if isinstance(section, NewsSnapshotSection) and isinstance(
                item, NewsNewsCloseSnapshotItem
            ):
                snapshot = item.data
                text = "；".join(
                    f"{p.symbol} {p.change:+.2%}" for p in [*snapshot.indices, *snapshot.watchlist]
                )
                if snapshot.treasury10Year is not None:
                    text += f"；10年期美债收益率 {snapshot.treasury10Year}%"
                if snapshot.vix is not None:
                    text += f"；VIX {snapshot.vix}"
            elif isinstance(item, NewsTickerDigestItem):
                text = item.data.symbol + (
                    f" {item.data.change:+.2%}" if item.data.change is not None else ""
                )
                text += "：" + item.data.whatHappened
                if item.data.withSector is True:
                    text += "；与板块/大盘同向且对照ETF绝对涨跌幅达到配置阈值"
            elif isinstance(item, NewsNewsArticleDigestItem):
                text = item.data.article.title + (
                    "；" + item.data.summary if item.data.summary else ""
                )
            elif isinstance(item, NewsEarningsCardItem):
                text = f"{item.data.symbol} 已发布财报" + (
                    "；" + item.data.takeaway if item.data.takeaway else ""
                )
                text += "；" + "；".join(f"{f.name} {f.value}" for f in item.data.figures)
            elif isinstance(item, NewsNewsFilingDigestItem):
                text = item.data.filing.ticker + " " + filing_label(item.data.filing, settings)
            elif isinstance(item, NewsInsiderTradeItem):
                text = item.data.ticker + " " + insider_text(item.data, settings)
            elif isinstance(item, NewsCalendarEventItem):
                text = f"{item.data.date} {item.data.title}" + (
                    f" {item.data.at:%H:%M}" if item.data.at else ""
                )
                text += (
                    " "
                    + "、".join(item.data.tickers)
                    + (" " + item.data.timing if item.data.timing else "")
                )
            elif isinstance(item, NewsNewsInternationalItem):
                text = "；".join(i.data.article.title for i in [*item.data.top5, *item.data.briefs])
            else:
                continue
            facts.append(EditionLedeFact(id=item.id, text=text))
    return facts
