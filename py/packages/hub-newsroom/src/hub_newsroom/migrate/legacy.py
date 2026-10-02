"""只转换新闻旧数据；保留每期条目，不调用模型或网络。"""

import json
from collections import Counter
from dataclasses import dataclass
from datetime import UTC, date, datetime
from email.utils import parsedate_to_datetime
from pathlib import Path

from pydantic import BaseModel, ConfigDict, Field

from hub_contracts import Article, Edition
from hub_newsroom.pipeline.articles import normalise_url

from .errors import MigrationError


class LegacyItem(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    title: str = Field(min_length=1)
    link: str
    source: str
    published: str
    category: str | None = None
    topic: str | None = None
    llm_summary: str | None = None
    llm_why: str | None = None


class LegacyRow(BaseModel):
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)
    date: date
    mode: str
    overview: str
    timestamp: str | None = None
    top_5: list[LegacyItem]


@dataclass(frozen=True)
class Plan:
    editions: list[Edition]
    articles: list[Article]
    item_count: int
    unknown_sources: dict[str, int]
    modes: dict[str, int]
    timestamps_without_zone: int


def published_at(value: str) -> datetime:
    try:
        result = datetime.fromisoformat(" ".join(value.split()).replace("Z", "+00:00"))
    except ValueError:
        result = parsedate_to_datetime(value)
    if result.tzinfo is None or result.utcoffset() is None:
        raise MigrationError("文章发布时间缺少时区")
    return result.astimezone(UTC)


def convert(rows: list[LegacyRow], sources: list[dict[str, object]]) -> Plan:
    names = {str(s["name"]).casefold(): s for s in sources}
    editions: list[Edition] = []
    articles: dict[str, Article] = {}
    unknown: Counter[str] = Counter()
    seen: set[date] = set()
    item_count = 0
    unzoned = 0
    for row in sorted(rows, key=lambda r: r.date):
        if row.date in seen:
            raise MigrationError("旧新闻日期重复，不能静默覆盖")
        seen.add(row.date)
        ident = f"legacy-{row.date.isoformat()}"
        top: list[dict[str, object]] = []
        if row.timestamp:
            at = datetime.fromisoformat(row.timestamp.replace("Z", "+00:00"))
            unzoned += int(at.tzinfo is None or at.utcoffset() is None)
        for item in row.top_5:
            source = names.get(item.source.casefold())
            if source is None:
                unknown[item.source] += 1
            url = normalise_url(item.link)
            article = Article.model_validate(
                {
                    "id": url,
                    "sourceId": source["id"] if source else "legacy",
                    "kind": "news",
                    "title": item.title,
                    "url": url,
                    "publishedAt": published_at(item.published),
                    "summary": item.llm_summary,
                    "lang": source.get("lang", "und") if source else "und",
                    "tickers": [],
                    "topics": list(dict.fromkeys(v for v in [item.category, item.topic] if v)),
                    "paywall": source.get("paywall", "none") if source else "none",
                    "clusterId": None,
                }
            )
            # 跨期同URL只写一篇Article，但每期嵌入当时的实际标题与摘要。
            articles[url] = article
            top.append(
                {
                    "id": url,
                    "data": {
                        "article": article.model_dump(mode="json"),
                        "summary": item.llm_summary,
                        "whyItMatters": item.llm_why,
                        "topic": item.topic,
                        "generatedBy": None,
                    },
                }
            )
            item_count += 1
        editions.append(
            Edition.model_validate(
                {
                    "id": ident,
                    "kind": "legacy",
                    "date": row.date,
                    "window": {"fromAt": None, "toAt": None},
                    "generatedAt": None,
                    "lede": None,
                    "sections": [
                        {
                            "kind": "legacy_headlines",
                            "title": "今日要闻",
                            "items": [
                                {
                                    "id": f"{ident}-headlines",
                                    "data": {
                                        "overview": row.overview,
                                        "top5": top,
                                        "briefs": [],
                                        "generatedBy": None,
                                    },
                                }
                            ],
                        }
                    ],
                    "sources": [],
                    "aiUsage": None,
                    "email": None,
                }
            )
        )
    return Plan(
        editions,
        list(articles.values()),
        item_count,
        dict(unknown),
        dict(Counter(r.mode for r in rows)),
        unzoned,
    )


def read_archive(path: Path) -> list[LegacyRow]:
    rows: list[LegacyRow] = []
    with path.open(encoding="utf-8") as stream:
        for number, line in enumerate(stream, 1):
            if not line.strip():
                continue
            try:
                rows.append(LegacyRow.model_validate(json.loads(line)))
            except ValueError, TypeError:
                raise MigrationError(f"旧新闻第{number}行不符合数据格式") from None
    if not rows:
        raise MigrationError("旧新闻源为空")
    return rows
