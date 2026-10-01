"""能力运行时：传输重试和结构修复分别计数；不记录输入输出正文。"""

import asyncio
import json
import time
from collections.abc import Awaitable, Callable
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Protocol

from pydantic import BaseModel, ValidationError

from hub_ai.checks import CheckContext, CheckRegistry, CheckReport
from hub_ai.registry import Registry
from hub_ai.render import render_prompt
from hub_contracts import AiCall


@dataclass
class Usage:
    input_tokens: int = 0
    output_tokens: int = 0
    cached_input_tokens: int = 0


@dataclass
class Response:
    output: Any
    usage: Usage = field(default_factory=Usage)


class StructureError(Exception):
    def __init__(self, usage: Usage | None = None) -> None:
        self.usage = usage or Usage()
        super().__init__("模型输出结构不合格")


class TokenLimitError(Exception):
    def __init__(self, usage: Usage) -> None:
        self.usage = usage
        super().__init__("超过 token 上限")


class TransportError(Exception):
    """仅安全分类；不把供应商正文泄漏给调用方。"""


@dataclass
class Request:
    model: str
    reasoning: str
    prompt: dict[str, str]
    output_model: type[BaseModel]
    max_input_tokens: int
    max_output_tokens: int
    timeout_sec: int
    images: list[bytes | str] = field(default_factory=lambda: list[bytes | str]())
    repair: bool = False


class Adapter(Protocol):
    async def generate(self, request: Request) -> Response: ...


@dataclass
class Result:
    ok: bool
    output: dict[str, Any] | None
    reports: list[CheckReport]
    call: AiCall
    fallback: str
    status: str
    reason: str | None = None
    raw_output: dict[str, Any] | None = None
    schema_valid: bool = False


