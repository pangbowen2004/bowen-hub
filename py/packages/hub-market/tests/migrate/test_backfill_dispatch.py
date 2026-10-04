"""hub market backfill 的 --no-dispatch：默认行为不变，选项只关掉末尾那一次部署派发。"""

from datetime import date
from pathlib import Path
from typing import Any

import httpx
import pytest
import typer
from pydantic import SecretStr
from typer.testing import CliRunner

from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_market.eod import commands

ROOT = Path(__file__).resolve().parents[5]


def app() -> typer.Typer:
    value = typer.Typer()
    group = typer.Typer()
    value.add_typer(group, name="market")
    commands.register({"market": group})
    return value


class StubEod:
    def __init__(self) -> None:
        self.calls: list[tuple[date, date]] = []

    def backfill(self, first: date, last: date) -> list[Any]:
        self.calls.append((first, last))
        return []


def invoke(
    monkeypatch: pytest.MonkeyPatch, *extra: str
) -> tuple[Any, list[dict[str, Any]], StubEod]:
    captured: list[dict[str, Any]] = []
    stub = StubEod()
    source = httpx.Client()
    http = HttpClient(
        client=httpx.Client(transport=httpx.MockTransport(lambda r: httpx.Response(500)))
    )

    def create(*args: Any, **kwargs: Any) -> Any:
        captured.append(kwargs)
        return stub, _Closeable(source), http

    monkeypatch.setattr(commands, "create", create)
    result = CliRunner().invoke(
        app(), ["market", "backfill", "--start", "2026-08-06", "--end", "2026-08-07", *extra]
    )
    return result, captured, stub


class _Closeable:
    def __init__(self, client: httpx.Client) -> None:
        self.client = client

    def close(self) -> None:
        self.client.close()


def test_default_still_dispatches_and_no_dispatch_turns_it_off(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    result, captured, stub = invoke(monkeypatch)
    assert result.exit_code == 0, result.output
    assert captured[0]["dispatch_enabled"] is True
    assert "未派发" not in result.output
    assert stub.calls == [(date(2026, 8, 6), date(2026, 8, 7))]

    result, captured, stub = invoke(monkeypatch, "--no-dispatch")
    assert result.exit_code == 0, result.output
    assert captured[0]["dispatch_enabled"] is False
    assert "未派发部署（--no-dispatch）" in result.output
    assert stub.calls == [(date(2026, 8, 6), date(2026, 8, 7))]

    result, captured, _ = invoke(monkeypatch, "--dispatch")
    assert captured[0]["dispatch_enabled"] is True


def test_dispatch_closure_posts_markets_updated_only_when_enabled(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    requests: list[httpx.Request] = []

    def record(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(204, request=request)

    monkeypatch.setattr(
        commands,
        "HttpClient",
        lambda: HttpClient(client=httpx.Client(transport=httpx.MockTransport(record)), retries=0),
    )
    monkeypatch.setenv("GITHUB_REPOSITORY", "owner/repo")
    settings = Settings.model_construct(
        hub_api_url="https://api.test",
        hub_service_token=SecretStr("offline"),
        tushare_token=SecretStr("offline"),
        gh_automation_token=SecretStr("offline-github"),
    )
    eod, source, http = commands.create(ROOT, settings, dispatch_enabled=False)
    try:
        eod.dispatch(date(2026, 9, 30))
        assert requests == []
    finally:
        source.close()
        http.close()

    eod, source, http = commands.create(ROOT, settings)
    try:
        eod.dispatch(date(2026, 9, 30))
    finally:
        source.close()
        http.close()
    assert len(requests) == 1
    assert requests[0].method == "POST"
    assert requests[0].url.path == "/repos/owner/repo/dispatches"
    assert b"markets-updated" in requests[0].content
    assert b"2026-09-30" in requests[0].content
