"""可选逐例artifact保留真实失败与模型响应，排除评测输入和供应商错误正文。"""

import asyncio
import json
from pathlib import Path
from typing import Any

import httpx
import pytest
import yaml
from pydantic import SecretStr
from pydantic_ai.messages import ModelMessage, ModelResponse, TextPart
from pydantic_ai.models.function import AgentInfo, FunctionModel
from pydantic_ai.usage import RequestUsage
from typer.testing import CliRunner

from hub_ai.evals.case_report import CaseReport
from hub_ai.evals.runner import evaluate
from hub_ai.gateway import GatewayAdapter
from hub_ai.registry import Registry
from hub_ai.runtime import Runtime
from hub_core.settings import Settings

from .prepare_fixture import prepare


def read_cases(path: Path, capability: str = "fixture.summary") -> list[dict[str, Any]]:
    return json.loads(path.read_text())["capabilities"][capability]["cases"]


def test_cli_failed_case_report_groups_without_input_leaks(tmp_path: Path) -> None:
    from hub_cli.main import create_app

    root = prepare(tmp_path / "repo")
    cap = yaml.safe_load((root / "capabilities/fixture.summary.yaml").read_text())
    cap["id"] = "fixture.second"
    (root / "capabilities/fixture.second.yaml").write_text(yaml.safe_dump(cap))
    cases_path = root / "evals/fixture.summary/cases.yaml"
    cases = yaml.safe_load(cases_path.read_text())
    for case in cases:
        case["input"]["private"] = {"headers": {"Authorization": "private-input-sentinel"}}
        case["input"]["image"] = "private-image-sentinel"
    cases_path.write_text(yaml.safe_dump(cases, allow_unicode=True))
    responses_path = root / "evals/fixture.summary/responses.yaml"
    responses = yaml.safe_load(responses_path.read_text())
    responses["basic"]["output"]["digest"] = "收入900%。"
    responses_path.write_text(yaml.safe_dump(responses, allow_unicode=True))
    report = tmp_path / "cases.json"
    report.write_text("旧内容")
    report.chmod(0o644)
    invoked = CliRunner().invoke(
        create_app(),
        ["evals", "run", "--root", str(root), "--offline", "--case-report", str(report)],
    )
    assert invoked.exit_code == 1
    data = json.loads(report.read_text())
    assert set(data["capabilities"]) == {"fixture.summary", "fixture.second"}
    rows = read_cases(report)
    assert [row["id"] for row in rows] == ["basic", "dates"]
    assert rows[0]["raw_output"]["digest"] == "收入900%。"
    assert rows[0]["scores"]["numbers_in_sources"] == 0
    assert rows[0]["check_reports"][0]["changes"]
    assert rows[0]["call"]["inputTokens"] == 1000
    assert report.stat().st_mode & 0o777 == 0o600
    assert "private-input-sentinel" not in report.read_text()
    assert "private-image-sentinel" not in report.read_text()
    assert "Authorization" not in report.read_text()
    assert "inputs" not in rows[0]
    assert "metadata" not in rows[0]


