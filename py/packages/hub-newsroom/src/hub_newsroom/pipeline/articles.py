"""归一、股票关联、事件聚类与规则打分；不访问外部服务。"""

import re
from collections.abc import Sequence
from dataclasses import dataclass
from datetime import UTC, datetime
from difflib import SequenceMatcher
from urllib.parse import parse_qsl, urlencode, urlsplit, urlunsplit

from hub_contracts import Article, WatchItem
from hub_newsroom.common.settings import Settings


def utc(at: datetime) -> datetime:
    if at.tzinfo is None or at.utcoffset() is None:
        raise ValueError("时间必须包含时区，不能推断旧数据时区")
    return at.astimezone(UTC)


def normalise_url(url: str) -> str:
    parts = urlsplit(url)
    if parts.scheme.lower() not in {"http", "https"} or not parts.hostname:
        raise ValueError("新闻来源链接必须是完整 HTTP(S) URL")
    host = parts.hostname.lower()
    if ":" in host:
        host = f"[{host}]"
    port = parts.port
    if port and port not in {80, 443}:
        host += f":{port}"
    query = [
        (key, value)
        for key, value in parse_qsl(parts.query, keep_blank_values=True)
        if not key.lower().startswith("utm_") and key.lower() not in {"fbclid", "gclid"}
    ]
    return urlunsplit(("https", host, parts.path.rstrip("/"), urlencode(query), ""))


def keyword_matches(text: str, keyword: str) -> bool:
    # 短语与点号按子串，单个英文词按边界；中文按子串。
    if re.fullmatch(r"[A-Za-z]+", keyword):
        return re.search(rf"\b{re.escape(keyword)}\b", text, re.IGNORECASE) is not None
    return keyword.casefold() in text.casefold()


def canonical_symbol(symbol: str, watchlist: Sequence[WatchItem]) -> str:
    symbol = symbol.upper()
    by_symbol = {item.symbol.upper(): item for item in watchlist if item.active}
    seen: set[str] = set()
    while symbol in by_symbol and by_symbol[symbol].underlying:
        if symbol in seen:
            raise ValueError("自选股 underlying 不能形成循环")
        seen.add(symbol)
        symbol = (by_symbol[symbol].underlying or symbol).upper()
    return symbol


def associate_tickers(article: Article, watchlist: Sequence[WatchItem]) -> Article:
    symbols = set(article.tickers)
    text = article.title + "\n" + (article.summary or "")
    symbols.update(re.findall(r"\$([A-Za-z][A-Za-z0-9.\-]*)\b", text))
    for item in watchlist:
        if item.active and any(
            keyword_matches(text, alias) for alias in [item.name, *item.aliases]
        ):
            symbols.add(item.symbol)
    return article.model_copy(
        update={"tickers": sorted({canonical_symbol(s, watchlist) for s in symbols})}
    )


def normalise_article(
    article: Article, settings: Settings, watchlist: Sequence[WatchItem]
) -> Article:
    source = settings.source(article.sourceId)
    # 来源配置标记付费墙；未知源保留适配器值。
    paywall = (
        source.paywall
        if any(s.id == article.sourceId for s in settings.sources)
        else article.paywall
    )
    return associate_tickers(
        article.model_copy(
            update={
                "url": normalise_url(article.url),
                "publishedAt": utc(article.publishedAt),
                "paywall": paywall,
            }
        ),
        watchlist,
    )


def title_tokens(title: str) -> set[str]:
    tokens = set(re.findall(r"[a-z]{3,}", title.lower()))
    for run in re.findall(r"[\u3400-\u9fff]+", title):
        tokens.update(run[i : i + 2] for i in range(len(run) - 1))
    return tokens


