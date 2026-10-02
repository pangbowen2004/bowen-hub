"""真实API客户端HTTP离线边界，分页不能漏账本/历史摘要。"""

import json
from datetime import date
from pathlib import Path

import httpx
import pytest
from pydantic import SecretStr

from hub_contracts import Hypothesis, IndexBar, MarketDaySummary
from hub_core.http import HttpClient, SourceRequestError
from hub_core.settings import Settings
from hub_market.eod.repository import MarketApi, Repository

ROOT = Path(__file__).resolve().parents[5]


def test_paginated_all_ledger_and_summary_read_and_natural_write() -> None:
    hypothesis = Hypothesis.model_validate(
        json.loads((ROOT / "fixtures/samples/markets/Hypothesis.ledger.json").read_text())[0]
    )
    summary = MarketDaySummary.model_validate_json(
        (ROOT / "fixtures/samples/markets/MarketDaySummary.2026-08-28.json").read_text()
    )
    calls: list[httpx.Request] = []

    def response(req: httpx.Request) -> httpx.Response:
        calls.append(req)
        assert req.headers["Authorization"] == "Bearer offline"
        if req.method != "GET":
            return httpx.Response(204, request=req)
        if req.url.path.endswith("hypotheses"):
            cursor = req.url.params.get("cursor")
            row = hypothesis.model_copy(update={"id": "second" if cursor else "first"})
            return httpx.Response(
                200,
                json={
                    "items": [row.model_dump(mode="json")],
                    "nextCursor": None if cursor else "next",
                },
                request=req,
            )
        if req.url.path.endswith("days"):
            cursor = req.url.params.get("cursor")
            row = summary.model_copy(
                update={"date": date(2026, 8, 27) if cursor else date(2026, 8, 28)}
            )
            return httpx.Response(
                200,
                json={
                    "items": [row.model_dump(mode="json")],
                    "nextCursor": None if cursor else "next",
                },
                request=req,
            )
        return httpx.Response(404, request=req)

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        repo = Repository(
            MarketApi(
                Settings.model_construct(
                    hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
                ),
                HttpClient(client=client, retries=0),
            )
        )
        assert {row.id for row in repo.ledger()} == {"first", "second"}
        assert [row.date for row in repo.summaries(date(2026, 8, 29), date(2026, 8, 27))] == [
            date(2026, 8, 27),
            date(2026, 8, 28),
        ]
        assert repo.day(date(2026, 8, 28)) is None
        repo.hypotheses([hypothesis] * 81)
        bar = IndexBar.model_validate(
            json.loads((ROOT / "fixtures/samples/markets/IndexBar.000001.sh.json").read_text())[0]
        )
        repo.bars("000001.SH", [bar])
    batches = [req for req in calls if req.method == "POST"]
    assert [len(json.loads(req.content)) for req in batches] == [40, 40, 1]
    put = next(req for req in calls if req.method == "PUT")
    assert json.loads(put.content) == [bar.model_dump(mode="json")]


@pytest.mark.parametrize("resource", ["hypotheses", "days"])
def test_duplicate_cursor_fails(resource: str) -> None:
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda req: httpx.Response(200, json={"items": [], "nextCursor": "repeat"}, request=req)
        )
    ) as client:
        repo = Repository(
            MarketApi(
                Settings.model_construct(
                    hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
                ),
                HttpClient(client=client, retries=0),
            )
        )
        operation = (
            repo.ledger
            if resource == "hypotheses"
            else lambda: repo.summaries(date(2026, 8, 28), date(2026, 8, 24))
        )
        with pytest.raises(ValueError, match="游标重复"):
            operation()


def test_optional_only_404_not_permission_or_source_failure() -> None:
    with httpx.Client(
        transport=httpx.MockTransport(lambda req: httpx.Response(403, request=req))
    ) as client:
        repo = Repository(
            MarketApi(
                Settings.model_construct(
                    hub_api_url="https://api.test", hub_service_token=SecretStr("offline")
                ),
                HttpClient(client=client, retries=0),
            )
        )
        with pytest.raises(SourceRequestError):
            repo.day(date(2026, 8, 28))
