"""国际科技规则候选与降级选择；AI 空位留给 T12。"""

from collections import Counter
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import datetime, timedelta

from hub_contracts import (
    Article,
    NewsArticleDigest,
    NewsCandidate,
    NewsInternational,
    NewsNewsArticleDigestItem,
)
from hub_newsroom.common.settings import Settings
from hub_newsroom.pipeline.articles import (
    ArticleCluster,
    cluster_articles,
    international_score,
    rule_topic,
    utc,
)


@dataclass(frozen=True)
class InternationalResult:
    data: NewsInternational
    candidates: tuple[NewsCandidate, ...]
    clusters: tuple[ArticleCluster, ...]


def digest_item(
    article: Article, score: float, topic: str | None = None
) -> NewsNewsArticleDigestItem:
    return NewsNewsArticleDigestItem(
        id=article.id,
        clusterId=article.clusterId,
        ruleScore=score,
        data=NewsArticleDigest(
            article=article, summary=None, whyItMatters=None, topic=topic, generatedBy=None
        ),
    )


def international_pipeline(
    articles: Sequence[Article], now: datetime, settings: Settings
) -> InternationalResult:
    rules = settings.international
    start = utc(now) - timedelta(hours=rules.pipeline.recentHours)
    relevant = [
        a
        for a in articles
        if start <= a.publishedAt <= utc(now)
        and settings.source(a.sourceId).section == "international"
        and settings.source(a.sourceId).enabled
    ]
    clusters = cluster_articles(relevant, settings, international=True)
    ranked = sorted(
        (c.representative for c in clusters),
        key=lambda a: (-international_score(a, settings), settings.source_order(a.sourceId), a.id),
    )
    categories: Counter[str] = Counter()
    selected: list[Article] = []
    for article in ranked:
        category = settings.source(article.sourceId).category or ""
        if categories[category] < rules.pipeline.perCategory:
            categories[category] += 1
            selected.append(article)
    pool = selected[: rules.pipeline.curateCandidates]
    top: list[NewsNewsArticleDigestItem] = []
    topics: Counter[str] = Counter()
    for article in pool:
        topic = rule_topic(article, settings)
        if len(top) < rules.pipeline.topN and topics[topic] < rules.pipeline.ruleMaxPerTopic:
            top.append(digest_item(article, international_score(article, settings), topic))
            topics[topic] += 1
    ids = {item.id for item in top}
    briefs = [
        digest_item(a, international_score(a, settings), rule_topic(a, settings))
        for a in selected
        if a.id not in ids
    ][: settings.newsroom.thresholds.internationalBriefs]
    # 综述只列真实入选主题；无新闻时留空，不伪造三条主线。
    ordered_topics = list(dict.fromkeys(item.data.topic for item in top if item.data.topic))[:3]
    labels = [rules.topicLabels[topic] for topic in ordered_topics]
    overview = "今日新闻主线集中在 " + "、".join(labels) + "。" if labels else ""
    data = NewsInternational(overview=overview, top5=top, briefs=briefs, generatedBy=None)
    candidates = tuple(
        NewsCandidate(
            id=a.id,
            title=a.title,
            summary=a.summary,
            source=settings.source(a.sourceId).name,
            publishedAt=a.publishedAt,
            tickers=a.tickers,
            ruleScore=international_score(a, settings),
            paywall=a.paywall,
            topic=rule_topic(a, settings),
        )
        for a in pool
    )
    return InternationalResult(data, candidates, clusters)
