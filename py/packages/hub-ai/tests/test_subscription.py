"""真实离线 CLI 子进程验证结构、隔离、用量和取消，不调用任何模型。"""

import asyncio
import json
import os
import subprocess
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any, cast

import pytest
from pydantic import BaseModel

from hub_ai.runtime import Request, StructureError, TokenLimitError, TransportError
from hub_ai.subscription import CLI_VERSION, DISABLED_FEATURES, SubscriptionAdapter
from hub_contracts import FilingDigestOutput, PaperDraft


class Answer(BaseModel):
    value: int


def request(**changes: Any) -> Request:
    value = Request(
        "openai/gpt-6.1-sol",
        "medium",
        {"system": "仅按原文输出。", "user": "私人输入"},
        Answer,
        1000,
        100,
        5,
    )
    for key, item in changes.items():
        setattr(value, key, item)
    return value


@pytest.fixture
def setup_cli(tmp_path: Path) -> tuple[Path, Path, Path]:
    catalog = tmp_path / "models.json"
    catalog.write_text(
        json.dumps(
            {
                "models": [
                    {
                        "slug": "gpt-6.1-sol",
                        "supported_reasoning_levels": [{"effort": "medium"}],
                        "shell_type": "unified_exec",
                        "apply_patch_tool_type": "freeform",
                        "experimental_supported_tools": ["clock"],
                        "context_window": 400000,
                        "default_reasoning_level": "high",
                        "base_instructions": "不该加入的编码默认指令",
                    }
                ]
            }
        )
    )
    script = tmp_path / "cli.py"
    capture = tmp_path / "capture.json"
    script.write_text("""import json,os,sys,time
from pathlib import Path
args=sys.argv[1:]
if args==['--version']:
 print('codex-cli 0.160.0');sys.exit()
configs={}
for index,arg in enumerate(args):
 if arg=='--config':
  key,value=args[index+1].split('=',1);configs[key]=json.loads(value)
schema=Path(args[args.index('--output-schema')+1])
images=[Path(args[i+1]) for i,v in enumerate(args) if v=='--image']
capture=Path(__file__).with_name('capture.json')
capture.write_text(json.dumps({'cwd':os.getcwd(),'args':args,'config':configs,
 'schema':json.loads(schema.read_text()),
 'system':Path(configs['model_instructions_file']).read_text(),
 'model_catalog':json.loads(Path(configs['model_catalog_json']).read_text()),
 'modes':[(p.stat().st_mode & 0o777) for p in Path.cwd().iterdir()],
 'images':[p.read_bytes().hex() for p in images], 'env_keys':list(os.environ),
 'prompt':sys.stdin.read(),'pid':os.getpid()}))
fixture=Path(__file__).with_name('events.json')
data=json.loads(fixture.read_text())
if data.get('sleep'):
 import subprocess
 child=subprocess.Popen([sys.executable,'-c','import time;time.sleep(60)'])
 Path(__file__).with_name('child.pid').write_text(str(child.pid))
 time.sleep(60)
sys.stderr.write('Authorization Bearer SECRET + private headers/body\\n'*10000)
for event in data['events']:print(json.dumps(event),flush=True)
sys.exit(data.get('exit',0))
""")
    (tmp_path / "events.json").write_text(json.dumps({"events": events()}))
    return script, catalog, capture


def events(text: str = '{"value":7}', **tokens: int) -> list[dict[str, Any]]:
    return [
        {"type": "thread.started", "thread_id": "not-saved"},
        {"type": "turn.started"},
        {"type": "item.completed", "item": {"type": "agent_message", "text": text}},
        {
            "type": "turn.completed",
            "usage": {
                "input_tokens": 120,
                "cached_input_tokens": 20,
                "output_tokens": 50,
                "reasoning_output_tokens": 35,
                **tokens,
            },
        },
    ]


def adapter(setup: tuple[Path, Path, Path], **kwargs: Any) -> SubscriptionAdapter:
    script, catalog, _ = setup
    return SubscriptionAdapter(
        executable=(sys.executable, str(script)), catalog_path=catalog, **kwargs
    )


