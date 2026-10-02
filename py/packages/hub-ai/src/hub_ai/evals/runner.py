"""实际评测入口：pydantic-evals 执行用例，未准备用例明确失败。"""

import fnmatch
import hashlib
import json
import logging
import re
import subprocess
from dataclasses import dataclass
from datetime import UTC, datetime
from pathlib import Path
from typing import Any, cast

import yaml
from pydantic import BaseModel, Field
from pydantic_evals import Case, Dataset
from pydantic_evals.evaluators import Evaluator, EvaluatorContext

from hub_ai.checks import CheckContext
from hub_ai.registry import Registry
from hub_ai.runtime import Adapter, Request, Response, Result, Runtime, Usage
from hub_contracts import AiCall, EvalResult


class EvalCase(BaseModel):
    id: str
    input: dict[str, Any]
    expect: dict[str, Any] = Field(default_factory=dict)
    tags: list[str] = Field(default_factory=list)
    # 运行上下文不是能力输入契约；来自 PDF 元数据。
    totalPages: int | None = None


class OfflineAdapter:
    """仅测试夹具的显式回放；缺记录即失败，禁止伪造成功响应。"""

    def __init__(self, responses: dict[str, Any]) -> None:
        self.responses = responses
        self.current = ""

    async def generate(self, request: Request) -> Response:
        if self.current not in self.responses:
            raise ValueError("离线夹具缺少该用例响应")
        value = self.responses[self.current]
        return Response(value["output"], Usage(**value.get("usage", {})))


class JudgeScore(BaseModel):
    score: float = Field(ge=0, le=1)


@dataclass
class Scorers(Evaluator[dict[str, Any], Result, EvalCase]):
    runtime: Runtime
    capability: dict[str, Any]
    dataset_dir: Path
    offline: bool = False

    async def evaluate(
        self, ctx: EvaluatorContext[dict[str, Any], Result, EvalCase]
    ) -> dict[str, float]:
        result = ctx.output
        case = ctx.metadata
        if case is None:
            raise ValueError("用例缺少元数据")
        scores: dict[str, float] = {"schema_valid": float(result.schema_valid)}
        raw = result.raw_output
        if raw is None or not result.schema_valid:
            return dict.fromkeys(self.capability["evals"]["thresholds"], 0.0)
        context = CheckContext(
            case.input,
            self.runtime.registry.schema(self.capability["io"]["output"]),
            self.runtime.registry.advice_words,
            case.totalPages,
        )
        for name in self.capability["checks"]:
            _, reports = self.runtime.checks.run([name], raw, context)
            scores[name] = float(not reports[0].changes and not reports[0].failed)
        text = json.dumps(raw, ensure_ascii=False)
        for name in ("must_include", "must_exclude"):
            if name not in self.capability["evals"]["thresholds"]:
                continue
            expected = case.expect.get(name)
            if not isinstance(expected, list) or not expected:
                raise ValueError(f"用例未准备评分期望：{name}")
            parts = cast(list[str], expected)
            scores[name] = sum(
                (part in text) if name == "must_include" else (part not in text) for part in parts
            ) / len(parts)
        if "labels_match" in self.capability["evals"]["thresholds"]:
            labels = case.expect.get("labels")
            if labels is None:
                raise ValueError("用例缺少 labels")
            # 审核契约采用单个结论；分类契约仍按 id→标签比较。
            actual = (
                {"decision": raw["decision"]}
                if self.capability["io"]["output"] == "PaperReviewOutput"
                else {
                    item["id"]: item["topic"]
                    for item in raw.get("classifications", raw.get("items", raw.get("labels", [])))
                }
            )
            scores["labels_match"] = (
                sum(actual.get(key) == value for key, value in labels.items()) / len(labels)
                if labels
                else 0.0
            )
        for name in self.capability["evals"]["thresholds"]:
            if name.startswith("judge_"):
                rubric = (self.dataset_dir / f"{name}.md").read_text()
                if self.offline:
                    raise ValueError("离线主观评分需显式假评审适配器，不能编造分数")
                judged = await self.runtime.judge(
                    self.capability["id"],
                    {
                        "system": rubric,
                        "user": json.dumps(
                            {
                                "input": case.input,
                                "output": raw,
                                "reference": case.expect.get("reference"),
                            },
                            ensure_ascii=False,
                        ),
                    },
                    JudgeScore,
                )
                scores[name] = JudgeScore.model_validate(judged).score
        missing = set(self.capability["evals"]["thresholds"]) - scores.keys()
        if missing:
            raise ValueError("未知或未准备评分器：" + ", ".join(sorted(missing)))
        return scores


