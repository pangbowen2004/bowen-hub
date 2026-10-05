"""发行正文的中文筛选；行情和日程不代替已生成的新闻正文。"""

import re

from hub_contracts import (
    Edition,
    NewsArticlesSection,
    NewsEarningsSection,
    NewsFilingsSection,
    NewsInternationalSection,
    NewsTickerSection,
)


def is_chinese(text: str | None) -> bool:
    return bool(text and re.search(r"[\u3400-\u9fff]", text))


def chinese_edition(edition: Edition) -> tuple[Edition, int]:
    result = edition.model_copy(deep=True)
    stories = 0
    removed = False
    for section in result.sections:
        before = len(section.items)
        if isinstance(section, NewsTickerSection):
            section.items = [
                item
                for item in section.items
                if item.data.generatedBy is not None
                and is_chinese(item.data.whatHappened)
                and all(is_chinese(point.text) for point in item.data.points)
            ]
            for ticker_item in section.items:
                if not is_chinese(ticker_item.data.whyItMatters):
                    ticker_item.data.whyItMatters = None
            stories += sum(
                bool(item.data.sourceIds or any(point.sourceIds for point in item.data.points))
                for item in section.items
            )
        elif isinstance(section, NewsArticlesSection):
            section.items = [item for item in section.items if is_chinese(item.data.summary)]
            for article_item in section.items:
                if not is_chinese(article_item.data.whyItMatters):
                    article_item.data.whyItMatters = None
            stories += len(section.items)
        elif isinstance(section, NewsInternationalSection):
            for group in section.items:
                data = group.data
                count = len(data.top5) + len(data.briefs)
                data.top5 = [item for item in data.top5 if is_chinese(item.data.summary)]
                data.briefs = [item for item in data.briefs if is_chinese(item.data.summary)]
                for international_item in [*data.top5, *data.briefs]:
                    if not is_chinese(international_item.data.whyItMatters):
                        international_item.data.whyItMatters = None
                kept = len(data.top5) + len(data.briefs)
                stories += kept
                if kept != count or not is_chinese(data.overview):
                    data.overview = ""
                removed |= kept != count
            section.items = [
                group for group in section.items if group.data.top5 or group.data.briefs
            ]
        elif isinstance(section, NewsFilingsSection):
            section.items = [
                item
                for item in section.items
                if item.data.generatedBy is not None and is_chinese(item.data.digest)
            ]
            stories += len(section.items)
        elif isinstance(section, NewsEarningsSection):
            section.items = [
                item
                for item in section.items
                if item.data.generatedBy is not None and is_chinese(item.data.takeaway)
            ]
            stories += len(section.items)
        removed |= before != len(section.items)
    result.sections = [section for section in result.sections if section.items]
    if removed or (result.lede and not all(is_chinese(line) for line in result.lede.lines)):
        result.lede = None
    return result, stories


def chinese_title(title: str, summary: str | None) -> str:
    if is_chinese(title):
        return title
    # 保留来源原题；展示标题只取已有中文摘要的完整首句，不截字符、不补写事实。
    return re.split(r"[。！？\n]", summary or "", maxsplit=1)[0]
