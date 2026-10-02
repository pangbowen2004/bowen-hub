"""每周编排的HTTP协议回归，不以假评分声称真实模型验收。"""

import asyncio
import json
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any

import httpx
import pytest
from pydantic import SecretStr

from hub_ai import commands
from hub_ai.evals import weekly
from hub_ai.registry import Registry
from hub_ai.runtime import Runtime
from hub_contracts import EvalResult, Run
from hub_core.http import HttpClient
from hub_core.mail import Mailer
from hub_core.settings import Settings

from .prepare_fixture import prepare
from .test_ai import FakeAdapter


@pytest.mark.parametrize("passed", [True, False])
def test_weekly_persists_failed_scores_and_truthful_run(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, passed: bool
) -> None:
    requests: list[httpx.Request] = []
    saved: list[dict[str, Any]] = []

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.method == "GET":
            return httpx.Response(200, json={"items": [], "nextCursor": None})
        if request.url.path.startswith("/v1/internal/runs/"):
            saved.append(json.loads(request.content))
        return httpx.Response(204)

    async def evaluate(runtime: Runtime, name: str) -> EvalResult:
        return EvalResult(
            capability=name,
            model="offline-fixture",
            datasetVersion="fixed",
            scores={"schema_valid": float(passed)},
            passed=passed,
            costUsd=0.01,
            at=datetime.now(UTC),
        )

    monkeypatch.setattr(weekly, "evaluate", evaluate)

    def notify_failure(self: Mailer, job: str, on: date, summary: str, url: str) -> bool:
        return False

    monkeypatch.setattr(Mailer, "notify_failure", notify_failure)
    runtime = Runtime(Registry(prepare(tmp_path)), FakeAdapter([]))
    settings = Settings(hub_service_token=SecretStr("test-only"))
    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        monkeypatch.setattr(weekly, "HttpClient", lambda: HttpClient(client=transport))
        coroutine = weekly.execute_weekly(
            runtime, ["fixture.summary"], ["not.ready"], settings, date(2026, 10, 2)
        )
        assert len(asyncio.run(coroutine)) == 1
    assert saved[0]["status"] == "running"
    assert saved[-1]["status"] == ("succeeded" if passed else "failed")
    assert saved[-1]["stats"]["skippedMissingCases"] == ["not.ready"]
    assert saved[-1]["stats"]["evaluated"] == 1
    assert saved[-1]["stats"]["costUsd"] == 0.01
    assert saved[-1]["finishedAt"]
    evaluation = next(r for r in requests if r.url.path == "/v1/internal/evals/results/batch")
    assert json.loads(evaluation.content)[0]["passed"] is passed
    if not passed:
        assert saved[-1]["stats"]["failureNotificationSent"] is False


def test_weekly_success_on_later_page_is_not_repeated(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[httpx.Request] = []
    now = datetime.now(UTC)
    previous = Run(
        id="evals-weekly-2026-10-02",
        job="evals-weekly",
        date=date(2026, 10, 2),
        status="succeeded",
        startedAt=now,
        finishedAt=now,
        stats={},
        error=None,
    )

    def handler(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        if request.url.params.get("cursor"):
            return httpx.Response(
                200, json={"items": [previous.model_dump(mode="json")], "nextCursor": None}
            )
        return httpx.Response(200, json={"items": [], "nextCursor": "next"})

    runtime = Runtime(Registry(prepare(tmp_path)), FakeAdapter([]))
    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        monkeypatch.setattr(weekly, "HttpClient", lambda: HttpClient(client=transport))
        assert (
            asyncio.run(
                weekly.execute_weekly(
                    runtime,
                    ["fixture.summary"],
                    [],
                    Settings(hub_service_token=SecretStr("test-only")),
                    date(2026, 10, 2),
                )
            )
            == []
        )
    assert len(requests) == 2
    assert all(r.method == "GET" for r in requests)


def test_weekly_missing_dataset_skips_without_fake_result(
    tmp_path: Path, capsys: pytest.CaptureFixture[str]
) -> None:
    root = prepare(tmp_path)
    (root / "evals/fixture.summary/cases.yaml").unlink()
    commands.run(weekly=True, offline=True, root=root)
    text = capsys.readouterr().out
    assert "跳过 fixture.summary" in text
    assert "没有生成评测结果" in text
    assert "passed" not in text


@pytest.mark.parametrize("stage", ["preflight", "initial_write", "final_write"])
def test_weekly_io_failure_notifies_and_preserves_original_error(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch, stage: str
) -> None:
    saved: list[dict[str, Any]] = []
    notifications: list[str] = []
    original = RuntimeError("离线API故障")
    writes = 0

    def handler(request: httpx.Request) -> httpx.Response:
        nonlocal writes
        if request.method == "GET":
            if stage == "preflight":
                raise original
            return httpx.Response(200, json={"items": [], "nextCursor": None})
        if request.url.path.startswith("/v1/internal/runs/"):
            writes += 1
            if (stage == "initial_write" and writes == 1) or (
                stage == "final_write" and writes == 2
            ):
                raise original
            saved.append(json.loads(request.content))
        return httpx.Response(204)

    def notify_failure(self: Mailer, job: str, on: date, summary: str, url: str) -> bool:
        notifications.append(job)
        return False

    monkeypatch.setattr(Mailer, "notify_failure", notify_failure)
    runtime = Runtime(Registry(prepare(tmp_path)), FakeAdapter([]))
    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        http = HttpClient(client=transport)
        monkeypatch.setattr(weekly, "HttpClient", lambda: http)
        with pytest.raises(RuntimeError) as caught:
            asyncio.run(
                weekly.execute_weekly(
                    runtime,
                    [],
                    [],
                    Settings(hub_service_token=SecretStr("test-only")),
                    date(2026, 10, 2),
                )
            )
        assert caught.value is original
    assert notifications == ["evals-weekly"]
    assert saved[-1]["status"] == "failed"
    assert saved[-1]["stats"]["failureNotificationSent"] is False
    assert runtime.record is None