def test_real_cli_preserves_model_reasoning_schema_and_private_isolation(
    setup_cli: tuple[Path, Path, Path], monkeypatch: pytest.MonkeyPatch
) -> None:
    monkeypatch.setenv("OPENAI_API_KEY", "SECRET")
    monkeypatch.setenv("HUB_SERVICE_TOKEN", "SECRET")
    observed: list[dict[str, Any]] = []
    image = b"\x89PNG\r\n\x1a\nactual-image-bytes"
    response = asyncio.run(
        adapter(setup_cli, observer=observed.append).generate(request(images=[image]))
    )
    assert response.output == {"value": 7}
    assert (
        response.usage.input_tokens,
        response.usage.output_tokens,
        response.usage.cached_input_tokens,
    ) == (120, 50, 20)
    captured = json.loads(setup_cli[2].read_text())
    assert not Path(captured["cwd"]).exists()
    assert captured["system"] == "仅按原文输出。"
    assert captured["prompt"] == "私人输入"
    assert captured["schema"]["properties"]["value"]["type"] == "integer"
    assert captured["schema"]["required"] == ["value"]
    assert captured["schema"]["additionalProperties"] is False
    assert captured["images"] == [image.hex()]
    assert set(captured["modes"]) == {0o600}
    assert not {"OPENAI_API_KEY", "HUB_SERVICE_TOKEN"}.intersection(captured["env_keys"])
    args, config = captured["args"], captured["config"]
    assert args[args.index("--model") + 1] == "gpt-6.1-sol"
    assert args[args.index("--sandbox") + 1] == "read-only"
    assert {"--ignore-user-config", "--ignore-rules", "--ephemeral", "--strict-config"}.issubset(
        args
    )
    assert config["model_reasoning_effort"] == "medium"
    assert config["forced_login_method"] == "chatgpt"
    assert config["cli_auth_credentials_store"] == "file"
    assert config["mcp_servers"] == {}
    assert config["web_search"] == "disabled"
    assert config["tools.update_plan.enabled"] is False
    assert all(config[f"features.{feature}"] is False for feature in DISABLED_FEATURES)
    original = json.loads(setup_cli[1].read_text())["models"][0]
    changed = deepcopy(original)
    changed.update(
        shell_type="disabled",
        apply_patch_tool_type=None,
        experimental_supported_tools=[],
        tool_mode=None,
        node_repl_disabled=True,
        supports_search_tool=False,
        include_apps_usage_instructions=False,
        include_skills_usage_instructions=False,
        include_plugin_usage_instructions=False,
        base_instructions="仅按原文输出。",
        model_messages=None,
    )
    assert captured["model_catalog"] == {"models": [changed]}
    assert observed[0]["parts"] == [{"kind": "text", "content": '{"value":7}'}]
    assert not any(
        word in json.dumps(observed) for word in ("私人输入", "SECRET", "headers", "thread_id")
    )


@pytest.mark.parametrize("text", ['{"value":', '{"value":"bad"}'])
def test_invalid_json_observed_before_validation_with_real_usage(
    setup_cli: tuple[Path, Path, Path], text: str
) -> None:
    setup_cli[0].with_name("events.json").write_text(json.dumps({"events": events(text)}))
    observed: list[dict[str, Any]] = []
    with pytest.raises(StructureError) as failure:
        asyncio.run(adapter(setup_cli, observer=observed.append).generate(request(repair=True)))
    assert failure.value.usage.output_tokens == 50
    assert observed[0]["repair"] is True
    assert observed[0]["parts"][0]["content"] == text


@pytest.mark.parametrize("before_turn", [False, True])
def test_startup_notice_is_not_tool_but_in_turn_error_still_fails(
    setup_cli: tuple[Path, Path, Path], before_turn: bool
) -> None:
    recorded = events()
    notice = {"type": "item.completed", "item": {"type": "error", "message": "private-warning"}}
    recorded.insert(1 if before_turn else 2, notice)
    setup_cli[0].with_name("events.json").write_text(json.dumps({"events": recorded}))
    observed: list[dict[str, Any]] = []
    if before_turn:
        result = asyncio.run(adapter(setup_cli, observer=observed.append).generate(request()))
        assert result.output == {"value": 7}
        assert result.usage.input_tokens == 120
    else:
        with pytest.raises(TransportError) as failure:
            asyncio.run(adapter(setup_cli, observer=observed.append).generate(request()))
        assert failure.value.usage is not None
        assert failure.value.usage.input_tokens == 120
        assert "private-warning" not in str(failure.value)
    assert "private-warning" not in json.dumps(observed)


