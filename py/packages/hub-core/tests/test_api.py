"""真实生成模型经假 HTTP 写入开始/结束运行与 AI 调用。"""

import json
from datetime import UTC, date, datetime
from typing import Any

import httpx
import pytest
from pydantic import SecretStr

from hub_contracts import AiCall, NewsSourceHealth, Run
from hub_core.api import ApiClient
from hub_core.http import HttpClient
from hub_core.settings import Settings


def test_write_run_and_ai_calls() -> None:
    requests: list[httpx.Request] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(204)

    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        api = ApiClient(
            Settings(
                hub_api_url="https://hub.fake.test/",
                hub_service_token=SecretStr("test-only-invalid-token"),
            ),
            HttpClient(client=transport),
        )
        now = datetime.now(UTC)
        run = Run(
            id="test-run",
            job="test",
            date=date(2026, 9, 30),
            status="running",
            startedAt=now,
            finishedAt=None,
            stats={},
            error=None,
        )
        api.write_run(run)
        run = Run.model_validate(
            {**run.model_dump(), "status": "failed", "finishedAt": now, "error": "离线样例故障"}
        )
        api.write_run(run)
        call = AiCall(
            capability="test.cap",
            version=1,
            model="fake/model",
            inputTokens=2,
            outputTokens=3,
            costUsd=0,
            durationMs=1,
            ok=True,
            runId=run.id,
            at=now,
        )
        api.write_ai_calls([call])
        api.write_source_health(NewsSourceHealth(id="rss", checkedAt=now, status="ok", error=None))
        assert [request.url.path for request in requests] == [
            "/v1/internal/runs/test-run",
            "/v1/internal/runs/test-run",
            "/v1/internal/ai-calls/batch",
            "/v1/internal/news/sources/rss/health",
        ]
        assert all(
            request.headers["Authorization"] == "Bearer test-only-invalid-token"
            for request in requests
        )
        payloads: list[Any] = [json.loads(request.content) for request in requests]
        assert payloads[0]["status"] == "running"
        assert payloads[1]["status"] == "failed"
        assert payloads[1]["finishedAt"].endswith("Z")
        assert payloads[2][0]["inputTokens"] == 2


def test_missing_token() -> None:
    with pytest.raises(ValueError, match="HUB_SERVICE_TOKEN"):
        ApiClient(Settings(hub_service_token=None), HttpClient())


def test_get_validates_generated_model_and_list() -> None:
    now = datetime.now(UTC)
    record = NewsSourceHealth(id="rss", checkedAt=now, status="ok", error=None)

    def handler(request: httpx.Request) -> httpx.Response:
        payload = record.model_dump(mode="json")
        return httpx.Response(200, json=[payload] if request.url.path.endswith("list") else payload)

    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        api = ApiClient(
            Settings(hub_service_token=SecretStr("test-invalid-token")),
            HttpClient(client=transport),
        )
        assert api.get("/single", NewsSourceHealth) == record
        assert api.get_list("/list", NewsSourceHealth) == [record]
