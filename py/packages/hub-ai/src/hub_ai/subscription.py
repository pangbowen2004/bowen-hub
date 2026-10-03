"""官方 Codex CLI 的 ChatGPT 登录适配器；不用 API key，不开放代理工具。"""

import asyncio
import json
import os
import signal
from collections.abc import Callable, Mapping
from contextlib import suppress
from copy import deepcopy
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any

from pydantic import ValidationError
from pydantic_ai.profiles.openai import OpenAIJsonSchemaTransformer

from hub_ai.runtime import Request, Response, StructureError, TokenLimitError, TransportError, Usage

# 仅支持已核对官方工具注册逻辑的版本，升级后必须重新核对，不能静默放开新工具。
CLI_VERSION = "codex-cli 0.160.0"
DISABLED_FEATURES = (
    "shell_tool",
    "unified_exec",
    "view_image",
    "image_generation",
    "web_search_cached",
    "web_search_request",
    "standalone_web_search",
    "search_tool",
    "browser_use",
    "browser_use_external",
    "computer_use",
    "in_app_browser",
    "apps",
    "plugins",
    "remote_plugin",
    "recommended_plugins",
    "tool_suggest",
    "tool_search",
    "js_repl",
    "js_repl_tools_only",
    "code_mode",
    "code_mode_host",
    "code_mode_only",
    "code_mode_prewarm",
    "multi_agent",
    "multi_agent_v2",
    "collaboration_modes",
    "agent_message_board",
    "goals",
    "memories",
    "request_permissions_tool",
    "request_rule",
    "deferred_executor",
    "send_message_to_user_async",
    "send_async_message",
    "default_mode_request_user_input",
    "current_time_reminder",
    "sleep_tool",
    "token_budget",
    "hooks",
    "skill_search",
    "skill_mcp_dependency_install",
    "workspace_dependencies",
    "worktrees",
    "codex_git_commit",
    "enable_mcp_apps",
    "unavailable_dummy_tools",
)


def _write(path: Path, content: bytes) -> None:
    descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
    with os.fdopen(descriptor, "wb") as output:
        output.write(content)


def _counter(value: object) -> int:
    if type(value) is not int or value < 0:
        raise TransportError("订阅调用用量记录无效")
    return value


