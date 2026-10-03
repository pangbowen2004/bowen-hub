"""Pydantic AI 统一网关适配器；原生结构化输出不支持时改为工具输出。"""

import math
from collections.abc import Callable
from typing import Any, cast

from httpx import HTTPError
from openai import APIConnectionError, APITimeoutError, AsyncOpenAI
from pydantic import ValidationError
from pydantic_ai import (
    Agent,
    BinaryContent,
    CallToolsNode,
    ImageUrl,
    NativeOutput,
    ToolOutput,
    UsageLimits,
)
from pydantic_ai.exceptions import (
    ModelAPIError,
    ModelHTTPError,
    UnexpectedModelBehavior,
    UsageLimitExceeded,
)
from pydantic_ai.messages import TextPart, ToolCallPart
from pydantic_ai.models import Model
from pydantic_ai.models.openai import OpenAIChatModel, OpenAIChatModelSettings
from pydantic_ai.providers.openai import OpenAIProvider

from hub_ai.registry import Registry
from hub_ai.runtime import Request, Response, StructureError, TokenLimitError, TransportError, Usage
from hub_ai.subscription import SubscriptionAdapter
from hub_core.settings import Settings


def gateway_url(registry: Registry, settings: Settings) -> str:
    if not settings.cloudflare_account_id or settings.openai_api_key is None:
        raise ValueError("缺少 CLOUDFLARE_ACCOUNT_ID 或 OPENAI_API_KEY")
    return registry.llm["gateway"]["baseUrl"].format(
        CLOUDFLARE_ACCOUNT_ID=settings.cloudflare_account_id, AI_GATEWAY_ID=settings.ai_gateway_id
    )


class GatewayAdapter:
    def __init__(
        self,
        registry: Registry,
        settings: Settings,
        *,
        model_override: Model | None = None,
        observer: Callable[[dict[str, Any]], None] | None = None,
    ) -> None:
        self.subscription = (
            SubscriptionAdapter(
                observer=observer, catalog_path=registry.root / "config/codex-models.json"
            )
            if settings.hub_ai_backend == "subscription" and model_override is None
            else None
        )
        self.uses_subscription = self.subscription is not None
        self.model_override = model_override
        self.observer = observer
        self.provider = OpenAIProvider(
            openai_client=AsyncOpenAI(
                base_url=gateway_url(registry, settings)
                if model_override is None and self.subscription is None
                else "https://offline.invalid/v1",
                api_key=settings.openai_api_key.get_secret_value()
                if settings.openai_api_key
                else "offline",
                max_retries=0,
            )
        )

    async def generate(self, request: Request) -> Response:
        if self.subscription is not None:
            return await self.subscription.generate(request)
        model = self.model_override or OpenAIChatModel(request.model, provider=self.provider)
        for native in (True, False):
            if native and not model.profile.get("supports_json_schema_output", False):
                continue
            agent = Agent(
                model,
                output_type=NativeOutput(request.output_model)
                if native
                else ToolOutput(request.output_model),
                instructions=request.prompt["system"],
                retries=0,
            )
            content: list[Any] = [
                request.prompt["user"],
                *[
                    BinaryContent(data=image, media_type="image/png")
                    if isinstance(image, bytes)
                    else ImageUrl(url=image)
                    for image in request.images
                ],
            ]
            used = Usage()
            try:
                async with agent.iter(
                    content,
                    model_settings=OpenAIChatModelSettings(
                        max_tokens=request.max_output_tokens,
                        timeout=request.timeout_sec,
                        openai_reasoning_effort=cast(Any, request.reasoning),
                    ),
                    usage_limits=UsageLimits(
                        input_tokens_limit=request.max_input_tokens,
                        output_tokens_limit=request.max_output_tokens,
                    ),
                ) as run:
                    try:
                        async for node in run:
                            if self.observer is not None and isinstance(node, CallToolsNode):
                                response = node.model_response
                                parts: list[dict[str, Any]] = []
                                for part in response.parts:
                                    if isinstance(part, TextPart):
                                        parts.append({"kind": "text", "content": part.content})
                                    elif isinstance(part, ToolCallPart):
                                        parts.append(
                                            {
                                                "kind": "tool-call",
                                                "tool_name": part.tool_name,
                                                "args": part.args,
                                            }
                                        )
                                self.observer(
                                    {
                                        "phase": request.output_model.__name__,
                                        "repair": request.repair,
                                        "mode": "native" if native else "tool",
                                        "finish_reason": response.finish_reason,
                                        "usage": {
                                            "input_tokens": response.usage.input_tokens,
                                            "output_tokens": response.usage.output_tokens,
                                            "cache_read_tokens": response.usage.cache_read_tokens,
                                        },
                                        "parts": parts,
                                    }
                                )
                    finally:
                        tokens = run.usage
                        used = Usage(
                            tokens.input_tokens, tokens.output_tokens, tokens.cache_read_tokens
                        )
                    result = run.result
                    if result is None:
                        raise StructureError(used)
                    return Response(result.output.model_dump(mode="json"), used)
            except ModelHTTPError as error:
                # 400/422 明确指向 response_format/json_schema 时才降级，不用工具模式掩盖其他错误。
                if (
                    native
                    and error.status_code in (400, 422)
                    and any(
                        word in str(error.body).lower()
                        for word in ("response_format", "json_schema")
                    )
                ):
                    continue
                retry_after = None
                if error.status_code == 429:
                    headers = {key.lower(): value for key, value in (error.headers or {}).items()}
                    try:
                        seconds = float(headers.get("retry-after", ""))
                        if math.isfinite(seconds) and seconds > 0:
                            retry_after = min(seconds, 60)
                    except ValueError:
                        pass
                raise TransportError("网关请求失败", retry_after=retry_after) from None
            except ModelAPIError, HTTPError, TimeoutError, APIConnectionError, APITimeoutError:
                raise TransportError("网关传输失败") from None
            except UsageLimitExceeded:
                raise TokenLimitError(used) from None
            except UnexpectedModelBehavior as error:
                if self.observer is not None:
                    errors: list[dict[str, Any]] = []
                    current: BaseException | None = error
                    seen: set[int] = set()
                    while current is not None and id(current) not in seen:
                        seen.add(id(current))
                        details: list[Any] = []
                        if isinstance(current, ValidationError):
                            details = current.errors(
                                include_input=False, include_context=False, include_url=False
                            )
                        else:
                            retry = getattr(current, "tool_retry", None)
                            retry_content: Any = getattr(retry, "content", None)
                            if isinstance(retry_content, list):
                                details = cast(list[Any], retry_content)
                        errors.append(
                            {
                                "type": type(current).__name__
                                if type(current).__name__
                                in {"UnexpectedModelBehavior", "ToolRetryError", "ValidationError"}
                                else "Error",
                                "validation": [
                                    {
                                        "type": cast(dict[str, Any], item).get("type"),
                                        "loc": cast(dict[str, Any], item).get("loc"),
                                    }
                                    for item in details
                                    if isinstance(item, dict)
                                ],
                            }
                        )
                        current = current.__cause__ or current.__context__
                    self.observer(
                        {
                            "phase": request.output_model.__name__,
                            "repair": request.repair,
                            "mode": "native" if native else "tool",
                            "errors": errors,
                        }
                    )
                raise StructureError(used) from None
        raise StructureError()
