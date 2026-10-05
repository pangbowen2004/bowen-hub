"""发行生命周期：先归档，再发信，成功才回写发送时间。"""

import logging
from collections.abc import Callable, Sequence
from dataclasses import dataclass, replace
from datetime import UTC, date, datetime
from typing import Protocol
from uuid import uuid4
from zoneinfo import ZoneInfo

from hub_ai.runtime import Runtime
from hub_contracts import (
    Edition,
    EditionEmail,
    NewsCalendarSection,
    NewsEarningsSection,
    Run,
    WatchItem,
)
from hub_core.protocols import TradingCalendar
from hub_newsroom.ai import EnrichmentResult, enrich_edition
from hub_newsroom.common.chinese import chinese_edition
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline import PipelineInput, build_edition, trim_edition
from hub_newsroom.pipeline.windows import (
    EditionKind,
    WindowPlan,
    edition_window,
    premarket_in_guard,
)
from hub_newsroom.render.mail import Link, Mail, RenderContext, body_text, render_mail

from .repository import Store

logger = logging.getLogger(__name__)


class Transport(Protocol):
    def send(self, subject: str, text: str, html: str) -> None: ...
    def notify_failure(
        self, job: str, business_date: date, summary: str, actions_url: str
    ) -> bool: ...


class Collect(Protocol):
    def collect(self, plan: WindowPlan, watchlist: Sequence[WatchItem]) -> PipelineInput: ...


@dataclass(frozen=True)
class Options:
    kind: EditionKind
    date: date | None = None
    no_email: bool = False
    no_ai: bool = False
    force: bool = False
    ignore_window: bool = False


@dataclass(frozen=True)
class Outcome:
    edition: Edition | None
    mail: Mail | None
    skipped: str | None
    sent: bool


def edition_time(now: datetime, day: date | None, timezone: str) -> datetime:
    if now.tzinfo is None:
        raise ValueError("时钟必须有时区")
    local = now.astimezone(ZoneInfo(timezone))
    # date只改变业务日期；盘前补跑仍需通过时间窗，或显式ignore-window。
    return (
        local.replace(year=day.year, month=day.month, day=day.day).astimezone(UTC)
        if day
        else now.astimezone(UTC)
    )


def render_context(
    settings: Settings,
    watchlist: Sequence[WatchItem],
    data: PipelineInput,
    enriched: EnrichmentResult | None,
    no_ai: bool,
    console_url: str | None,
) -> RenderContext:
    references = {
        row.id: Link(row.title, row.url, settings.source(row.sourceId).name)
        for row in data.articles
    }
    references.update(
        {row.accession: Link(row.ticker + " " + row.form, row.url) for row in data.filings}
    )
    if enriched and enriched.edition:
        for section in enriched.edition.sections:
            if isinstance(section, NewsEarningsSection):
                references.update(
                    {
                        item.id: Link(item.data.symbol + " 已发布财报", item.data.sourceUrl)
                        for item in section.items
                    }
                )
    headlines: dict[str, Sequence[Link]] = {}
    for watch in watchlist:
        symbol = watch.underlying or watch.symbol
        rows = [
            Link(row.title, row.url)
            for row in data.articles
            if symbol in row.tickers or watch.symbol in row.tickers
        ]
        rows.extend(
            Link(row.ticker + " " + row.form, row.url)
            for row in data.filings
            if row.ticker == symbol
        )
        headlines[symbol] = tuple(rows)
    if enriched:
        for symbol, rows in enriched.headlines.items():
            headlines[symbol] = tuple(Link(row.title, row.url) for row in rows)
            references.update(
                {
                    row.id: Link(
                        row.title,
                        row.url,
                        references[row.id].source if row.id in references else "",
                    )
                    for row in rows
                }
            )
    reasons = (
        tuple(f"{row.capability}（{row.key}）降级：{row.reason}" for row in enriched.fallbacks)
        if enriched
        else ()
    )
    if no_ai:
        reasons += ("已指定 --no-ai，本期只列标题和事实来源。",)
    return RenderContext(
        settings,
        watchlist,
        references,
        headlines,
        reasons,
        no_ai or bool(enriched and enriched.headline_only),
        console_url,
    )


