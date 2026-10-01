"""RSS/Atom 只解析响应；不让 feedparser 自己发网络请求。"""

import calendar
from collections.abc import Sequence
from datetime import UTC, datetime
from typing import Any, cast

import feedparser  # pyright: ignore[reportMissingTypeStubs]
from selectolax.parser import HTMLParser

from hub_contracts import Article
from hub_core.http import HttpClient
from hub_providers.common.base import Provider
from hub_providers.common.config import SourceConfig
from hub_providers.common.parsing import article_id


class RssSource(Provider):
    def __init__(self, http: HttpClient, config: SourceConfig) -> None:
        super().__init__(http, config.id)
        self.config = config

    def fetch_news(
        self, start: datetime, end: datetime, symbols: Sequence[str] = ()
    ) -> Sequence[Article]:
        def fetch() -> list[Article]:
            if not self.config.enabled:
                return []
            if not self.config.url:
                raise ValueError("RSS 缺少地址")
            parse_feed: Any = feedparser.parse  # pyright: ignore[reportUnknownMemberType, reportUnknownVariableType]
            parsed: Any = parse_feed(self.text(self.config.url))
            if parsed.bozo or not parsed.version:
                raise ValueError("RSS 格式无效")
            result: list[Article] = []
            for entry in cast(list[dict[str, Any]], parsed.entries)[: self.config.max_items]:
                stamp = entry.get("published_parsed") or entry.get("updated_parsed")
                # 不拿抓取时间冒充发布时间。
                if stamp is None:
                    continue
                published = datetime.fromtimestamp(calendar.timegm(stamp), UTC)
                if not start <= published < end:
                    continue
                url = str(entry.get("link", ""))
                title = str(entry.get("title", ""))
                if not url or not title:
                    continue
                summary = (
                    HTMLParser(str(entry["summary"])).text(separator=" ", strip=True)
                    if entry.get("summary")
                    else None
                )
                result.append(
                    Article(
                        id=article_id(self.source_id, str(entry.get("id") or url)),
                        sourceId=self.source_id,
                        kind="press_release"
                        if self.source_id in {"fed-monetary", "fed-all"}
                        else "news",
                        title=title,
                        url=url,
                        publishedAt=published,
                        summary=summary,
                        lang=self.config.lang,
                        tickers=[],
                        topics=[],
                        paywall=self.config.paywall,
                        clusterId=None,
                    )
                )
            return result

        return self.run(fetch)