def select_capabilities(
    registry: Registry,
    pattern: str | None = None,
    *,
    changed: bool = False,
    weekly: bool = False,
    changed_paths: list[str] | None = None,
) -> list[str]:
    ids = sorted(registry.capabilities)
    if pattern:
        ids = [name for name in ids if fnmatch.fnmatchcase(name, pattern)]
    if weekly:
        ids = [
            name
            for name in ids
            if registry.capabilities[name]["evals"].get("schedule", "weekly") == "weekly"
        ]
    if changed:
        if changed_paths is None:

            def git(*args: str) -> list[str]:
                process = subprocess.run(
                    ["git", *args], cwd=registry.root, text=True, capture_output=True, check=True
                )
                return process.stdout.splitlines()

            changed_paths = (
                git("diff", "--name-only", "origin/main...HEAD")
                + git("diff", "--name-only", "HEAD")
                + git("ls-files", "--others", "--exclude-standard")
            )
        ids = [
            name
            for name in ids
            if any(
                path == "config/llm.yaml"
                or path == f"capabilities/{name}.yaml"
                or path == registry.capabilities[name]["prompt"]
                or path.startswith(registry.capabilities[name]["evals"]["dataset"])
                for path in changed_paths
            )
        ]
    return ids


async def evaluate(
    runtime: Runtime, capability_id: str, *, offline: bool = False, candidate: str | None = None
) -> EvalResult:
    cap = runtime.registry.capabilities[capability_id]
    directory = runtime.registry.root / cap["evals"]["dataset"]
    path = directory / "cases.yaml"
    if not path.is_file():
        raise ValueError(f"评测未就绪：{capability_id} 缺少 cases.yaml")
    data = yaml.safe_load(path.read_text())
    if not isinstance(data, list) or not data:
        raise ValueError("评测未就绪：用例为空")
    cases = [EvalCase.model_validate(case) for case in cast(list[Any], data)]
    if len({case.id for case in cases}) != len(cases):
        raise ValueError("用例 id 重复")
    adapter: Adapter = runtime.adapter
    if offline:
        responses_path = directory / "responses.yaml"
        if not responses_path.is_file():
            raise ValueError("评测未就绪：缺少显式离线 responses.yaml")
        responses = yaml.safe_load(responses_path.read_text())
        adapter = OfflineAdapter(cast(dict[str, Any], responses))
    calls: list[AiCall] = []

    async def record(call: AiCall) -> None:
        calls.append(call)
        if runtime.record:
            await runtime.record(call)

    local = Runtime(
        runtime.registry, adapter, checks=runtime.checks, sleep=runtime.sleep, record=record
    )
    entries = [
        Case[dict[str, Any], Result, EvalCase](name=case.id, inputs=case.input, metadata=case)
        for case in cases
    ]
    scorer = Scorers(local, cap, directory, offline)
    dataset = Dataset[dict[str, Any], Result, EvalCase](
        name=capability_id, cases=entries, evaluators=[scorer]
    )
    # 顺序回放使 id 映射明确，产品执行仍使用运行时自己的异步入口。
    next_case = iter(cases)

    async def task(inputs: dict[str, Any]) -> Result:
        case = next(next_case)
        if isinstance(adapter, OfflineAdapter):
            adapter.current = case.id
        return await local.run(
            capability_id, inputs, total_pages=case.totalPages, candidate=candidate
        )

    report = await dataset.evaluate(
        task, max_concurrency=1, progress=False, retry_task=None, retry_evaluators=None
    )
    for case in report.cases:
        if not case.output.ok:
            # 模型失败是零分结果，不在pydantic-evals异常列表里；只记固定分类，不输出正文。
            name = re.sub(r"[^a-zA-Z0-9_.:-]", "_", case.name)[:80]
            reason = case.output.reason
            safe_reason = (
                reason
                if reason
                in {
                    "输入或输出契约不合格",
                    "超过 token 上限",
                    "结构修复后仍不合格",
                    "模型传输失败",
                    "校验执行失败",
                    "能力执行失败",
                }
                else "能力执行失败"
            )
            logging.getLogger(__name__).warning(
                "eval case=%s stage=runtime error=%s", name, safe_reason
            )
    if report.failures or any(case.evaluator_failures for case in report.cases):
        # 供应商异常可能含密钥/正文，只输出标识、已知异常类和固定安全分类。
        def identifier(value: str) -> str:
            return re.sub(r"[^a-zA-Z0-9_.:-]", "_", value)[:80]

        def error_label(message: str, error_type: str | None = None) -> str:
            for reason in (
                "超过 token 上限",
                "评审输出结构失败",
                "离线主观评分需显式假评审适配器",
                "用例缺少元数据",
                "用例缺少 labels",
                "用例未准备评分期望",
                "未知或未准备评分器",
            ):
                if reason in message:
                    return reason
            name = error_type or message.partition(":")[0]
            return (
                name
                if name
                in {
                    "ValueError",
                    "ValidationError",
                    "TransportError",
                    "StructureError",
                    "TokenLimitError",
                    "FileNotFoundError",
                    "OSError",
                    "TimeoutError",
                    "ModelAPIError",
                    "TypeError",
                    "KeyError",
                    "StopIteration",
                }
                else "Error"
            )

        failures = [
            f"case={identifier(failure.name)} stage=task error={error_label(failure.error_message)}"
            for failure in report.failures
        ]
        failures.extend(
            f"case={identifier(case.name)} stage=scorer scorer={identifier(failure.name)} "
            f"error={error_label(failure.error_message, failure.error_type)}"
            for case in report.cases
            for failure in case.evaluator_failures
        )
        cost = sum(call.costUsd for call in calls)
        raise ValueError(
            f"评测执行失败：{identifier(capability_id)}；"
            + "; ".join(failures[:10])
            + f"；失败项={len(failures)}；已记录费用 USD {cost:.6f}；未生成通过报告"
        )
    scores = {
        name: sum(float(case.scores[name].value) for case in report.cases) / len(cases)
        for name in cap["evals"]["thresholds"]
    }
    model = candidate or runtime.registry.llm["tiers"][cap["tier"]]["model"]
    return EvalResult(
        capability=capability_id,
        model=model,
        datasetVersion=hashlib.sha256(
            b"\n".join(
                file.name.encode() + b"\n" + file.read_bytes()
                for file in [*sorted(directory.glob("*.md")), path]
            )
        ).hexdigest()[:16],
        scores=scores,
        passed=all(scores[name] >= minimum for name, minimum in cap["evals"]["thresholds"].items()),
        at=datetime.now(UTC),
        costUsd=sum(call.costUsd for call in calls),
        durationMs=sum(call.durationMs for call in calls),
    )


def markdown(results: list[EvalResult]) -> str:
    rows = ["| 能力 | 模型 | 分数 | 达标 | 费用 USD |", "|---|---|---|---|---|"]
    for result in results:
        rows.append(
            f"| {result.capability} | {result.model} | {json.dumps(result.scores, ensure_ascii=False, sort_keys=True)} | {'通过' if result.passed else '失败'} | {result.costUsd or 0:.6f} |"
        )
    return "\n".join(rows) + "\n"