@pytest.mark.parametrize("tokens", [{"output_tokens": 101}, {"input_tokens": 1001}])
def test_actual_usage_limits_not_estimated_or_reasoning_double_counted(
    setup_cli: tuple[Path, Path, Path], tokens: dict[str, int]
) -> None:
    recorded = events()
    recorded[-1]["usage"].update(tokens)
    setup_cli[0].with_name("events.json").write_text(json.dumps({"events": recorded}))
    with pytest.raises(TokenLimitError) as failure:
        asyncio.run(adapter(setup_cli).generate(request()))
    assert max(failure.value.usage.input_tokens / 1000, failure.value.usage.output_tokens / 100) > 1


@pytest.mark.parametrize("mode", ["missing_usage", "exit", "tool", "bad_usage", "failed"])
def test_failure_never_leaks_stderr_or_accepts_unknown_completion(
    setup_cli: tuple[Path, Path, Path], mode: str
) -> None:
    value: dict[str, Any] = {"events": events(), "exit": 0}
    if mode == "missing_usage":
        value["events"].pop()
    elif mode == "exit":
        value["exit"] = 1
    elif mode == "tool":
        value["events"].insert(
            1,
            {"type": "item.completed", "item": {"type": "command_execution", "command": "SECRET"}},
        )
    elif mode == "failed":
        value["events"].append({"type": "turn.failed", "error": {"message": "SECRET"}})
    else:
        value["events"] = events(reasoning_output_tokens=51)
    setup_cli[0].with_name("events.json").write_text(json.dumps(value))
    with pytest.raises(TransportError) as failure:
        asyncio.run(adapter(setup_cli).generate(request()))
    assert "SECRET" not in str(failure.value)
    assert "headers" not in str(failure.value)
    if mode in ("exit", "failed"):
        assert failure.value.usage is not None
        assert failure.value.usage.input_tokens == 120
        assert failure.value.usage.output_tokens == 50
        assert failure.value.usage.cached_input_tokens == 20
    else:
        assert failure.value.usage is None


def test_no_remote_image_download_or_model_reasoning_fallback(
    setup_cli: tuple[Path, Path, Path],
) -> None:
    for changes in (
        {"images": ["https://private.invalid/a.png"]},
        {"model": "openai/unknown"},
        {"reasoning": "low"},
        {"reasoning": "ultra"},
        {"reasoning": "persistent"},
    ):
        with pytest.raises(TransportError):
            asyncio.run(adapter(setup_cli).generate(request(**changes)))
    assert not setup_cli[2].exists()


def test_none_reasoning_is_passed_exactly_without_ui_catalog_fallback(
    setup_cli: tuple[Path, Path, Path],
) -> None:
    response = asyncio.run(adapter(setup_cli).generate(request(reasoning="none")))
    assert response.output == {"value": 7}
    captured = json.loads(setup_cli[2].read_text())
    assert captured["config"]["model_reasoning_effort"] == "none"
    assert captured["model_catalog"]["models"][0]["supported_reasoning_levels"] == [
        {"effort": "medium"}
    ]


