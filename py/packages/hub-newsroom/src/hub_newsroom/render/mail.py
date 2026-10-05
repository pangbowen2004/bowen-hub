"""邮件纯渲染；不读取环境、文件、网络或发信。"""

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass, field
from datetime import datetime
from urllib.parse import urlsplit
from zoneinfo import ZoneInfo

import css_inline
from jinja2 import Environment, StrictUndefined

from hub_contracts import (
    Edition,
    NewsArticlesSection,
    NewsCalendarSection,
    NewsEarningsSection,
    NewsFilingsSection,
    NewsInsidersSection,
    NewsQuietSection,
    NewsSnapshotSection,
    NewsTickerSection,
    WatchItem,
)
from hub_newsroom.common.chinese import chinese_title
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline.facts import filing_label, insider_text


@dataclass(frozen=True)
class Link:
    title: str
    url: str
    source: str = ""
    published_at: datetime | None = None


def source_link_label(link: Link) -> str:
    label = link.title if re.search(r"[\u3400-\u9fff]", link.title) else ""
    if not label and link.published_at is not None:
        label = link.published_at.astimezone(ZoneInfo("Asia/Singapore")).strftime("%m-%d %H:%M")
    return (link.source or "原文") + (" · " + label if label else "") + " ↗"


@dataclass(frozen=True)
class Row:
    lines: tuple[str, ...]
    links: tuple[Link, ...] = ()
    change: float | None = None

    @property
    def tone(self) -> str:
        return (
            "rise"
            if self.change is not None and self.change > 0
            else "fall"
            if self.change is not None and self.change < 0
            else "flat"
        )


@dataclass(frozen=True)
class Section:
    anchor: str
    title: str
    rows: tuple[Row, ...]


@dataclass(frozen=True)
class RenderContext:
    settings: Settings
    watchlist: Sequence[WatchItem] = ()
    references: Mapping[str, Link] = field(default_factory=lambda: dict[str, Link]())
    ticker_headlines: Mapping[str, Sequence[Link]] = field(
        default_factory=lambda: dict[str, Sequence[Link]]()
    )
    fallbacks: tuple[str, ...] = ()
    headline_only: bool = False
    console_url: str | None = None
    source_limit: int = 3


@dataclass(frozen=True)
class Mail:
    subject: str
    text: str
    html: str
    body_chars: int


def safe_link(title: str, url: str) -> Link | None:
    if any(ord(char) < 32 for char in url) or "\\" in url:
        return None
    try:
        parsed = urlsplit(url)
        if (
            parsed.scheme in {"http", "https"}
            and parsed.hostname
            and not parsed.username
            and not parsed.password
        ):
            return Link(title, url)
    except ValueError:
        pass
    return None


def links(rows: Sequence[Link]) -> tuple[Link, ...]:
    return tuple(valid for row in rows if (valid := safe_link(row.title, row.url)) is not None)


def company(symbol: str, context: RenderContext) -> str:
    row = next((w for w in context.watchlist if w.symbol == symbol), None)
    return f"{row.name}（{symbol}）" if row and row.name != symbol else symbol