def test_cli_default_writes_no_case_file(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    from hub_ai import commands
    from hub_cli.main import create_app

    root = prepare(tmp_path)
    original_files = set(root.rglob("*"))

    def forbidden(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("默认不能创建逐例报告")

    monkeypatch.setattr(commands, "CaseReport", forbidden)
    invoked = CliRunner().invoke(create_app(), ["evals", "run", "--root", str(root), "--offline"])
    assert invoked.exit_code == 0
    assert set(root.rglob("*")) == original_files


@pytest.mark.parametrize("repair_succeeds", [False, True])
def test_native_first_invalid_json_and_repair_remain_scored_failure(
    tmp_path: Path, repair_succeeds: bool
) -> None:
    root = prepare(tmp_path / "repo")
    registry = Registry(root)
    writer = CaseReport(tmp_path / "cases.json")
    count = 0

    async def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        nonlocal count
        count += 1
        text = '{"digest":' if count % 2 == 1 or not repair_succeeds else '{"digest":"收入12亿。"}'
        return ModelResponse(
            [TextPart(text)],
            finish_reason="length" if text.endswith(":") else "stop",
            usage=RequestUsage(input_tokens=7, output_tokens=3),
            provider_details={"headers": {"Authorization": "private-response-metadata"}},
        )

    adapter = GatewayAdapter(
        registry, Settings(), model_override=FunctionModel(respond), observer=writer.observe
    )
    result = asyncio.run(
        evaluate(Runtime(registry, adapter), "fixture.summary", case_report=writer)
    )
    assert not result.passed
    assert result.scores["schema_valid"] == 0
    assert count == 4  # 原两例，每例原有一次修复；观察器没有增添模型调用。
    for row in read_cases(writer.path):
        assert row["schema_valid"] is False
        assert row["ok"] is repair_succeeds
        assert row["call"]["inputTokens"] == 14
        assert row["call"]["outputTokens"] == 6
        events = row["model_responses"]
        responses = [event for event in events if "parts" in event]
        assert [event["repair"] for event in responses] == [False, True]
        assert responses[0]["parts"][0]["content"] == '{"digest":'
        assert responses[0]["finish_reason"] == "length"
        assert responses[0]["usage"]["output_tokens"] == 3
        assert any(event.get("errors") for event in events)
    assert "private-response-metadata" not in writer.path.read_text()
    assert "headers" not in writer.path.read_text()


def test_judge_exception_still_raises_with_case_associated_responses(tmp_path: Path) -> None:
    root = prepare(tmp_path / "repo")
    cap_path = root / "capabilities/fixture.summary.yaml"
    cap = yaml.safe_load(cap_path.read_text())
    cap["evals"]["thresholds"]["judge_faithful"] = 0.8
    cap_path.write_text(yaml.safe_dump(cap))
    (root / "evals/fixture.summary/judge_faithful.md").write_text("合成评审规则")
    llm_path = root / "config/llm.yaml"
    llm = yaml.safe_load(llm_path.read_text())
    llm["tiers"]["balanced"] = llm["tiers"]["fast"]
    llm["defaults"]["judgeMaxOutputTokens"] = 300
    llm_path.write_text(yaml.safe_dump(llm))
    writer = CaseReport(tmp_path / "cases.json")

    async def respond(messages: list[ModelMessage], info: AgentInfo) -> ModelResponse:
        text = (
            '{"score":"bad"}' if info.instructions == "合成评审规则" else '{"digest":"收入12亿。"}'
        )
        return ModelResponse([TextPart(text)], usage=RequestUsage(input_tokens=7, output_tokens=3))

    registry = Registry(root)
    adapter = GatewayAdapter(
        registry, Settings(), model_override=FunctionModel(respond), observer=writer.observe
    )
    with pytest.raises(ValueError, match="评测执行失败"):
        asyncio.run(evaluate(Runtime(registry, adapter), "fixture.summary", case_report=writer))
    for row in read_cases(writer.path):
        assert row["errors"][0]["stage"] == "scorer"
        assert row["errors"][0]["error"] == "ValueError"
        assert row["scores"] == {}  # 异常评审没有凭空填分。
        assert row["raw_output"]["digest"] == "收入12亿。"
        phases = {event["phase"] for event in row["model_responses"]}
        assert phases == {"FilingDigestOutput", "JudgeScore"}


def test_weekly_case_report_routes_through_real_evaluator(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from datetime import date

    from hub_ai.evals import weekly
    from hub_ai.runtime import Response, Usage
    from hub_core.http import HttpClient
    from hub_core.mail import Mailer

    from .test_ai import FakeAdapter

    registry = Registry(prepare(tmp_path / "repo"))
    runtime = Runtime(
        registry,
        FakeAdapter(
            [
                Response({"digest": "收入同比增长1.2%。"}, Usage(100, 10)),
                Response({"digest": "收入12亿。"}, Usage(100, 10)),
            ]
        ),
    )
    writer = CaseReport(tmp_path / "weekly-cases.json")

    def notify(*args: Any) -> bool:
        return False

    monkeypatch.setattr(Mailer, "notify_failure", notify)
    with httpx.Client(
        transport=httpx.MockTransport(
            lambda request: (
                httpx.Response(200, json={"items": [], "nextCursor": None})
                if request.method == "GET"
                else httpx.Response(204)
            )
        )
    ) as transport:
        monkeypatch.setattr(weekly, "HttpClient", lambda: HttpClient(client=transport))
        results = asyncio.run(
            weekly.execute_weekly(
                runtime,
                ["fixture.summary"],
                [],
                Settings(hub_service_token=SecretStr("test-only")),
                date(2026, 10, 2),
                case_report=writer,
            )
        )
    assert results[0].passed
    assert len(read_cases(writer.path)) == 2


def test_unexpected_scorer_exception_body_is_not_reported(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from hub_ai.evals.runner import Scorers

    from .test_ai import FakeAdapter

    root = prepare(tmp_path / "repo")
    writer = CaseReport(tmp_path / "cases.json")

    async def fail(*args: Any, **kwargs: Any) -> dict[str, float]:
        raise ValueError("headers Authorization private-exception-body")

    monkeypatch.setattr(Scorers, "_evaluate", fail)
    with pytest.raises(ValueError, match="评测执行失败"):
        asyncio.run(
            evaluate(
                Runtime(Registry(root), FakeAdapter([])),
                "fixture.summary",
                offline=True,
                case_report=writer,
            )
        )
    assert read_cases(writer.path)[0]["errors"][0]["error"] == "ValueError"
    assert "private-exception-body" not in writer.path.read_text()
    assert "Authorization" not in writer.path.read_text()


def test_tool_output_invalid_args_are_captured_before_validation(tmp_path: Path) -> None:
    from pydantic_ai.models.test import TestModel

    registry = Registry(prepare(tmp_path / "repo"))
    writer = CaseReport(tmp_path / "cases.json")
    adapter = GatewayAdapter(
        registry,
        Settings(),
        model_override=TestModel(custom_output_args={"digest": 5}),
        observer=writer.observe,
    )
    result = asyncio.run(
        evaluate(Runtime(registry, adapter), "fixture.summary", case_report=writer)
    )
    assert not result.passed
    for row in read_cases(writer.path):
        responses = [event for event in row["model_responses"] if "parts" in event]
        assert [event["repair"] for event in responses] == [False, True]
        assert all(event["mode"] == "tool" for event in responses)
        assert responses[0]["parts"][0]["args"] == {"digest": 5}
        assert responses[0]["parts"][0]["tool_name"] == "final_result"


def test_task_exception_report_does_not_invent_schema_or_scores(tmp_path: Path) -> None:
    from hub_contracts import AiCall

    from .test_ai import FakeAdapter

    async def record(call: AiCall) -> None:
        raise ValueError("Authorization private-task-body")

    writer = CaseReport(tmp_path / "cases.json")
    runtime = Runtime(Registry(prepare(tmp_path / "repo")), FakeAdapter([]), record=record)
    with pytest.raises(ValueError, match="评测执行失败"):
        asyncio.run(evaluate(runtime, "fixture.summary", offline=True, case_report=writer))
    for row in read_cases(writer.path):
        assert row["schema_valid"] is None
        assert row["scores"] == {}
        assert row["call"] is None
        assert row["errors"] == [{"stage": "task", "error": "ValueError"}]
    assert "private-task-body" not in writer.path.read_text()
    assert "Authorization" not in writer.path.read_text()


def test_ci_artifact_path_matches_mise_directory_and_actual_cli_output(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import shlex
    import tomllib

    from hub_ai.registry import find_root
    from hub_cli.main import create_app

    project = find_root()
    task = tomllib.loads((project / "mise.toml").read_text())["tasks"]["evals"]
    workflow = yaml.load((project / ".github/workflows/ci.yml").read_text(), Loader=yaml.BaseLoader)
    steps = workflow["jobs"]["ci"]["steps"]
    command = next(
        shlex.split(step["run"])
        for step in steps
        if shlex.split(step.get("run", ""))[:3] == ["mise", "run", "evals"]
    )
    report_argument = command[command.index("--case-report") + 1]
    artifact = next(step for step in steps if step.get("with", {}).get("name") == "eval-cases")
    root = prepare(tmp_path / "checkout")
    task_directory = Path(task["dir"].replace("{{config_root}}", str(root)))
    artifact_path = (root / artifact["with"]["path"]).resolve()
    report_path = (task_directory / report_argument).resolve()
    assert report_path == artifact_path
    task_directory.mkdir(parents=True, exist_ok=True)
    monkeypatch.chdir(task_directory)
    # 从真实mise工作目录执行真实CLI，模型仅使用固定离线回放。
    invoked = CliRunner().invoke(
        create_app(),
        ["evals", "run", "--offline", "--root", str(root), "--case-report", report_argument],
    )
    assert invoked.exit_code == 0
    assert [case["id"] for case in read_cases(artifact_path)] == ["basic", "dates"]
    assert artifact_path.stat().st_mode & 0o777 == 0o600
