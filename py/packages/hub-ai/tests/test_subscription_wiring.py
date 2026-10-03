"""套餐传输仍遵守领域校验、token 上限和调用记录。"""

import asyncio
import json
from typing import Any

import pytest

from hub_ai.evals.runner import JudgeScore
from hub_ai.gateway import GatewayAdapter
from hub_ai.registry import Registry, find_root
from hub_ai.runtime import Request, Response, Runtime, TransportError, Usage
from hub_ai.subscription import SubscriptionAdapter
from hub_contracts import AiCall
from hub_core.settings import Settings


class PlanAdapter:
    uses_subscription = True

    def __init__(self, *, over_limit: bool = False) -> None:
        self.over_limit = over_limit

    async def generate(self, request: Request) -> Response:
        output = {"score": 0.9} if request.output_model is JudgeScore else {"digest": "增长1.2%。"}
        return Response(
            output,
            Usage(100, request.max_output_tokens + 1 if self.over_limit else 20, 50),
        )


def test_plan_keeps_quality_and_usage_without_incremental_api_charge() -> None:
    registry = Registry(find_root())
    records: list[Any] = []

    async def record(call: Any) -> None:
        records.append(call)

    runtime = Runtime(registry, PlanAdapter(), record=record)
    result = asyncio.run(
        runtime.run(
            "news.filing_digest",
            {"symbol": "TEST", "name": "测试", "form": "8-K", "items": [], "text": "增长1.2%。"},
        )
    )
    assert result.ok
    assert result.output is not None
    assert result.output["digest"] == "增长1.2%。"
    assert result.output["generatedBy"]["capability"] == "news.filing_digest"
    assert result.call.inputTokens == 100
    assert result.call.outputTokens == 20
    assert result.call.costUsd == 0
    assert all(not report.failed for report in result.reports)
    score = asyncio.run(
        runtime.judge("news.filing_digest", {"system": "评分", "user": "事实"}, JudgeScore)
    )
    assert score == JudgeScore(score=0.9)
    assert records[-1].inputTokens == 100
    assert records[-1].outputTokens == 20
    assert records[-1].costUsd == 0


def test_plan_cannot_bypass_token_limit() -> None:
    result = asyncio.run(
        Runtime(Registry(find_root()), PlanAdapter(over_limit=True)).run(
            "news.filing_digest",
            {"symbol": "TEST", "name": "测试", "form": "8-K", "items": [], "text": "增长1.2%。"},
        )
    )
    assert not result.ok
    assert result.reason == "超过 token 上限"
    assert result.call.outputTokens > 0
    assert result.call.costUsd == 0


def test_subscription_selection_does_not_require_platform_api_key() -> None:
    adapter = GatewayAdapter(
        Registry(find_root()), Settings(hub_ai_backend="subscription", openai_api_key=None)
    )
    assert adapter.subscription is not None
    assert adapter.uses_subscription


class RecordedFailureAdapter(SubscriptionAdapter):
    """原adapter实际JSONL解析边界的离线回放，不执行CLI或模型。"""

    uses_subscription = True

    def __init__(self, failures: int, known_usage: bool) -> None:
        super().__init__()
        self.failures = failures
        self.known_usage = known_usage
        self.attempts = 0

    async def generate(self, request: Request) -> Response:
        self.attempts += 1
        output = {"score": 0.9} if request.output_model is JudgeScore else {"digest": "增长1.2%。"}
        failed = self.attempts <= self.failures
        if failed and not self.known_usage:
            raise TransportError()
        events = [
            {
                "type": "item.completed",
                "item": {"type": "agent_message", "text": json.dumps(output)},
            },
            {
                "type": "turn.completed",
                "usage": {
                    "input_tokens": 120,
                    "cached_input_tokens": 20,
                    "output_tokens": 50,
                    "reasoning_output_tokens": 35,
                },
            },
        ]
        return self._response(
            request, int(failed), "\n".join(json.dumps(event) for event in events).encode()
        )


@pytest.mark.parametrize("judge", [False, True])
@pytest.mark.parametrize("failures", [1, 3])
@pytest.mark.parametrize("known_usage", [False, True])
def test_each_failed_attempt_usage_counted_once_without_changing_retries(
    judge: bool, failures: int, known_usage: bool
) -> None:
    records: list[AiCall] = []
    sleeps: list[float] = []
    source = RecordedFailureAdapter(failures, known_usage)

    async def record(call: AiCall) -> None:
        records.append(call)

    async def sleep(seconds: float) -> None:
        sleeps.append(seconds)

    runtime = Runtime(Registry(find_root()), source, record=record, sleep=sleep)

    async def run() -> None:
        if judge:
            if failures == 3:
                with pytest.raises(TransportError):
                    await runtime.judge(
                        "news.filing_digest", {"system": "评分", "user": "事实"}, JudgeScore
                    )
            else:
                assert await runtime.judge(
                    "news.filing_digest", {"system": "评分", "user": "事实"}, JudgeScore
                ) == JudgeScore(score=0.9)
        else:
            result = await runtime.run(
                "news.filing_digest",
                {
                    "symbol": "TEST",
                    "name": "测试",
                    "form": "8-K",
                    "items": [],
                    "text": "增长1.2%。",
                },
            )
            assert result.ok == (failures == 1)
            if failures == 3:
                assert result.reason == "模型传输失败"

    asyncio.run(run())
    assert source.attempts == (2 if failures == 1 else 3)
    assert sleeps == ([1] if failures == 1 else [1, 2])
    assert len(records) == 1
    consumed = (failures if known_usage else 0) + (1 if failures == 1 else 0)
    assert records[0].inputTokens == 120 * consumed
    assert records[0].outputTokens == 50 * consumed
    assert records[0].costUsd == 0
    assert records[0].ok == (failures == 1)