class Runtime:
    def __init__(
        self,
        registry: Registry,
        adapter: Adapter,
        *,
        checks: CheckRegistry | None = None,
        record: Callable[[AiCall], Awaitable[None]] | None = None,
        sleep: Callable[[float], Awaitable[None]] = asyncio.sleep,
    ) -> None:
        self.registry = registry
        self.adapter = adapter
        self.checks = checks or CheckRegistry()
        self.record = record
        self.sleep = sleep

    async def run(
        self,
        capability_id: str,
        inputs: dict[str, Any],
        *,
        run_id: str | None = None,
        total_pages: int | None = None,
        images: dict[int, bytes | str] | None = None,
        candidate: str | None = None,
    ) -> Result:
        cap = self.registry.capabilities[capability_id]
        tier = self.registry.llm["tiers"][cap["tier"]]
        model: str = candidate or tier["model"]
        if model not in self.registry.llm["prices"]:
            raise ValueError("模型没有已登记单价")
        start = time.monotonic()
        at = datetime.now(UTC)
        usage = Usage()
        reports: list[CheckReport] = []
        raw: dict[str, Any] | None = None
        output: dict[str, Any] | None = None
        reason: str | None = None
        ok = False
        schema_valid = False

        def add_usage(value: Usage) -> None:
            usage.input_tokens += value.input_tokens
            usage.output_tokens += value.output_tokens
            usage.cached_input_tokens += value.cached_input_tokens

        try:
            self.registry.model(cap["io"]["input"]).model_validate(inputs)
            schema = self.registry.schema(cap["io"]["output"])
            context = CheckContext(inputs, schema, self.registry.advice_words, total_pages)
            if "pages_in_range" in cap["checks"] and (total_pages is None or total_pages < 1):
                raise ValueError("缺少真实 totalPages")
            for check in cap["checks"]:
                if check not in self.checks.checks:
                    raise ValueError(f"领域校验未注册：{check}")
            input_schema = self.registry.schema(cap["io"]["input"])
            attachments: list[bytes | str] = []
            for key, info in input_schema.get("properties", {}).items():
                if info.get("x-image"):
                    for page in inputs.get(key, []):
                        if images is None or page not in images:
                            raise ValueError("图片页码缺少对应附件")
                        attachments.append(images[page])
            prompt = render_prompt((self.registry.root / cap["prompt"]).read_text(), inputs)
            request = Request(
                model,
                tier["reasoning"],
                prompt,
                self.registry.model(cap["io"]["output"]),
                cap["limits"]["maxInputTokens"],
                cap["limits"]["maxOutputTokens"],
                cap["limits"]["timeoutSec"],
                attachments,
            )
            # 每次结构尝试可独立重试传输；结构只修复一次。
            for repair in range(2):
                try:
                    response: Response | None = None
                    for retry in range(min(2, self.registry.llm["defaults"]["maxRetries"]) + 1):
                        try:
                            response = await asyncio.wait_for(
                                self.adapter.generate(request), request.timeout_sec
                            )
                            break
                        except TransportError, TimeoutError:
                            if retry >= min(2, self.registry.llm["defaults"]["maxRetries"]):
                                raise TransportError("模型传输失败") from None
                            await self.sleep(2**retry)
                    if response is None:
                        raise TransportError("模型传输失败")
                    add_usage(response.usage)
                    if (
                        response.usage.input_tokens > request.max_input_tokens
                        or response.usage.output_tokens > request.max_output_tokens
                    ):
                        raise ValueError("超过 token 上限")
                    validated = request.output_model.model_validate(response.output)
                    schema_valid = repair == 0
                    raw = validated.model_dump(mode="json", exclude_unset=True)
                    break
                except (ValidationError, StructureError) as error:
                    if isinstance(error, StructureError):
                        add_usage(error.usage)
                    if repair == 1:
                        raise StructureError() from None
                    # 仅字段路径与错误类型，不回传验证异常里的私人 input。
                    errors = (
                        [
                            {"loc": list(item["loc"]), "type": item["type"]}
                            for item in error.errors(include_input=False)
                        ]
                        if isinstance(error, ValidationError)
                        else [{"type": "schema_invalid"}]
                    )
                    request.prompt = {
                        **prompt,
                        "user": prompt["user"]
                        + "\n修复输出结构："
                        + json.dumps(errors, ensure_ascii=False),
                    }
                    request.repair = True
            if raw is None:
                raise StructureError()
            output, reports = self.checks.run(cap["checks"], raw, context)
            if any(report.failed for report in reports):
                raise ValueError("确定性校验后没有可用内容")
            output["generatedBy"] = {
                "capability": capability_id,
                "version": cap["version"],
                "model": model,
                "at": datetime.now(UTC).isoformat(),
            }
            request.output_model.model_validate(output)
            ok = True
        except ValidationError:
            reason = "输入或输出契约不合格"
        except TokenLimitError as error:
            add_usage(error.usage)
            reason = "超过 token 上限"
        except StructureError:
            reason = "结构修复后仍不合格"
        except TransportError:
            reason = "模型传输失败"
        except ValueError as error:
            text = str(error)
            reason = (
                text
                if text.startswith(
                    ("缺少真实", "领域校验未注册", "图片页码缺少", "确定性校验后", "超过 token")
                )
                else "校验执行失败"
            )
        except Exception:
            reason = "能力执行失败"
        price = self.registry.llm["prices"][model]
        cached = min(usage.cached_input_tokens, usage.input_tokens)
        cost = (
            (usage.input_tokens - cached) * price["input"]
            + cached * price["cachedInput"]
            + usage.output_tokens * price["output"]
        ) / 1_000_000
        call = AiCall(
            capability=capability_id,
            version=cap["version"],
            model=model,
            inputTokens=usage.input_tokens,
            outputTokens=usage.output_tokens,
            costUsd=cost,
            durationMs=int((time.monotonic() - start) * 1000),
            ok=ok,
            runId=run_id,
            at=at,
        )
        if self.record:
            await self.record(call)
        status = (
            (
                "shadow"
                if cap["autonomy"] == "L0"
                else "draft"
                if cap["autonomy"] == "L1"
                else "ready"
            )
            if ok
            else "failed"
        )
        return Result(
            ok,
            output if ok and cap["autonomy"] != "L0" else None,
            reports,
            call,
            cap["fallback"],
            status,
            reason,
            raw,
            schema_valid,
        )

    async def judge(
        self, capability_id: str, prompt: dict[str, str], output_model: type[BaseModel]
    ) -> BaseModel:
        """主观评分仍经能力运行时，使用 balanced 档，费用记入同次评测。"""
        cap = self.registry.capabilities[capability_id]
        tier = self.registry.llm["tiers"]["balanced"]
        request = Request(
            tier["model"],
            tier["reasoning"],
            prompt,
            output_model,
            cap["limits"]["maxInputTokens"],
            512,
            cap["limits"]["timeoutSec"],
        )
        start = time.monotonic()
        at = datetime.now(UTC)
        usage = Usage()
        ok = False
        try:
            for repair in range(2):
                try:
                    response: Response | None = None
                    for retry in range(min(2, self.registry.llm["defaults"]["maxRetries"]) + 1):
                        try:
                            response = await asyncio.wait_for(
                                self.adapter.generate(request), request.timeout_sec
                            )
                            break
                        except TransportError, TimeoutError:
                            if retry == min(2, self.registry.llm["defaults"]["maxRetries"]):
                                raise TransportError() from None
                            await self.sleep(2**retry)
                    if response is None:
                        raise TransportError()
                    usage.input_tokens += response.usage.input_tokens
                    usage.output_tokens += response.usage.output_tokens
                    usage.cached_input_tokens += response.usage.cached_input_tokens
                    score = output_model.model_validate(response.output)
                    ok = True
                    return score
                except (ValidationError, StructureError) as error:
                    if isinstance(error, StructureError):
                        usage.input_tokens += error.usage.input_tokens
                        usage.output_tokens += error.usage.output_tokens
                        usage.cached_input_tokens += error.usage.cached_input_tokens
                    if repair == 1:
                        raise ValueError("评审输出结构失败") from None
                    request.prompt = {
                        **prompt,
                        "user": prompt["user"] + "\n修复输出结构：score 必须在0到1之间",
                    }
                    request.repair = True
            raise ValueError("评审没有输出")
        finally:
            price = self.registry.llm["prices"][tier["model"]]
            cached = min(usage.cached_input_tokens, usage.input_tokens)
            call = AiCall(
                capability=capability_id,
                version=cap["version"],
                model=tier["model"],
                inputTokens=usage.input_tokens,
                outputTokens=usage.output_tokens,
                costUsd=(
                    (usage.input_tokens - cached) * price["input"]
                    + cached * price["cachedInput"]
                    + usage.output_tokens * price["output"]
                )
                / 1e6,
                durationMs=int((time.monotonic() - start) * 1000),
                ok=ok,
                runId=None,
                at=at,
            )
            if self.record:
                await self.record(call)