def same_event(
    left: Article, right: Article, settings: Settings, *, international: bool = False
) -> bool:
    if left.url == right.url:
        return True
    rule = settings.newsroom.thresholds.cluster
    threshold = (
        settings.international.pipeline.titleSimilarity if international else rule.titleSimilarity
    )
    if SequenceMatcher(None, left.title.lower(), right.title.lower()).ratio() >= threshold:
        return True
    if international or not (set(left.tickers) & set(right.tickers)):
        return False
    hours = abs((left.publishedAt - right.publishedAt).total_seconds()) / 3600
    if hours >= rule.sameTickerHours:
        return False
    a, b = title_tokens(left.title), title_tokens(right.title)
    return bool(a and b) and len(a & b) / min(len(a), len(b)) >= rule.tokenOverlap


@dataclass(frozen=True)
class ArticleCluster:
    id: str
    representative: Article
    other_reports: tuple[Article, ...]


def cluster_articles(
    articles: Sequence[Article], settings: Settings, *, international: bool = False
) -> tuple[ArticleCluster, ...]:
    # 连通事件按稳定输入id排序；代表依据来源权重和清单顺序，不依据抓取顺序。
    ordered = sorted(articles, key=lambda a: (a.id, a.sourceId, a.url))
    parent = list(range(len(ordered)))

    def find(i: int) -> int:
        while parent[i] != i:
            i = parent[i]
        return i

    for i, left in enumerate(ordered):
        for j in range(i):
            if same_event(left, ordered[j], settings, international=international):
                parent[find(i)] = find(j)
    groups: dict[int, list[Article]] = {}
    for i, article in enumerate(ordered):
        groups.setdefault(find(i), []).append(article)
    result: list[ArticleCluster] = []
    for members in groups.values():
        members.sort(
            key=lambda a: (
                -settings.source(a.sourceId).weight,
                settings.source_order(a.sourceId),
                a.id,
            )
        )
        cluster_id = "event:" + min(a.id for a in members)
        linked = [a.model_copy(update={"clusterId": cluster_id}) for a in members]
        # 同一事件的股票关联不能因高权重源缺少标签而丢失；原始报道仍在articles/other_reports。
        representative = linked[0].model_copy(
            update={"tickers": sorted({symbol for member in linked for symbol in member.tickers})}
        )
        result.append(ArticleCluster(cluster_id, representative, tuple(linked[1:])))
    return tuple(sorted(result, key=lambda c: c.id))


def rule_score(
    article: Article, now: datetime, settings: Settings, watchlist: Sequence[WatchItem]
) -> float:
    rules = settings.newsroom.scoring
    age = (utc(now) - article.publishedAt).total_seconds() / 3600
    if age < 0:
        raise ValueError("不能给未来新闻计算时效分")
    recency = next((r.score for r in rules.recency if age <= r.withinHours), 0)
    keyword_score = sum(
        rules.keywords.highScore for k in rules.keywords.high if keyword_matches(article.title, k)
    )
    keyword_score += sum(
        rules.keywords.mediumScore
        for k in rules.keywords.medium
        if keyword_matches(article.title, k)
    )
    watched = {canonical_symbol(w.symbol, watchlist) for w in watchlist if w.active}
    return (
        settings.source(article.sourceId).weight
        + recency
        + min(keyword_score, rules.keywords.maxScore)
        + (rules.watchlist if watched.intersection(article.tickers) else 0)
        + (rules.megaCap if set(settings.newsroom.megaCaps).intersection(article.tickers) else 0)
        + rules.paywall[article.paywall]
    )


def rule_topic(article: Article, settings: Settings) -> str:
    title = article.title
    if keyword_matches(title, "trump") and any(
        keyword_matches(title, k) for k in ("china", "xi", "beijing", "chinese")
    ):
        return "us_china"
    for rule in settings.international.topicRules:
        if any(keyword_matches(title, word) for word in [*rule.en, *rule.zh]):
            return rule.topic
    return "china_business" if settings.source(article.sourceId).category == "china" else "other"


def international_score(article: Article, settings: Settings) -> float:
    rules = settings.international
    category = settings.source(article.sourceId).category
    score = rules.categoryScore.get(category or "", 0) + rules.paywallPenalty[article.paywall]
    for level, keywords in rules.scoreKeywords.items():
        score += rules.keywordScores[level] * sum(
            keyword_matches(article.title, k) for k in [*keywords.en, *keywords.zh]
        )
    return score
