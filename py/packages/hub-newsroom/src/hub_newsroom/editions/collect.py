"""采集编排：复用适配器，任何单源失败均留下健康状态并继续。"""

import re
from collections.abc import Callable, Sequence
from dataclasses import replace
from datetime import UTC, datetime, timedelta
from typing import TypeVar

from hub_contracts import Article, EarningsCardOutput, NewsSourceHealth, WatchItem
from hub_core.http import HttpClient
from hub_core.protocols import PriceBar, TradingCalendar
from hub_core.settings import Settings as EnvironmentSettings
from hub_newsroom.ai.enrich import is_earnings_release
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline import (
    EarningsRelease,
    PipelineInput,
    canonical_symbol,
    close_snapshot,
    normalise_article,
)
from hub_newsroom.pipeline.quotes import price_changes
from hub_newsroom.pipeline.windows import WindowPlan, calendar_range
from hub_providers.alpaca.adapter import AlpacaSource
from hub_providers.cboe.adapter import CboeSource
from hub_providers.common.base import Provider
from hub_providers.common.config import SourceConfig
from hub_providers.finnhub.adapter import FinnhubSource
from hub_providers.fred.adapter import FredSource
from hub_providers.rss.adapter import RssSource
from hub_providers.sec.adapter import SecSource
from hub_providers.tiingo.adapter import TiingoSource
from hub_providers.treasury.adapter import TreasurySource

T = TypeVar("T")


def earnings_news(articles: Sequence[Article]) -> list[EarningsRelease]:
    """只让有正文的业绩新闻成为待确认候选，不以标题单独确证财报。"""
    result: list[EarningsRelease] = []
    for article in articles:
        if not article.summary or not re.search(
            r"earnings|financial results|quarterly results|财报|财务业绩|季度业绩",
            article.title,
            re.IGNORECASE,
        ):
            continue
        # 复用T12原文证据判定；period仅用于其非空要求，不向产出伪造财报期数。
        confirmed = is_earnings_release(
            EarningsCardOutput(period="原文证据检查", figures=[], guidance=None, takeaway=""),
            article.summary,
        )
        for symbol in article.tickers:
            result.append(
                EarningsRelease(
                    symbol, article.url, article.summary, article.publishedAt, confirmed=confirmed
                )
            )
    return result


