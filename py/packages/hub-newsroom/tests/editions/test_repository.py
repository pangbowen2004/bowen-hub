"""实际ApiClient HTTP边界：分页、服务令牌、HTML、批量与完整时间线联合。"""

import json
from datetime import UTC, date, datetime, timedelta

import httpx
import pytest
from pydantic import SecretStr

from hub_contracts import EditionEmail, EditionSummary, WatchItem
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_newsroom.editions.repository import NewsApi, Repository

from .helpers import fixture


def test_history_reads_all_pages_and_only_real_sent_history() -> None:
    _, _, history = fixture("premarket")
    template = history[0]
    template.email = EditionEmail(sentAt=datetime(2026, 9, 29, 23, 20, tzinfo=UTC))
    old = template.model_copy(update={"id": "morning-old", "date": date(2026, 8, 30)})
    paths: list[str] = []

    def response(req: httpx.Request) -> httpx.Response:
        paths.append(str(req.url))
        assert req.headers["Authorization"] == "Bearer offline"
        if req.url.path == "/v1/news/editions":
            if req.url.params["kind"] != "morning":
                return httpx.Response(200, json={"items": [], "nextCursor": None}, request=req)
            row = old if "cursor" in req.url.params else template
            summary = EditionSummary(
                id=row.id, kind=row.kind, date=row.date, generatedAt=row.generatedAt
            )
            return httpx.Response(
                200,
                json={
                    "items": [summary.model_dump(mode="json")],
                    "nextCursor": None if row is old else "page2",
                },
                request=req,
            )
        return httpx.Response(
            200,
            json=(old if req.url.path.endswith("old") else template).model_dump(mode="json"),
            request=req,
        )

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        api = NewsApi(
            Settings.model_construct(
                hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
            ),
            HttpClient(client=client, retries=0),
        )
        actual = Repository(api).history(date(2026, 9, 30))
    assert actual == [template, old]
    assert any("cursor=page2" in path for path in paths)


def test_history_duplicate_cursor_fails() -> None:
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda req: httpx.Response(200, json={"items": [], "nextCursor": "same"}, request=req)
        )
    ) as client:
        api = NewsApi(
            Settings.model_construct(
                hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
            ),
            HttpClient(client=client, retries=0),
        )
        with pytest.raises(ValueError, match="游标重复"):
            Repository(api).history(date(2026, 9, 30))


def test_html_is_not_json_and_batches_are_bounded() -> None:
    _, data, _ = fixture("morning")
    calls: list[httpx.Request] = []

    def response(req: httpx.Request) -> httpx.Response:
        calls.append(req)
        return httpx.Response(204, request=req)

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        api = NewsApi(
            Settings.model_construct(
                hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
            ),
            HttpClient(client=client, retries=0),
        )
        repo = Repository(api)
        repo.html("morning-2026-09-30", "<h1>测试正文</h1>")
        repo.batch("/v1/internal/news/articles/batch", [data.articles[0]] * 81)
    assert calls[0].headers["Content-Type"] == "text/html"
    assert calls[0].content.decode() == "<h1>测试正文</h1>"
    assert [len(json.loads(req.content)) for req in calls[1:]] == [40, 40, 1]


def test_weekly_timeline_union_and_duplicate_articles(watchlist: list[WatchItem]) -> None:
    _, data, _ = fixture("morning")
    rows = [
        {
            "kind": "article",
            "at": data.articles[0].publishedAt.isoformat(),
            "article": data.articles[0].model_dump(mode="json"),
        },
        {
            "kind": "filing",
            "at": data.filings[0].filedAt.isoformat(),
            "filing": data.filings[0].model_dump(mode="json"),
        },
    ]
    calls: list[httpx.Request] = []

    def response(req: httpx.Request) -> httpx.Response:
        calls.append(req)
        return httpx.Response(200, json=rows, request=req)

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        api = NewsApi(
            Settings.model_construct(
                hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
            ),
            HttpClient(client=client, retries=0),
        )
        actual = Repository(api).weekly_facts(
            datetime.now(UTC).date() - timedelta(days=120), watchlist
        )
    assert len(actual.articles) == 1
    assert len(actual.filings) == 1
    assert all(int(req.url.params["days"]) >= 129 for req in calls)
    assert len(calls) == len({row.underlying or row.symbol for row in watchlist})


def test_history_finds_sent_weekly_natural_key_beyond_first_page() -> None:
    _, _, history = fixture("premarket")
    template = history[0].model_copy(deep=True)
    template.kind = "weekly"
    template.id = "weekly-2026-09-19"
    template.date = date(2026, 9, 19)
    template.email = EditionEmail(sentAt=datetime(2026, 9, 19, 1, 20, tzinfo=UTC))
    pages: list[str | None] = []

    def response(req: httpx.Request) -> httpx.Response:
        if req.url.path != "/v1/news/editions":
            return httpx.Response(200, json=template.model_dump(mode="json"), request=req)
        if req.url.params["kind"] != "weekly":
            return httpx.Response(200, json={"items": [], "nextCursor": None}, request=req)
        cursor = req.url.params.get("cursor")
        pages.append(cursor)
        summary = EditionSummary(
            id=template.id if cursor else "weekly-2026-09-26",
            kind="weekly",
            date=template.date if cursor else date(2026, 9, 26),
            generatedAt=template.generatedAt,
        )
        return httpx.Response(
            200,
            json={
                "items": [summary.model_dump(mode="json")],
                "nextCursor": None if cursor else "older",
            },
            request=req,
        )

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        api = NewsApi(
            Settings.model_construct(
                hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
            ),
            HttpClient(client=client, retries=0),
        )
        assert Repository(api).history(template.date) == [template]
    assert pages == [None, "older"]


def test_edition_roundtrip_omits_absent_scores_but_keeps_nullable_facts() -> None:
    from hub_contracts import Edition

    _, _, history = fixture("premarket")
    # 与AI回填一样再校验，缺省可省略字段会被标记为显式None。
    edition = Edition.model_validate(history[0].model_dump())
    first = edition.sections[0].items[0]
    first.ruleScore = 0.0
    captured: list[bytes] = []

    def response(req: httpx.Request) -> httpx.Response:
        body = json.loads(req.content)
        captured.append(req.content)
        for section in body["sections"]:
            for item in section["items"]:
                assert "ruleScore" not in item or isinstance(item["ruleScore"], (int, float))
        assert "lede" in body
        return httpx.Response(204, request=req)

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        api = NewsApi(
            Settings.model_construct(
                hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
            ),
            HttpClient(client=client, retries=0),
        )
        Repository(api).edition(edition)
    assert json.loads(captured[0])["sections"][0]["items"][0]["ruleScore"] == 0.0
    assert Edition.model_validate_json(captured[0]) == edition
