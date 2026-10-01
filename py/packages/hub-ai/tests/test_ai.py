"""离线验收：共享向量、规则、真实运行时调用计数及评分退出。"""

import asyncio
import json
from pathlib import Path
from typing import Any

import pytest
from pydantic_ai import Agent
from pydantic_ai.models.test import TestModel

from hub_ai.checks import CheckContext, CheckRegistry, quantities
from hub_ai.evals.runner import evaluate, select_capabilities
from hub_ai.registry import Registry, find_root
from hub_ai.render import render_prompt
from hub_ai.runtime import Request, Response, Runtime, StructureError, TransportError, Usage
from hub_contracts import FilingDigestOutput

from .prepare_fixture import prepare

ROOT = find_root()
VECTORS = sorted(
    path for path in (ROOT / "fixtures/samples/prompt-render").iterdir() if path.is_dir()
)


@pytest.mark.parametrize("path", VECTORS, ids=lambda path: path.name)
def test_shared_render(path: Path) -> None:
    assert render_prompt(
        (path / "template.md").read_text(), json.loads((path / "input.json").read_text())
    ) == json.loads((path / "expected.json").read_text())


def test_image_render() -> None:
    assert (
        render_prompt("## system\nx\n## user\n{{ pageImages }}\n", {"pageImages": [1, 3]})["user"]
        == "[\n  1,\n  3\n]"
    )


@pytest.mark.parametrize("text", ["1.2 billion", "1.2B", "12亿", "$1,200,000,000"])
def test_number_units(text: str) -> None:
    assert quantities(text) == {1_200_000_000}


@pytest.mark.parametrize(
    "text",
    ["2026年Q3发布8-K，Item 5.02，标普500。", "2026-10-01 03:00 Form 4 第三季度 October 3。"],
)
def test_number_exclusions(text: str) -> None:
    assert not quantities(text)


def context() -> CheckContext:
    return CheckContext(
        {"text": "收入1.2 billion，涨1.23%。", "articles": [{"id": 5}, {"id": "s1"}]},
        {
            "properties": {
                "text": {"x-max-chars": 8},
                "lines": {"type": "array", "items": {"type": "string"}, "x-max-chars": 8},
                "items": {
                    "type": "array",
                    "items": {"properties": {"quote": {"x-source-quote": True}}},
                },
            }
        },
        ["建议买入"],
        3,
    )


def test_six_checks() -> None:
    checks = CheckRegistry()
    ctx = context()
    out, reports = checks.run(["numbers_in_sources"], {"text": "收入12亿。新增900%。"}, ctx)
    assert out["text"] == "收入12亿。"
    assert reports[0].changes
    assert checks.run(["numbers_in_sources"], {"text": "数量123。"}, ctx)[1][0].failed
    out, _ = checks.run(["source_ids_exist"], {"sourceIds": [5, "s1", "fake"]}, ctx)
    assert out["sourceIds"] == [5, "s1"]
    assert not checks.run(["source_ids_exist"], {"sourceIds": []}, ctx)[1][0].failed
    assert checks.run(["source_ids_exist"], {"sourceIds": ["fake"]}, ctx)[1][0].failed
    assert checks.run(["source_ids_exist"], {"items": [{"id": "s1"}, {"id": "fake"}]}, ctx)[0][
        "items"
    ] == [{"id": "s1"}]
    assert (
        checks.run(["no_advice"], {"text": "事实明确。建议买入。"}, ctx)[0]["text"] == "事实明确。"
    )
    assert checks.run(
        ["length_within"],
        {"text": "一句。第二句太长超过。", "lines": ["一句。第二句太长超过。"]},
        ctx,
    )[0] == {"text": "一句。", "lines": ["一句。"]}
    assert checks.run(["length_within"], {"text": "没有完整句但是很长"}, ctx)[1][0].failed
    assert checks.run(
        ["pages_in_range"], {"pages": [0, 1, 3, 4], "pagesChecked": [2, 5], "pdfPage": 9}, ctx
    )[0] == {"pages": [1, 3], "pagesChecked": [2], "pdfPage": None}
    ctx.total_pages = None
    with pytest.raises(ValueError, match="totalPages"):
        checks.run(["pages_in_range"], {"pages": [1]}, ctx)
    with pytest.raises(ValueError, match="未注册"):
        checks.run(["paper_draft"], {}, ctx)
    ctx.inputs = {"pages": "L123: 收入\nL124: 12亿"}
    assert checks.run(
        ["quotes_in_sources"], {"items": [{"quote": "收入 12亿"}, {"quote": "伪造引文"}]}, ctx
    )[0]["items"] == [{"quote": "收入 12亿"}]