class Collector:
    def __init__(
        self,
        environment: EnvironmentSettings,
        settings: Settings,
        sources: Sequence[SourceConfig],
        http: HttpClient,
        calendar: TradingCalendar,
    ) -> None:
        self.environment = environment
        self.settings = settings
        self.sources = sources
        self.http = http
        self.calendar = calendar
        self.health: dict[str, NewsSourceHealth] = {}

    def attempt(
        self, source: str, action: Callable[[], T], default: T, *, provider: Provider | None = None
    ) -> T:
        try:
            value = action()
        except Exception as error:
            reason = provider.health.error if provider and provider.health else None
            self.health[source] = NewsSourceHealth(
                id=source,
                checkedAt=datetime.now(UTC),
                status="failed",
                error=reason or f"{type(error).__name__}：来源不可用",
            )
            return default
        # 同一来源多个操作中有一次失败，不能被后来成功掩盖。
        if source not in self.health or self.health[source].status != "failed":
            self.health[source] = NewsSourceHealth(
                id=source, checkedAt=datetime.now(UTC), status="ok", error=None
            )
        return value

    def missing(self, source: str, reason: str) -> None:
        self.health[source] = NewsSourceHealth(
            id=source, checkedAt=datetime.now(UTC), status="failed", error=reason
        )

    def collect(self, plan: WindowPlan, watchlist: Sequence[WatchItem]) -> PipelineInput:
        self.health = {}
        data = PipelineInput()
        articles: list[Article] = []
        active = [w for w in watchlist if w.active]
        roots = list(
            dict.fromkeys(
                [
                    *(canonical_symbol(w.symbol, watchlist) for w in active),
                    *self.settings.newsroom.megaCaps,
                ]
            )
        )
        calendar_start, calendar_end = calendar_range(plan, self.settings)
        env = self.environment
        for source in self.sources:
            if not source.enabled or source.type in {"alpaca_bars", "tiingo", "treasury", "cboe"}:
                continue
            self.http.timeout = source.timeout
            if source.type == "rss":
                provider = RssSource(self.http, source)
                articles.extend(
                    self.attempt(
                        source.id,
                        lambda p=provider: list(p.fetch_news(plan.start, plan.end)),
                        [],
                        provider=provider,
                    )
                )
            elif source.type == "alpaca_news":
                if not env.alpaca_api_key_id or not env.alpaca_api_secret_key:
                    self.missing(source.id, "缺少 Alpaca 凭据；自选股新闻退回 RSS 匹配")
                    continue
                alpaca = AlpacaSource(
                    self.http,
                    env.alpaca_api_key_id.get_secret_value(),
                    env.alpaca_api_secret_key.get_secret_value(),
                    adjustment="all",
                    source_id=source.id,
                )
                articles.extend(
                    self.attempt(
                        source.id,
                        lambda p=alpaca: list(p.fetch_news(plan.start, plan.end)),
                        [],
                        provider=alpaca,
                    )
                )
            elif source.type == "sec":
                if not env.sec_user_agent:
                    self.missing(source.id, "缺少 SEC_USER_AGENT")
                    continue
                rules = self.settings.newsroom.filings
                sec = SecSource(
                    self.http,
                    env.sec_user_agent,
                    forms=[
                        rules.eightK,
                        rules.sixK,
                        *rules.periodic,
                        *rules.offerings,
                        *rules.ownership,
                    ],
                )
                filings = self.attempt(
                    source.id,
                    lambda p=sec: list(p.fetch_filings(plan.start, plan.end, roots)),
                    [],
                    provider=sec,
                )
                insiders = self.attempt(
                    source.id,
                    lambda p=sec: list(p.fetch_insiders(plan.start, plan.end, roots)),
                    [],
                    provider=sec,
                )
                texts: dict[str, str] = {}
                exhibits: dict[str, str] = {}
                for filing in filings:
                    if filing.form.upper().removesuffix("/A") == rules.eightK and any(
                        rules.items8k[item].digest for item in filing.items if item in rules.items8k
                    ):
                        text = self.attempt(
                            source.id, lambda f=filing, p=sec: p.fetch_text(f.url), "", provider=sec
                        )
                        if text:
                            texts[filing.accession] = text
                    if (
                        filing.form.upper().removesuffix("/A") == rules.eightK
                        and "2.02" in filing.items
                    ) or filing.form.upper().removesuffix("/A") == rules.sixK:
                        for exhibit in filing.exhibits:
                            if exhibit.name.upper().startswith("EX-99."):
                                text = self.attempt(
                                    source.id,
                                    lambda e=exhibit, p=sec: p.fetch_text(e.url),
                                    "",
                                    provider=sec,
                                )
                                if text:
                                    exhibits[exhibit.url] = text
                data = replace(
                    data,
                    filings=filings,
                    insiders=insiders,
                    filing_texts=texts,
                    exhibit_texts=exhibits,
                )
            elif source.type == "fred":
                if not env.fred_api_key:
                    self.missing(source.id, "缺少 FRED_API_KEY")
                    continue
                fred = FredSource(
                    self.http,
                    env.fred_api_key.get_secret_value(),
                    [release.model_dump() for release in self.settings.newsroom.macro.releases],
                    importance="unspecified",
                )
                events = self.attempt(
                    source.id,
                    lambda p=fred: list(p.fetch_events(calendar_start, calendar_end)),
                    [],
                    provider=fred,
                )
                data = replace(data, events=[*data.events, *events])
            elif source.type == "finnhub":
                if not env.finnhub_api_key:
                    self.missing(source.id, "缺少 FINNHUB_API_KEY")
                    continue
                finnhub = FinnhubSource(
                    self.http, env.finnhub_api_key.get_secret_value(), importance="unspecified"
                )
                events = self.attempt(
                    source.id,
                    lambda p=finnhub: list(p.fetch_events(calendar_start, calendar_end, roots)),
                    [],
                    provider=finnhub,
                )
                data = replace(data, events=[*data.events, *events])
        data = replace(
            data,
            articles=articles,
            earnings_news=earnings_news(
                [normalise_article(row, self.settings, watchlist) for row in articles]
            ),
        )
        if plan.kind != "premarket" and (plan.kind == "weekly" or plan.mode == "regular"):
            data = self.quotes(data, plan, active)
        return replace(data, source_health=tuple(self.health.values()))

    def quotes(
        self, data: PipelineInput, plan: WindowPlan, watchlist: Sequence[WatchItem]
    ) -> PipelineInput:
        sessions = [
            day
            for day in self.calendar.sessions(
                plan.start.date() - timedelta(days=7), plan.end.date()
            )
            if self.calendar.close_at(day) <= plan.end
        ]
        if not sessions:
            return data
        session = sessions[-1]
        weekly = (
            tuple(day for day in plan.sessions if self.calendar.close_at(day) <= plan.end)
            if plan.kind == "weekly"
            else None
        )
        if weekly is not None and not weekly:
            return data
        start = self.calendar.previous_session(weekly[0] if weekly else session)
        symbols = list(
            dict.fromkeys(
                [
                    *self.settings.newsroom.snapshot.indexEtfs,
                    *(w.symbol for w in watchlist),
                    *(
                        w.sectorEtf or self.settings.newsroom.snapshot.defaultSectorEtf
                        for w in watchlist
                    ),
                ]
            )
        )
        stocks = [s for s in symbols if s not in {"BTC", "XRP"}]
        crypto = [s for s in symbols if s in {"BTC", "XRP"}]
        crypto_day = plan.end.astimezone(UTC).date() - timedelta(days=1)
        bars: list[PriceBar] = []
        treasury: float | None = None
        vix: float | None = None
        env = self.environment
        for source in self.sources:
            if not source.enabled:
                continue
            self.http.timeout = source.timeout
            if source.type == "alpaca_bars":
                if not env.alpaca_api_key_id or not env.alpaca_api_secret_key:
                    self.missing(source.id, "缺少 Alpaca 凭据；股票快照尝试 Tiingo 兜底")
                    continue
                alpaca = AlpacaSource(
                    self.http,
                    env.alpaca_api_key_id.get_secret_value(),
                    env.alpaca_api_secret_key.get_secret_value(),
                    adjustment="all",
                    source_id=source.id,
                )
                bars.extend(
                    self.attempt(
                        source.id,
                        lambda p=alpaca: list(p.fetch_bars(stocks, start, session)),
                        [],
                        provider=alpaca,
                    )
                )
                if crypto and weekly is None:
                    bars.extend(
                        self.attempt(
                            source.id,
                            lambda p=alpaca: list(
                                p.fetch_bars(crypto, crypto_day - timedelta(days=1), crypto_day)
                            ),
                            [],
                            provider=alpaca,
                        )
                    )
            elif source.type == "tiingo":
                complete = {
                    s
                    for s in stocks
                    if any(b.symbol == s and b.date == start for b in bars)
                    and any(b.symbol == s and b.date == session for b in bars)
                }
                needed = [s for s in stocks if s not in complete]
                if not needed:
                    continue
                if not env.tiingo_api_key:
                    self.missing(source.id, "缺少 TIINGO_API_KEY；缺失快照不补造")
                    continue
                tiingo = TiingoSource(
                    self.http, env.tiingo_api_key.get_secret_value(), price_field="adjClose"
                )
                fallback = self.attempt(
                    source.id,
                    lambda p=tiingo, requested=needed: list(
                        p.fetch_bars(requested, start, session)
                    ),
                    [],
                    provider=tiingo,
                )
                # 同一股票端点均取兜底，不能混合供应商/复权端点。
                bars = [bar for bar in bars if bar.symbol not in needed] + fallback
            elif (
                source.type == "treasury"
                and self.settings.newsroom.snapshot.treasury10y
                and source.url
            ):
                treasury_source = TreasurySource(self.http, source.url)
                treasury = self.attempt(
                    source.id,
                    lambda p=treasury_source: p.fetch_yield(session),
                    None,
                    provider=treasury_source,
                )
            elif source.type == "cboe" and self.settings.newsroom.snapshot.vix and source.url:
                cboe = CboeSource(self.http, source.url)
                vix = self.attempt(
                    source.id, lambda p=cboe: p.fetch_vix(session), None, provider=cboe
                )
        snapshot = close_snapshot(
            bars,
            session,
            self.calendar,
            watchlist,
            self.settings,
            week_sessions=weekly,
            crypto_day=crypto_day if weekly is None else None,
            treasury10_year=treasury,
            vix=vix,
        )
        sectors = {row.symbol: row.change for row in price_changes(bars, stocks, start, session)}
        return replace(data, snapshot=snapshot, snapshot_session=session, sector_changes=sectors)