def sections(edition: Edition, context: RenderContext) -> tuple[Section, ...]:
    result: list[Section] = []
    for section in edition.sections:
        rows: list[Row] = []
        if isinstance(section, NewsSnapshotSection):
            if context.headline_only:
                continue
            for item in section.items:
                for change in [*item.data.indices, *item.data.watchlist]:
                    rows.append(
                        Row(
                            (f"{company(change.symbol, context)} {change.change:+.2%}",),
                            change=change.change,
                        )
                    )
                if item.data.treasury10Year is not None:
                    rows.append(Row((f"10年期美债收益率 {item.data.treasury10Year:g}%",)))
                if item.data.vix is not None:
                    rows.append(Row((f"VIX {item.data.vix:g}",)))
        elif isinstance(section, NewsTickerSection):
            for item in section.items:
                data = item.data
                source_ids = dict.fromkeys(
                    [*data.sourceIds, *(key for point in data.points for key in point.sourceIds)]
                )
                refs = [context.references[key] for key in source_ids if key in context.references]
                if context.headline_only or data.generatedBy is None:
                    refs = (
                        refs
                        or list(context.ticker_headlines.get(data.symbol, ()))[
                            : context.source_limit
                        ]
                    )
                    rows.append(
                        Row(
                            (company(data.symbol, context),)
                            if refs
                            else (company(data.symbol, context), "未找到直接相关消息"),
                            links(refs),
                        )
                    )
                else:
                    refs = [
                        Link(
                            source_link_label(ref),
                            ref.url,
                        )
                        for ref in refs
                    ]
                    change = f" {data.change:+.2%}" if data.change is not None else ""
                    lines = [company(data.symbol, context) + change, data.whatHappened]
                    if data.whyItMatters:
                        lines.append(data.whyItMatters)
                    lines.extend(point.text for point in data.points)
                    rows.append(Row(tuple(lines), links(refs), data.change))
        elif isinstance(section, NewsQuietSection):
            if not context.headline_only:
                rows.extend(
                    Row(("无重要消息：" + "、".join(item.data.symbols),)) for item in section.items
                )
        elif isinstance(section, NewsArticlesSection):
            for item in section.items:
                data = item.data
                source = context.settings.source(data.article.sourceId).name
                title = (
                    data.article.title
                    if context.headline_only
                    else chinese_title(data.article.title, data.summary)
                )
                lines = [title + " · " + source]
                if not context.headline_only:
                    lines.extend(value for value in (data.summary, data.whyItMatters) if value)
                rows.append(
                    Row(
                        tuple(lines),
                        links(
                            [
                                Link(
                                    "原文 →"
                                    if context.headline_only
                                    else source_link_label(
                                        Link(
                                            data.article.title,
                                            data.article.url,
                                            source,
                                            data.article.publishedAt,
                                        )
                                    ),
                                    data.article.url,
                                )
                            ]
                        ),
                    )
                )
        elif isinstance(section, NewsEarningsSection):
            for item in section.items:
                data = item.data
                lines = [company(data.symbol, context) + " · " + data.period, "已发布财报"]
                if not context.headline_only and data.generatedBy is not None:
                    for figure in data.figures:
                        basis = {"gaap": "GAAP", "adjusted": "调整后", "other": "其他口径"}[
                            figure.basis
                        ]
                        lines.append(
                            f"{figure.name} {figure.value}（{basis}）"
                            + (f"；同比 {figure.yoy}" if figure.yoy else "")
                        )
                    if data.guidance:
                        lines.append("指引：" + data.guidance.text)
                    lines.append(data.takeaway)
                rows.append(Row(tuple(lines), links([Link("原文 →", data.sourceUrl)])))
        elif isinstance(section, NewsFilingsSection):
            for item in section.items:
                data = item.data
                lines = [
                    company(data.filing.ticker, context)
                    + " · "
                    + filing_label(data.filing, context.settings)
                ]
                if data.digest and not context.headline_only:
                    lines.append(data.digest)
                rows.append(Row(tuple(lines), links([Link("原文 →", data.filing.url)])))
        elif isinstance(section, NewsInsidersSection):
            for item in section.items:
                data = item.data
                label = f"{company(data.ticker, context)} · {data.insider}（{data.role}）"
                rows.append(
                    Row(
                        (label,)
                        if context.headline_only
                        else (label, insider_text(data, context.settings)),
                        links([Link("原文 →", data.url)]),
                    )
                )
        elif isinstance(section, NewsCalendarSection):
            for item in section.items:
                data = item.data
                at = (
                    data.at.astimezone(ZoneInfo(context.settings.newsroom.timezone)).strftime(
                        "%m-%d %H:%M"
                    )
                    if data.at
                    else data.date.isoformat()
                )
                timing = {"bmo": "盘前", "amc": "盘后"}.get(data.timing or "", "")
                rows.append(Row((f"{at} {data.title} {timing}".strip(),)))
            if not rows:
                when = "下周" if section.kind == "next_week_calendar" else "今晚"
                unavailable = any(
                    source.id in {"fred-calendar", "finnhub-earnings"} and source.status == "failed"
                    for source in edition.sources
                )
                rows.append(
                    Row(
                        (
                            f"日程来源暂不可用，未能确认{when}安排。"
                            if unavailable
                            else f"{when}没有重要日程",
                        )
                    )
                )
        else:
            for item in section.items:
                data = item.data
                if data.overview and not context.headline_only:
                    rows.append(Row((data.overview,)))
                for nested in [*data.top5, *data.briefs]:
                    digest = nested.data
                    lines = [
                        (
                            digest.article.title
                            if context.headline_only
                            else chinese_title(digest.article.title, digest.summary)
                        )
                        + " · "
                        + context.settings.source(digest.article.sourceId).name
                    ]
                    if not context.headline_only:
                        lines.extend(
                            value for value in (digest.summary, digest.whyItMatters) if value
                        )
                    rows.append(
                        Row(
                            tuple(lines),
                            links(
                                [
                                    Link(
                                        "原文 →"
                                        if context.headline_only
                                        else source_link_label(
                                            Link(
                                                digest.article.title,
                                                digest.article.url,
                                                context.settings.source(
                                                    digest.article.sourceId
                                                ).name,
                                                digest.article.publishedAt,
                                            )
                                        ),
                                        digest.article.url,
                                    )
                                ]
                            ),
                        )
                    )
        if rows:
            result.append(Section(section.kind, section.title, tuple(rows)))
    return tuple(result)