class Publisher:
    def __init__(
        self,
        settings: Settings,
        store: Store,
        collector: Collect,
        calendar: TradingCalendar,
        transport: Transport,
        *,
        runtime: Runtime | None = None,
        clock: Callable[[], datetime] = lambda: datetime.now(UTC),
        subjects: dict[str, str],
        console_url: str | None = None,
        actions_url: str = "",
        run_suffix: str | None = None,
        source_limit: int = 3,
    ) -> None:
        self.settings = settings
        self.store = store
        self.collector = collector
        self.calendar = calendar
        self.transport = transport
        self.runtime = runtime
        self.clock = clock
        self.subjects = subjects
        self.console_url = console_url
        self.actions_url = actions_url
        self.run_suffix = run_suffix
        self.source_limit = source_limit

    async def publish(self, options: Options) -> Outcome:
        started = self.clock()
        now = edition_time(started, options.date, self.settings.newsroom.timezone)
        day = now.astimezone(ZoneInfo(self.settings.newsroom.timezone)).date()
        job = "news-" + options.kind
        run = Run(
            id=f"{job}-{day}-{self.run_suffix or uuid4().hex}",
            job=job,
            date=day,
            status="running",
            startedAt=started,
            finishedAt=None,
            stats={},
            error=None,
        )
        sent = False
        try:
            self.store.run(run)
            # 必须在读取/采集/模型之前检查盘前时窗；force不绕过守卫。
            if options.kind == "premarket":
                et = now.astimezone(ZoneInfo(self.settings.newsroom.usMarket["timezone"]))
                if not self.calendar.is_session(et.date()):
                    return self.finish_skip(run, "纽交所休市")
                if not options.ignore_window and not premarket_in_guard(
                    now, self.calendar, self.settings
                ):
                    return self.finish_skip(run, "盘前运行时间窗外")
            history = self.store.history(day)
            ident = f"{options.kind}-{day}"
            existing = next((row for row in history if row.id == ident), None)
            if existing and existing.email and existing.email.sentAt and not options.force:
                return self.finish_skip(run, "本版次已发送；使用 --force 才重发", existing)
            # 本期重发不能把自己的sentAt当作上一期窗口起点。
            prior_history = [row for row in history if row.id != ident]
            watchlist = self.store.watchlist()
            plan = edition_window(options.kind, now, self.settings, self.calendar, prior_history)
            if plan.skip:
                return self.finish_skip(run, "纽交所休市")
            data = self.collector.collect(plan, watchlist)
            if options.kind == "weekly":
                archived = self.store.weekly_facts(day, watchlist)
                data = replace(
                    data,
                    articles=tuple(
                        {row.id: row for row in [*archived.articles, *data.articles]}.values()
                    ),
                    filings=tuple(
                        {row.accession: row for row in [*archived.filings, *data.filings]}.values()
                    ),
                )
            pipeline = build_edition(
                options.kind, now, data, self.settings, watchlist, self.calendar, prior_history
            )
            if pipeline.edition is None:
                return self.finish_skip(run, "没有可生成的版次")
            enriched = None
            edition = pipeline.edition
            if not options.no_ai:
                if self.runtime is None:
                    raise ValueError("未提供能力运行时")
                enriched = await enrich_edition(
                    pipeline, self.settings, self.runtime, run_id=run.id
                )
                if enriched.edition is not None:
                    edition = enriched.edition
            chinese_stories = 0
            if not options.no_ai:
                edition, chinese_stories = chinese_edition(edition)
                if not options.no_email and chinese_stories == 0:
                    run.stats = {
                        "chineseStories": 0,
                        "aiCalls": len(enriched.calls) if enriched else 0,
                    }
                    if enriched:
                        self.store.batch("/v1/internal/ai-calls/batch", enriched.calls)
                    raise NoChineseNewsError("本期没有中文新闻正文")
            elif not options.no_email:
                raise NoChineseNewsError("--no-ai 只能生成不发送的检查稿")
            # 上游API归一字段由T11统一；出处链接映射也采用其归一/关联股票结果。
            data = replace(data, articles=pipeline.articles)
            context = render_context(
                self.settings, watchlist, data, enriched, options.no_ai, self.console_url_for(ident)
            )
            context = replace(context, source_limit=self.source_limit)
            original = edition
            trimmed = trim_edition(edition, self.settings, lambda value: body_text(value, context))
            edition = trimmed.edition
            if trimmed.removed_ids:
                # 导语事实依赖整个版面，不让原导语继续引用已删除条目。
                edition.lede = None
                context = replace(
                    context,
                    fallbacks=(
                        *context.fallbacks,
                        "阅读预算裁剪已删除条目；导语按 omit 降级，避免引用已移除事实。",
                    ),
                )
                # 国际综述同样是多个条目的综合生成；删其任何子项后省略该综述。
                from hub_contracts import NewsInternationalSection

                for section in edition.sections:
                    if isinstance(section, NewsInternationalSection):
                        for item in section.items:
                            item.data.overview = ""
                trimmed = trim_edition(
                    edition, self.settings, lambda value: body_text(value, context)
                )
                edition = trimmed.edition
            if not options.no_ai:
                edition, chinese_stories = chinese_edition(edition)
                if not options.no_email and chinese_stories == 0:
                    raise NoChineseNewsError("裁剪后没有中文新闻正文")
            # 重发失败不能抹去此前已确认的发送事实；不生成新的sentAt。
            edition.email = (
                existing.email.model_copy(deep=True)
                if existing and existing.email
                else EditionEmail(sentAt=None)
            )
            mail = render_mail(
                edition, context, self.subjects[options.kind].format(date=day.isoformat())
            )
            run.stats = {
                "bodyChars": mail.body_chars,
                "chineseStories": chinese_stories,
                "removedIds": sorted(original_item_ids(original) - original_item_ids(edition)),
                "aiCalls": len(enriched.calls) if enriched else 0,
                "fallbacks": list(context.fallbacks),
                "unconfirmedEarnings": list(enriched.unconfirmed) if enriched else [],
                "snapshotAdjustment": "Alpaca all / Tiingo adjClose；同股票两端不混源",
                "sent": False,
            }
            self.persist(data, original, edition, mail, enriched)
            if not options.no_email:
                self.transport.send(mail.subject, mail.text, mail.html)
                sent = True
                edition.email = EditionEmail(sentAt=self.clock())
                self.store.edition(edition)
            run.stats["sent"] = sent
            run.status = "succeeded"
            run.finishedAt = self.clock()
            self.store.run(run)
            return Outcome(edition, mail, None, sent)
        except Exception as error:
            # 类型是安全分类；不把Pydantic/provider异常原文、URL或输入正文写日志/邮件。
            summary = (
                "本期没有中文新闻正文，未发送简报"
                if isinstance(error, NoChineseNewsError)
                else f"发行失败（{type(error).__name__}）"
            ) + ("；SMTP已成功，但发送标记/API记录未完成，重跑前核对邮箱" if sent else "")
            run.status = "failed"
            run.finishedAt = self.clock()
            run.error = summary
            run.stats["sent"] = sent
            try:
                self.store.run(run)
            except Exception:
                logger.error("失败运行记录未写入API")
            if not options.no_email:
                try:
                    self.transport.notify_failure(job, day, summary, self.actions_url)
                except Exception:
                    logger.error("失败通知邮件未发出")
            raise PublicationError(summary) from None

    def console_url_for(self, ident: str) -> str | None:
        return self.console_url.rstrip("/") + "/news/" + ident if self.console_url else None

    def finish_skip(self, run: Run, reason: str, edition: Edition | None = None) -> Outcome:
        run.status = "succeeded"
        run.finishedAt = self.clock()
        run.stats = {"skipped": reason, "sent": False}
        self.store.run(run)
        return Outcome(edition, None, reason, False)

    def persist(
        self,
        data: PipelineInput,
        original: Edition,
        edition: Edition,
        mail: Mail,
        enriched: EnrichmentResult | None,
    ) -> None:
        self.store.batch("/v1/internal/news/articles/batch", data.articles)
        self.store.batch("/v1/internal/news/filings/batch", data.filings)
        self.store.batch("/v1/internal/news/insider-trades/batch", data.insiders)
        calendar = [
            item.data
            for section in original.sections
            if isinstance(section, NewsCalendarSection)
            for item in section.items
        ]
        self.store.batch("/v1/internal/news/calendar/batch", calendar)
        earnings = [
            item.data
            for section in original.sections
            if isinstance(section, NewsEarningsSection)
            for item in section.items
        ]
        self.store.batch("/v1/internal/news/earnings-cards/batch", earnings)
        if enriched:
            self.store.batch("/v1/internal/ai-calls/batch", enriched.calls)
        for source in data.source_health:
            self.store.health(source)
        self.store.edition(edition)
        self.store.html(edition.id, mail.html)


class NoChineseNewsError(RuntimeError):
    pass


class PublicationError(RuntimeError):
    pass


def original_item_ids(edition: Edition) -> set[str]:
    from hub_contracts import NewsInternationalSection

    ids: set[str] = set()
    for section in edition.sections:
        ids.update(item.id for item in section.items)
        if isinstance(section, NewsInternationalSection):
            for group in section.items:
                ids.update(row.id for row in [*group.data.top5, *group.data.briefs])
    return ids
