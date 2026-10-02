"""新闻发行API边界；不访问数据库/R2，不修改生成契约。"""

from collections.abc import Sequence
from datetime import date, timedelta
from typing import Protocol
from urllib.parse import quote, urlencode

from pydantic import BaseModel

from hub_contracts import (
    ArticleTimelineItem,
    Edition,
    EditionPage,
    FilingTimelineItem,
    NewsFullTimelineItem,
    NewsSourceHealth,
    Run,
    WatchItem,
)
from hub_core.api import ApiClient
from hub_newsroom.pipeline import PipelineInput


class Store(Protocol):
    def history(self, day: date) -> list[Edition]: ...
    def watchlist(self) -> list[WatchItem]: ...
    def weekly_facts(self, day: date, watchlist: Sequence[WatchItem]) -> PipelineInput: ...
    def batch(self, path: str, rows: Sequence[BaseModel]) -> None: ...
    def edition(self, edition: Edition) -> None: ...
    def html(self, ident: str, html: str) -> None: ...
    def health(self, value: NewsSourceHealth) -> None: ...
    def run(self, value: Run) -> None: ...


class NewsApi(ApiClient):
    def timeline(self, symbol: str, days: int) -> list[NewsFullTimelineItem]:
        return self.get_list(
            f"/v1/news/tickers/{quote(symbol, safe='')}/timeline/full?days={days}",
            NewsFullTimelineItem,
        )

    def put_edition(self, edition: Edition) -> None:
        # Python再校验或读回会将缺省字段显式置None；ruleScore可省略但不可为null。
        body = edition.model_dump(mode="json", exclude_unset=True)
        for section in body["sections"]:
            for item in section["items"]:
                if item.get("ruleScore") is None:
                    item.pop("ruleScore", None)
        self.http.request(
            "PUT",
            self.base_url + "/v1/internal/news/editions/" + quote(edition.id, safe=""),
            source="hub-api",
            headers=self._headers,
            json=body,
        )

    def put_html(self, ident: str, html: str) -> None:
        self.http.request(
            "PUT",
            self.base_url + "/v1/internal/news/editions/" + quote(ident, safe="") + "/html",
            source="hub-api",
            headers=self._headers | {"Content-Type": "text/html"},
            content=html.encode(),
        )


class Repository:
    def __init__(self, api: NewsApi) -> None:
        self.api = api

    def history(self, day: date) -> list[Edition]:
        result: list[Edition] = []
        # 至少覆盖本周/上一周；早报还需找到最近一次真实成功发送，不能将无邮件版当成功。
        oldest = day - timedelta(days=9)
        for kind in ("morning", "premarket"):
            cursor: str | None = None
            seen: set[str] = set()
            sent = False
            while True:
                params = {"kind": kind, "limit": "100"}
                if cursor:
                    params["cursor"] = cursor
                page = self.api.get("/v1/news/editions?" + urlencode(params), EditionPage)
                done = False
                for summary in page.items:
                    value = self.api.get("/v1/news/editions/" + quote(summary.id, safe=""), Edition)
                    if value.date <= day:
                        result.append(value)
                        sent |= bool(value.email and value.email.sentAt)
                    if value.date < oldest and (kind != "morning" or sent):
                        done = True
                        break
                if done or not page.nextCursor:
                    break
                if page.nextCursor in seen:
                    raise ValueError("新闻期次分页游标重复")
                seen.add(page.nextCursor)
                cursor = page.nextCursor
        # 旧周报补跑也须找到自然键；不能把第一页100期之外当作未发送。
        cursor = None
        seen = set()
        while True:
            params = {"kind": "weekly", "limit": "100"}
            if cursor:
                params["cursor"] = cursor
            page = self.api.get("/v1/news/editions?" + urlencode(params), EditionPage)
            summary = next((row for row in page.items if row.date == day), None)
            if summary:
                result.append(
                    self.api.get("/v1/news/editions/" + quote(summary.id, safe=""), Edition)
                )
                break
            if not page.nextCursor or any(row.date < day for row in page.items):
                break
            if page.nextCursor in seen:
                raise ValueError("新闻期次分页游标重复")
            seen.add(page.nextCursor)
            cursor = page.nextCursor
        return result

    def watchlist(self) -> list[WatchItem]:
        return self.api.get_list("/v1/watchlist", WatchItem)

    def weekly_facts(self, day: date, watchlist: Sequence[WatchItem]) -> PipelineInput:
        articles: list[ArticleTimelineItem] = []
        filings: list[FilingTimelineItem] = []
        # API的days相对真实现在；历史补跑明确扩大窗口，再由T11按版次窗口过滤。
        from datetime import UTC, datetime

        days = max(9, (datetime.now(UTC).date() - day).days + 9)
        for symbol in dict.fromkeys(w.underlying or w.symbol for w in watchlist if w.active):
            rows = self.api.timeline(symbol, days)
            articles.extend(row.root for row in rows if isinstance(row.root, ArticleTimelineItem))
            filings.extend(row.root for row in rows if isinstance(row.root, FilingTimelineItem))
        return PipelineInput(
            articles=tuple({row.article.id: row.article for row in articles}.values()),
            filings=tuple({row.filing.accession: row.filing for row in filings}.values()),
        )

    def batch(self, path: str, rows: Sequence[BaseModel]) -> None:
        for offset in range(0, len(rows), 40):
            self.api.post_batch(path, rows[offset : offset + 40])

    def edition(self, edition: Edition) -> None:
        self.api.put_edition(edition)

    def html(self, ident: str, html: str) -> None:
        self.api.put_html(ident, html)

    def health(self, value: NewsSourceHealth) -> None:
        self.api.write_source_health(value)

    def run(self, value: Run) -> None:
        self.api.write_run(value)