class FakeAdapter:
    def __init__(self, responses: list[Response | Exception]) -> None:
        self.responses = responses
        self.requests: list[Request] = []

    async def generate(self, request: Request) -> Response:
        self.requests.append(request)
        value = self.responses.pop(0)
        if isinstance(value, Exception):
            raise value
        return value


INPUT: dict[str, Any] = {
    "symbol": "TEST",
    "name": "测试",
    "form": "8-K",
    "items": [],
    "text": "增长1.2%。",
}
USAGE = Usage(100, 20, 50)


def test_retry_repair_usage() -> None:
    adapter = FakeAdapter(
        [
            TransportError(),
            TransportError(),
            Response({"bad": True}, USAGE),
            Response({"digest": "增长1.2%。"}, USAGE),
        ]
    )
    sleeps: list[float] = []
    records: list[Any] = []

    async def sleep(seconds: float) -> None:
        sleeps.append(seconds)

    async def record(call: Any) -> None:
        records.append(call)

    registry = Registry(ROOT)
    result = asyncio.run(
        Runtime(registry, adapter, sleep=sleep, record=record).run("news.filing_digest", INPUT)
    )
    assert len(adapter.requests) == 4
    assert sleeps == [1, 2]
    assert adapter.requests[-1].repair
    assert result.ok
    assert not result.schema_valid
    assert result.call.inputTokens == 200
    assert len(records) == 1
    price = registry.llm["prices"][result.call.model]
    assert (
        result.call.costUsd
        == (100 * price["input"] + 100 * price["cachedInput"] + 40 * price["output"]) / 1e6
    )
    assert result.output
    assert result.output["generatedBy"]["capability"] == "news.filing_digest"


def test_final_transport_failure() -> None:
    adapter = FakeAdapter([TransportError("私人正文") for _ in range(3)])

    async def sleep(seconds: float) -> None:
        pass

    result = asyncio.run(
        Runtime(Registry(ROOT), adapter, sleep=sleep).run("news.filing_digest", INPUT)
    )
    assert len(adapter.requests) == 3
    assert not result.ok
    assert not result.call.ok
    assert result.reason == "模型传输失败"
    assert result.fallback == "items_only"


def test_structure_failures_count_usage() -> None:
    adapter = FakeAdapter([StructureError(USAGE), StructureError(USAGE)])
    result = asyncio.run(Runtime(Registry(ROOT), adapter).run("news.filing_digest", INPUT))
    assert not result.ok
    assert len(adapter.requests) == 2
    assert result.call.inputTokens == 200


@pytest.mark.parametrize("autonomy", ["L0", "L1", "L2"])
def test_autonomy(autonomy: str) -> None:
    registry = Registry(ROOT)
    registry.capabilities["news.filing_digest"]["autonomy"] = autonomy
    result = asyncio.run(
        Runtime(registry, FakeAdapter([Response({"digest": "增长1.2%。"})])).run(
            "news.filing_digest", INPUT
        )
    )
    assert result.ok
    assert result.status == {"L0": "shadow", "L1": "draft", "L2": "ready"}[autonomy]
    assert (result.output is None) == (autonomy == "L0")


def test_page_context_missing_no_calls() -> None:
    adapter = FakeAdapter([])
    inputs: dict[str, Any] = {
        "question": "问题",
        "guide": {},
        "claims": [],
        "pages": "=== p.1 ===\n原文",
    }
    result = asyncio.run(Runtime(Registry(ROOT), adapter).run("papers.qa", inputs))
    assert not result.ok
    assert result.reason == "缺少真实 totalPages"
    assert not adapter.requests


def test_model_test_adapter() -> None:
    # 真正使用 Pydantic AI TestModel，保持离线，而非只模拟自建协议。
    agent = Agent(
        TestModel(custom_output_args={"digest": "增长1.2%。"}), output_type=FilingDigestOutput
    )
    result = asyncio.run(agent.run("离线事实包"))
    assert result.output.digest == "增长1.2%。"