@pytest.mark.parametrize("model", [FilingDigestOutput, PaperDraft])
def test_generated_contract_uses_recursive_strict_schema_but_original_local_validation(
    setup_cli: tuple[Path, Path, Path], model: type[BaseModel]
) -> None:
    original = model.model_json_schema()
    # 原生返回非法业务内容仍失败；仅 provider schema 格式转换不能放宽本地模型校验。
    setup_cli[0].with_name("events.json").write_text(json.dumps({"events": events("{}")}))
    with pytest.raises(StructureError):
        asyncio.run(adapter(setup_cli).generate(request(output_model=model)))
    strict = json.loads(setup_cli[2].read_text())["schema"]

    def inspect_schema(node: Any) -> None:
        if isinstance(node, dict):
            node = cast(dict[str, Any], node)
            assert "default" not in node
            if node.get("type") == "object":
                assert node["additionalProperties"] is False
                assert set(node["required"]) == set(node["properties"])
            for value in node.values():
                inspect_schema(value)
        elif isinstance(node, list):
            for value in cast(list[Any], node):
                inspect_schema(value)

    inspect_schema(strict)
    assert strict["$defs"]
    assert set(strict["properties"]) == set(original["properties"])
    assert strict["properties"]["generatedBy"]["anyOf"] == [
        {"$ref": "#/$defs/GeneratedBy"},
        {"type": "null"},
    ]
    assert "generatedBy" in strict["required"]
    assert "generatedBy" not in original["required"]
    assert model.model_json_schema() == original


def test_strict_provider_schema_does_not_change_original_optional_default(
    setup_cli: tuple[Path, Path, Path],
) -> None:
    setup_cli[0].with_name("events.json").write_text(
        json.dumps({"events": events('{"digest":"原文事实。"}')})
    )
    response = asyncio.run(adapter(setup_cli).generate(request(output_model=FilingDigestOutput)))
    assert FilingDigestOutput.model_validate(response.output).generatedBy is None


def test_unknown_cli_version_fails_before_model_call(setup_cli: tuple[Path, Path, Path]) -> None:
    script = setup_cli[0]
    script.write_text(script.read_text().replace(CLI_VERSION, "codex-cli 0.161.0"))
    with pytest.raises(TransportError, match="版本未经验证"):
        asyncio.run(adapter(setup_cli).generate(request()))
    assert not setup_cli[2].exists()


@pytest.mark.parametrize("cancel", [False, True])
def test_timeout_and_external_cancel_kill_real_process_and_remove_temp(
    setup_cli: tuple[Path, Path, Path], cancel: bool
) -> None:
    setup_cli[0].with_name("events.json").write_text(json.dumps({"sleep": True, "events": []}))

    async def run() -> None:
        # 取消分支须等真实进程启动再主动取消，不能先被请求超时抢跑。
        task = asyncio.create_task(
            adapter(setup_cli).generate(request(timeout_sec=60 if cancel else 5))
        )
        child_file = setup_cli[0].with_name("child.pid")
        async with asyncio.timeout(15):
            while not child_file.exists() or not child_file.read_text().strip():
                await asyncio.sleep(0.01)
        if cancel:
            task.cancel()
        with pytest.raises(asyncio.CancelledError if cancel else TimeoutError):
            await task
        captured = json.loads(setup_cli[2].read_text())
        assert not Path(captured["cwd"]).exists()
        with pytest.raises(ProcessLookupError):
            os.kill(captured["pid"], 0)
        # 孙进程可能短暂保留 zombie，由系统收尾；不允许仍执行脚本。
        status = subprocess.run(
            ["ps", "-o", "stat=", "-p", child_file.read_text()],
            capture_output=True,
            text=True,
            check=False,
        ).stdout.strip()
        assert not status or status.startswith("Z")

    asyncio.run(run())


def test_cancel_during_spawn_still_reaps_created_process(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    original = asyncio.create_subprocess_exec

    async def run() -> None:
        created = asyncio.Event()
        release = asyncio.Event()
        processes: list[asyncio.subprocess.Process] = []

        async def delayed(*args: Any, **kwargs: Any) -> asyncio.subprocess.Process:
            process = await original(*args, **kwargs)
            processes.append(process)
            created.set()
            await release.wait()
            return process

        monkeypatch.setattr(asyncio, "create_subprocess_exec", delayed)
        instance = SubscriptionAdapter(
            executable=(sys.executable, "-c", "import time;time.sleep(60)")
        )
        task = asyncio.create_task(instance.generate(request()))
        await created.wait()
        task.cancel()
        await asyncio.sleep(0)
        release.set()
        with pytest.raises(asyncio.CancelledError):
            await task
        assert processes[0].returncode is not None
        with pytest.raises(ProcessLookupError):
            os.kill(processes[0].pid, 0)

    asyncio.run(run())