class SubscriptionAdapter:
    uses_subscription = True

    def __init__(
        self,
        *,
        observer: Callable[[dict[str, Any]], None] | None = None,
        executable: str | tuple[str, ...] = "codex",
        catalog_path: Path | None = None,
    ) -> None:
        self.observer = observer
        self.command = (executable,) if isinstance(executable, str) else executable
        if not self.command:
            raise ValueError("订阅 CLI 命令不能为空")
        # 只读取公开模型元数据；登录凭据由官方 CLI 自行使用，适配器不读取 auth.json。
        home = Path(os.environ.get("CODEX_HOME", str(Path.home() / ".codex")))
        self.catalog_path = catalog_path or home / "models_cache.json"

    async def _process(
        self, args: list[str], cwd: Path, prompt: bytes | None = None
    ) -> tuple[int, bytes]:
        # 不继承 API key、业务凭据或供应商地址，保留官方登录和系统执行必需路径。
        environment = {
            key: os.environ[key]
            for key in ("PATH", "HOME", "CODEX_HOME", "TMPDIR", "SYSTEMROOT", "WINDIR")
            if key in os.environ
        }
        process: asyncio.subprocess.Process | None = None
        try:
            spawning = asyncio.create_task(
                asyncio.create_subprocess_exec(
                    *self.command,
                    *args,
                    cwd=cwd,
                    env=environment,
                    stdin=asyncio.subprocess.PIPE
                    if prompt is not None
                    else asyncio.subprocess.DEVNULL,
                    stdout=asyncio.subprocess.PIPE,
                    stderr=asyncio.subprocess.DEVNULL,
                    start_new_session=True,
                )
            )
            try:
                process = await asyncio.shield(spawning)
            except asyncio.CancelledError:
                # spawn 可能已经创建 OS 进程但尚未返回句柄；取得句柄后仍由 finally 清理。
                process = await spawning
                raise
            assert process is not None
            output, _ = await process.communicate(prompt)
            return process.returncode or 0, output
        except OSError:
            raise TransportError("订阅 CLI 无法启动") from None
        finally:
            if process is not None and process.returncode is None:
                # 取消整个独立进程组，避免孙进程继续读输入或写临时目录。
                with suppress(ProcessLookupError):
                    os.killpg(process.pid, signal.SIGKILL)
                await process.wait()

    def _catalog(self, request: Request) -> dict[str, Any]:
        if not request.model.startswith("openai/") or not request.model.removeprefix("openai/"):
            raise TransportError("订阅模式只支持原 OpenAI 模型")
        slug = request.model.removeprefix("openai/")
        try:
            catalog: dict[str, Any] = json.loads(self.catalog_path.read_text())
            models = catalog["models"]
            original = next(model for model in models if model["slug"] == slug)
            efforts = {item["effort"] for item in original["supported_reasoning_levels"]}
            # none 是普通请求的原值，不是 UI catalog 推理档位；官方仅归一 ultra/persistent。
            if request.reasoning in ("ultra", "persistent") or (
                request.reasoning not in efforts and request.reasoning != "none"
            ):
                raise TransportError("订阅模式不支持原推理强度")
            model = deepcopy(original)
            model["shell_type"] = "disabled"
            model["apply_patch_tool_type"] = None
            model["experimental_supported_tools"] = []
            model["tool_mode"] = None
            model["node_repl_disabled"] = True
            model["supports_search_tool"] = False
            model["include_apps_usage_instructions"] = False
            model["include_skills_usage_instructions"] = False
            model["include_plugin_usage_instructions"] = False
            # CLI catalog 要求存在基本指令；与显式 instructions 文件使用同一能力 system。
            model["base_instructions"] = request.prompt["system"]
            model["model_messages"] = None
            # 仅关闭工具元数据，不变更 slug、推理能力、上下文或输入模态。
            return {"models": [model]}
        except OSError, ValueError, KeyError, TypeError, StopIteration:
            raise TransportError("订阅模式模型目录不可用") from None

    async def generate(self, request: Request) -> Response:
        if any(isinstance(image, str) for image in request.images):
            raise TransportError("订阅模式不接受远程图片 URL")
        try:
            async with asyncio.timeout(request.timeout_sec):
                with TemporaryDirectory(prefix="hub-ai-subscription-") as temporary:
                    directory = Path(temporary)
                    code, version = await self._process(["--version"], directory)
                    if code or version.decode(errors="replace").strip() != CLI_VERSION:
                        raise TransportError("订阅 CLI 版本未经验证")
                    catalog = self._catalog(request)
                    _write(directory / "model-catalog.json", json.dumps(catalog).encode())
                    _write(
                        directory / "schema.json",
                        json.dumps(
                            OpenAIJsonSchemaTransformer(
                                request.output_model.model_json_schema(), strict=True
                            ).walk()
                        ).encode(),
                    )
                    _write(directory / "instructions.txt", request.prompt["system"].encode())
                    # 禁止从父目录和用户目录合入 AGENTS；目录只有本次临时材料。
                    _write(directory / "AGENTS.md", b"")
                    args = [
                        "exec",
                        "--ignore-user-config",
                        "--ignore-rules",
                        "--ephemeral",
                        "--strict-config",
                        "--skip-git-repo-check",
                        "--sandbox",
                        "read-only",
                        "--color",
                        "never",
                        "--json",
                        "--model",
                        request.model.removeprefix("openai/"),
                        "--output-schema",
                        str(directory / "schema.json"),
                    ]
                    settings: dict[str, Any] = {
                        "model_reasoning_effort": request.reasoning,
                        "model_instructions_file": str(directory / "instructions.txt"),
                        "model_catalog_json": str(directory / "model-catalog.json"),
                        "forced_login_method": "chatgpt",
                        "cli_auth_credentials_store": "file",
                        "approval_policy": "never",
                        "web_search": "disabled",
                        "mcp_servers": {},
                        "tools.update_plan.enabled": False,
                        "tools.experimental_request_user_input.enabled": False,
                        "features.skip_host_skill_discovery": True,
                        "include_apps_instructions": False,
                        "include_collaboration_mode_instructions": False,
                        "include_permissions_instructions": False,
                        "include_environment_context": False,
                        "project_doc_max_bytes": 0,
                        **{f"features.{name}": False for name in DISABLED_FEATURES},
                    }
                    for key, value in settings.items():
                        # JSON 的字符串/布尔写法与对应 TOML 字面量兼容；空表显式用 {}。
                        args.extend(["--config", f"{key}={json.dumps(value)}"])
                    for index, image in enumerate(request.images):
                        if not isinstance(image, bytes):
                            raise TransportError("订阅图片附件类型无效")
                        path = directory / f"image-{index}.png"
                        _write(path, image)
                        args.extend(["--image", str(path)])
                    args.append("-")
                    code, output = await self._process(
                        args, directory, request.prompt["user"].encode()
                    )
                    return self._response(request, code, output)
        except TimeoutError:
            raise TimeoutError("订阅调用超时") from None
        except OSError:
            raise TransportError("订阅临时材料无法准备") from None

    def _response(self, request: Request, code: int, output: bytes) -> Response:
        messages: list[str] = []
        completed: list[Mapping[str, Any]] = []
        failed = False
        started = False
        try:
            for line in output.decode().splitlines():
                event: dict[str, Any] = json.loads(line)
                if event["type"] == "turn.started":
                    started = True
                elif event["type"] == "item.completed":
                    item = event["item"]
                    if item["type"] == "agent_message" and isinstance(item.get("text"), str):
                        messages.append(item["text"])
                    elif item["type"] == "error":
                        # 官方CLI可在turn开始前发出启动提示；正文不输出、不作模型内容。
                        if started:
                            failed = True
                    elif item["type"] not in ("reasoning", "agent_message"):
                        # 即使 CLI 意外暴露了工具，也拒绝把有工具副作用的结果当纯能力成功。
                        raise TransportError("订阅调用出现了被禁用的工具")
                elif event["type"] == "turn.completed":
                    completed.append(event["usage"])
                elif event["type"] in ("error", "turn.failed"):
                    failed = True
            if len(completed) != 1:
                raise TransportError("订阅调用缺少完整用量记录")
            tokens = completed[0]
            usage = Usage(
                _counter(tokens.get("input_tokens")),
                _counter(tokens.get("output_tokens")),
                _counter(tokens.get("cached_input_tokens")),
            )
            # 官方 output_tokens 已含 reasoning_output_tokens；只核对，不重复相加。
            reasoning = _counter(tokens.get("reasoning_output_tokens", 0))
            if usage.cached_input_tokens > usage.input_tokens or reasoning > usage.output_tokens:
                raise TransportError("订阅调用用量记录无效")
        except UnicodeError, ValueError, KeyError, TypeError, AttributeError:
            raise TransportError("订阅调用事件不完整") from None
        if self.observer is not None and messages:
            self.observer(
                {
                    "phase": request.output_model.__name__,
                    "repair": request.repair,
                    "mode": "subscription",
                    "finish_reason": None,
                    "usage": {
                        "input_tokens": usage.input_tokens,
                        "output_tokens": usage.output_tokens,
                        "cache_read_tokens": usage.cached_input_tokens,
                    },
                    "parts": [{"kind": "text", "content": message} for message in messages],
                }
            )
        if code or failed:
            raise TransportError("订阅模型调用失败", usage=usage)
        if (
            usage.input_tokens > request.max_input_tokens
            or usage.output_tokens > request.max_output_tokens
        ):
            # CLI 未提供 provider max_tokens 参数：真实累计用量超过限额仍明确失败。
            raise TokenLimitError(usage)
        if not messages:
            raise StructureError(usage)
        try:
            raw = json.loads(messages[-1])
            request.output_model.model_validate(raw)
            return Response(raw, usage)
        except ValueError, ValidationError:
            raise StructureError(usage) from None