def body_text(edition: Edition, context: RenderContext) -> str:
    """真实正文计数口径：保留标题/导语/栏目，排除链接地址和全部页脚。"""
    parts: list[str] = []
    if edition.lede and not context.headline_only:
        parts.extend(edition.lede.lines)
    for section in sections(edition, context):
        parts.append(section.title)
        parts.extend(
            "\n".join([*row.lines, *(link.title for link in row.links)]) for row in section.rows
        )
    return "\n\n".join(parts)


def footer(edition: Edition, context: RenderContext) -> tuple[str, ...]:
    result = [
        f"{context.settings.source(source.id).name}："
        + ("正常" if source.status == "ok" else "暂不可用（" + (source.error or "未知原因") + "）")
        for source in edition.sources
    ]
    result.extend(context.fallbacks)
    if context.headline_only:
        result.append("AI 未启用或不可用，本期为标题清单版。")
    if edition.aiUsage:
        usage = edition.aiUsage
        result.append(
            f"AI 输入 {usage.inputTokens} token / 输出 {usage.outputTokens} token；费用 ${usage.costUsd:.6f}"
        )
    else:
        result.append("本期未调用 AI。")
    return tuple(result)


_TEMPLATE = """<!doctype html><html lang="zh-CN"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1"><style>
body{margin:0;background:#f5f5f2;color:#202722;font-family:Arial,sans-serif;line-height:1.7}table{border-collapse:collapse}a{color:#315c4b}h1,h2{font-family:Georgia,'Songti SC',serif}h1{font-size:26px}h2{font-size:20px;border-bottom:1px solid #dde1dc;padding-bottom:8px}p{margin:8px 0}.rise{color:#c53d3d}.fall{color:#24744e}.flat{color:#202722}.footer{font-size:12px;color:#59635c}.row{border-bottom:1px solid #eceee9;padding:12px 0}
</style></head><body><table role="presentation" width="100%"><tr><td align="center"><table role="presentation" width="640" style="width:100%;max-width:640px;background:#fff"><tr><td style="padding:24px"><h1>{{subject}}</h1>
{% if headline_only %}<p>标题清单版</p>{% endif %}<p>{% for section in sections %}<a href="#{{section.anchor}}">{{section.title}}</a>{% if not loop.last %} · {% endif %}{% endfor %}</p>
{% for line in lede %}<p>{{line}}</p>{% endfor %}
{% for section in sections %}<h2 id="{{section.anchor}}">{{section.title}}</h2>{% for row in section.rows %}<div class="row"><p class="{{row.tone}}">{% for line in row.lines %}{{line}}{% if not loop.last %}<br>{% endif %}{% endfor %}</p>{% for link in row.links %}<a href="{{link.url}}">{{link.title}}</a>{% if not loop.last %} · {% endif %}{% endfor %}</div>{% endfor %}{% endfor %}
<div class="footer">{% for line in footer %}<p>{{line}}</p>{% endfor %}{% if console %}<p><a href="{{console.url}}">控制台网页版 →</a></p>{% endif %}</div>
</td></tr></table></td></tr></table></body></html>"""


def render_mail(edition: Edition, context: RenderContext, subject: str) -> Mail:
    grouped = sections(edition, context)
    tail = footer(edition, context)
    console = safe_link("控制台网页版 →", context.console_url) if context.console_url else None
    parts: list[str] = []
    if edition.lede and not context.headline_only:
        parts.extend(edition.lede.lines)
    for section in grouped:
        parts.append(section.title)
        for row in section.rows:
            parts.append(
                "\n".join([*row.lines, *(link.title + " " + link.url for link in row.links)])
            )
    parts.extend(tail)
    if console:
        parts.append(console.title + " " + console.url)
    template = Environment(autoescape=True, undefined=StrictUndefined).from_string(_TEMPLATE)
    html = template.render(
        subject=subject,
        sections=grouped,
        lede=edition.lede.lines if edition.lede and not context.headline_only else [],
        footer=tail,
        console=console,
        headline_only=context.headline_only,
    )
    return Mail(
        subject,
        "\n\n".join(parts),
        css_inline.inline(html, load_remote_stylesheets=False),
        len(body_text(edition, context)),
    )
