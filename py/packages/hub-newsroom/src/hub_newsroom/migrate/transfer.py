"""薄API读写；幂等迁移和逐个内容核对，不直连数据库。"""

from datetime import UTC, datetime
from urllib.parse import quote, urlencode

from hub_contracts import Article, Edition, EditionPage, WatchItem
from hub_core.api import ApiClient

from .errors import MigrationError
from .legacy import Plan


def write_news(api: ApiClient, plan: Plan) -> None:
    for offset in range(0, len(plan.articles), 40):
        api.post_batch("/v1/internal/news/articles/batch", plan.articles[offset : offset + 40])
    for edition in plan.editions:
        api.put(f"/v1/internal/news/editions/{quote(edition.id, safe='')}", edition)


def verify_news(api: ApiClient, plan: Plan) -> list[str]:
    expected = {edition.id: edition for edition in plan.editions}
    ids: set[str] = set()
    cursor: str | None = None
    cursors: set[str] = set()
    while True:
        params = {"kind": "legacy", "limit": "100"}
        if cursor:
            params["cursor"] = cursor
        page = api.get("/v1/news/editions?" + urlencode(params), EditionPage)
        ids.update(item.id for item in page.items)
        cursor = page.nextCursor
        if not cursor:
            break
        if cursor in cursors:
            raise MigrationError("期次核对遇到重复分页游标")
        cursors.add(cursor)
    differences = [f"缺期次：{ident}" for ident in sorted(expected.keys() - ids)]
    differences.extend(f"多余期次：{ident}" for ident in sorted(ids - expected.keys()))
    for ident in sorted(expected.keys() & ids):
        actual = api.get(f"/v1/news/editions/{quote(ident, safe='')}", Edition)
        if actual != expected[ident]:
            differences.append(f"期次内容不一致：{ident}")
    # 搜索路径遵循既有API；以规范URL核对去重后的最终Article，不只数行。
    oldest = min(article.publishedAt.date() for article in plan.articles) if plan.articles else None
    days = max(1, (datetime.now(UTC).date() - oldest).days + 2) if oldest else 1
    for index, article in enumerate(plan.articles, 1):
        params = urlencode({"q": article.title, "days": days})
        found = api.get_list("/v1/news/articles/search?" + params, Article)
        actual = next((item for item in found if item.url == article.url), None)
        if actual != article:
            differences.append(f"文章内容不一致：源去重条目{index}")
    return differences


def seed_watchlist(api: ApiClient, items: list[WatchItem]) -> bool:
    if api.get_list("/v1/watchlist", WatchItem):
        return False
    api.post_batch("/v1/internal/watchlist/batch", items)
    return True


def verify_watchlist(api: ApiClient, items: list[WatchItem]) -> list[str]:
    actual = api.get_list("/v1/watchlist", WatchItem)
    expected = {item.symbol: item for item in items}
    current = {item.symbol: item for item in actual}
    problems = [f"缺自选股：{symbol}" for symbol in sorted(expected.keys() - current.keys())]
    problems.extend(f"额外自选股：{symbol}" for symbol in sorted(current.keys() - expected.keys()))
    problems.extend(
        f"自选股内容不一致：{symbol}"
        for symbol in sorted(expected.keys() & current.keys())
        if expected[symbol] != current[symbol]
    )
    return problems
