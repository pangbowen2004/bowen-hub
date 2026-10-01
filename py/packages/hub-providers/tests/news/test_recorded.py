"""根录制的公开响应验收；缺失 HTTP 响应不伪造为真实回放。"""

import json
from datetime import date
from functools import partial
from pathlib import Path
from urllib.parse import parse_qs, urlsplit

import httpx
import pytest
from pydantic import SecretStr

from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_providers.common import checks
from hub_providers.common.replay import ReplayTransport

ROOT = Path(__file__).resolve().parents[5]
RECORDING = ROOT / "fixtures/http/news/recorded-2026-09-30"


def test_real_recording_all_sources_offline(monkeypatch: pytest.MonkeyPatch) -> None:
    manifest = json.loads((RECORDING / "manifest.json").read_text())
    transport = ReplayTransport(RECORDING)

    monkeypatch.setattr(checks, "HttpClient", partial(HttpClient, sleeper=lambda seconds: None))
    health = checks.check_sources(
        Settings(
            alpaca_api_key_id=SecretStr("OFFLINE"),
            alpaca_api_secret_key=SecretStr("OFFLINE"),
            tiingo_api_key=SecretStr("OFFLINE"),
            sec_user_agent="Offline replay replay@example.test",
            fred_api_key=None,
            finnhub_api_key=None,
        ),
        ROOT / "config",
        date.fromisoformat(manifest["date"]),
        client_factory=lambda: httpx.Client(transport=transport, follow_redirects=True),
    )
    actual = {row.id: (row.status, row.error) for row in health}
    expected = {row["id"]: (row["status"], row["error"]) for row in manifest["health"]}
    assert len(actual) == 29
    assert actual.keys() == expected.keys()
    for identity, outcome in expected.items():
        if identity in {"nasdaq-markets", "treasury-yield"}:
            # 真实 ReadTimeout 没有 HTTP 响应可录；严格回放必须报覆盖缺口。
            assert outcome == ("failed", "ReadTimeout")
            assert actual[identity] == ("failed", "ConnectError")
        else:
            assert actual[identity] == outcome, identity
    assert all(not queue for queue in transport.records.values())
    assert actual["36kr"] == ("failed", "响应解析失败")
    assert actual["cnbc-top"] == ("failed", "HTTP 403")
    assert actual["venturebeat-ai"] == ("failed", "HTTP 429")


def test_real_recording_public_metadata_and_non_feed_challenge() -> None:
    files = sorted(RECORDING.glob("[0-9][0-9][0-9][0-9].json"))
    manifest = json.loads((RECORDING / "manifest.json").read_text())
    assert len(files) == manifest["responses"] == 142
    challenge = None
    forbidden = {"api_key", "token", "authorization", "cookie", "password", "secret"}
    for file in files:
        record = json.loads(file.read_text())
        assert record["origin"] == "真实 HTTP 验收录制"
        request = record["request"]
        assert set(request) == {"method", "url", "params"}
        assert request["method"] == "GET"
        assert not forbidden.intersection(name.lower() for name in request["params"])
        url = urlsplit(str(request["url"]))
        assert url.scheme in {"http", "https"}
        assert not url.username
        assert not url.password
        assert not url.query
        assert not url.fragment
        response = record["response"]
        assert set(response) == {"status", "contentType", "location", "text"}
        if response["location"]:
            target = urlsplit(str(response["location"]))
            assert not target.username
            assert not target.password
            assert not target.fragment
            assert not forbidden.intersection(parse_qs(target.query))
        if not 200 <= response["status"] < 300:
            assert response["text"] is None
        if url.netloc == "36kr.com":
            challenge = response
    assert challenge is not None
    assert challenge["status"] == 200
    assert challenge["contentType"] == "text/html"
    assert "正在进行安全检测" in challenge["text"]
