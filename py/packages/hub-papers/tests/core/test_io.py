"""派生经API分页读取并写五份文档；不接触真实服务。"""

import json
from pathlib import Path
from typing import Any

import httpx
import pytest
from pydantic import SecretStr

from hub_contracts import Paper
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_papers.derive import commands, summarize

ROOT = Path(__file__).resolve().parents[5]


def test_api_pagination_document_payloads(monkeypatch: pytest.MonkeyPatch) -> None:
    papers = [
        Paper.model_validate_json(path.read_text())
        for path in sorted((ROOT / "fixtures/samples/papers").glob("Paper.*.json"))
    ]
    calls: list[str] = []
    payloads: dict[str, dict[str, Any]] = {}

    def response(request: httpx.Request) -> httpx.Response:
        calls.append(request.url.path)
        assert request.headers["Authorization"] == "Bearer OFFLINE_TEST"
        if request.method == "PUT":
            payloads[request.url.path.split("/")[-1]] = json.loads(request.content)
            return httpx.Response(204)
        if request.url.path == "/v1/papers":
            index = 1 if request.url.params.get("cursor") else 0
            assert request.url.params["limit"] == "100"
            return httpx.Response(
                200,
                json={
                    "items": [summarize(papers[index]).model_dump(mode="json")],
                    "nextCursor": "next" if index == 0 else None,
                },
            )
        paper = next(p for p in papers if request.url.path.endswith(p.id))
        return httpx.Response(200, json=paper.model_dump(mode="json"))

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        http = HttpClient(client=client)
        monkeypatch.setattr(commands, "HttpClient", lambda: http)
        monkeypatch.setattr(
            commands,
            "Settings",
            lambda: Settings(
                hub_service_token=SecretStr("OFFLINE_TEST"), hub_api_url="https://offline.test"
            ),
        )
        commands.derive(None, None)
    assert calls.count("/v1/papers") == 2
    assert len(payloads) == 5
    assert payloads["papers.catalog.public"]["stats"]["paperCount"] == 1
    assert payloads["papers.catalog.all"]["stats"]["paperCount"] == 2
    assert all("payload" not in value for value in payloads.values())