def test_registry_and_selection() -> None:
    registry = Registry(ROOT)
    assert len(registry.capabilities) == 11
    assert (
        select_capabilities(
            registry,
            changed=True,
            changed_paths=["capabilities/_schema.json", "packages/ai/src/runtime.ts"],
        )
        == []
    )
    assert select_capabilities(registry, changed=True, changed_paths=["prompts/news_brief.md"]) == [
        "news.brief"
    ]
    assert len(select_capabilities(registry, changed=True, changed_paths=["config/llm.yaml"])) == 11
    assert "papers.author" not in select_capabilities(registry, weekly=True)


def test_offline_eval_scores_and_missing(tmp_path: Path) -> None:
    registry = Registry(prepare(tmp_path))
    runtime = Runtime(registry, FakeAdapter([]))
    result = asyncio.run(evaluate(runtime, "fixture.summary", offline=True))
    assert result.passed
    assert all(score == 1 for score in result.scores.values())
    assert result.costUsd == 0.00195
    (tmp_path / "evals/fixture.summary/cases.yaml").unlink()
    with pytest.raises(ValueError, match="未就绪"):
        asyncio.run(evaluate(runtime, "fixture.summary", offline=True))


def test_gateway_adapter_with_pydantic_test_model() -> None:
    from hub_ai.gateway import GatewayAdapter
    from hub_core.settings import Settings

    adapter = GatewayAdapter(
        Registry(ROOT),
        Settings(),
        model_override=TestModel(custom_output_args={"digest": "增长1.2%。"}),
    )
    result = asyncio.run(Runtime(Registry(ROOT), adapter).run("news.filing_digest", INPUT))
    assert result.ok
    assert result.call.inputTokens > 0


def test_image_missing_attachment_no_call() -> None:
    registry = Registry(ROOT)
    # 使用已生成图片输入模型，领域输出/图片契约不另造。
    cap = registry.capabilities["news.filing_digest"]
    cap["io"]["input"] = "PaperReviewInput"
    cap["prompt"] = "prompts/paper_review.md"
    inputs: dict[str, Any] = {
        "paperId": "p",
        "paper": {
            "id": "p",
            "meta": {"title": "论文"},
            "status": {
                "updatedAt": "2026-10-01",
                "visibility": "private",
                "review": "draft",
                "readingDepth": "R0",
                "nextAction": "阅读",
            },
        },
        "pages": "原文",
        "pageImages": [1],
    }
    adapter = FakeAdapter([])
    result = asyncio.run(Runtime(registry, adapter).run("news.filing_digest", inputs))
    assert not result.ok
    assert not adapter.requests
    assert result.reason == "图片页码缺少对应附件"


def test_eval_failure_is_not_repaired_green(tmp_path: Path) -> None:
    registry = Registry(prepare(tmp_path))
    path = tmp_path / "evals/fixture.summary/responses.yaml"
    import yaml

    data = yaml.safe_load(path.read_text())
    data["basic"]["output"]["digest"] = "收入900%。"
    path.write_text(yaml.safe_dump(data, allow_unicode=True))
    result = asyncio.run(
        evaluate(Runtime(registry, FakeAdapter([])), "fixture.summary", offline=True)
    )
    assert not result.passed
    assert result.scores["numbers_in_sources"] == 0.5


def test_judge_uses_balanced_and_records_usage() -> None:
    from hub_ai.evals.runner import JudgeScore

    registry = Registry(ROOT)
    adapter = FakeAdapter([Response({"score": 2}, USAGE), Response({"score": 0.8}, USAGE)])
    calls: list[Any] = []

    async def record(call: Any) -> None:
        calls.append(call)

    score = asyncio.run(
        Runtime(registry, adapter, record=record).judge(
            "news.filing_digest", {"system": "评审规则", "user": "输入输出"}, JudgeScore
        )
    )
    assert JudgeScore.model_validate(score).score == 0.8
    assert adapter.requests[0].model == registry.llm["tiers"]["balanced"]["model"]
    assert len(adapter.requests) == 2
    assert calls[0].inputTokens == 200


def test_cli_offline_threshold_exit(tmp_path: Path) -> None:
    from typer.testing import CliRunner

    from hub_cli.main import create_app

    root = prepare(tmp_path)
    runner = CliRunner()
    result = runner.invoke(create_app(), ["evals", "run", "--root", str(root), "--offline"])
    assert result.exit_code == 0
    assert "通过" in result.output
    (root / "evals/fixture.summary/responses.yaml").write_text("{}\n")
    failed = runner.invoke(create_app(), ["evals", "run", "--root", str(root), "--offline"])
    assert failed.exit_code == 1
    assert "失败" in failed.output
