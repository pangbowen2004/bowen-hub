"""fixtures/samples 全部通过 JSON Schema 校验，并能用生成的 Pydantic 模型解析（T01 验收；Python 这一侧）。

自动发现全部样例（包括以后任务放在 fixtures/samples/<任务ID>/ 下的）；文件名 <模型名>.<变体>.json
里的模型名决定用哪个 schema 和哪个模型。fixtures/samples/prompt-render/ 另有格式，不在这里校验。
"""

import json
import re
from pathlib import Path
from typing import Any, cast

import pytest
from jsonschema import Draft202012Validator
from pydantic import BaseModel
from referencing import Registry, Resource
from referencing.jsonschema import DRAFT202012

import hub_contracts
import hub_contracts.generated as generated

ROOT = Path(__file__).resolve().parents[4]
SAMPLES = ROOT / "fixtures" / "samples"
SCHEMAS = ROOT / "contracts" / "generated" / "schemas"
NOT_MODEL_SAMPLES = {"prompt-render"}
SAMPLE_NAME = re.compile(r"^([A-Z][A-Za-z0-9]*)\.(.+)\.json$")


def sample_files() -> list[Path]:
    return sorted(
        path
        for path in SAMPLES.rglob("*.json")
        if path.relative_to(SAMPLES).parts[0] not in NOT_MODEL_SAMPLES
    )


def load_registry() -> Registry[Any]:
    resources: list[tuple[str, Resource[Any]]] = []
    for path in sorted(SCHEMAS.glob("*.json")):
        schema = json.loads(path.read_text(encoding="utf-8"))
        resources.append((path.name, Resource.from_contents(schema, default_specification=DRAFT202012)))
    return Registry().with_resources(resources)


REGISTRY = load_registry()
FILES = sample_files()


def unknown_keys(original: Any, dumped: Any, where: str = "$") -> list[str]:
    """原样例里有、解析后丢掉的键：说明样例里的字段名不在契约里（JSON Schema 默认允许多余字段，靠这里抓拼错）。"""
    if isinstance(original, dict) and isinstance(dumped, dict):
        original_dict = cast(dict[str, Any], original)
        dumped_dict = cast(dict[str, Any], dumped)
        missing = [f"{where}.{key}" for key in original_dict if key not in dumped_dict]
        nested = [
            problem
            for key, value in original_dict.items()
            if key in dumped_dict
            for problem in unknown_keys(value, dumped_dict[key], f"{where}.{key}")
        ]
        return missing + nested
    if isinstance(original, list) and isinstance(dumped, list):
        original_list = cast(list[Any], original)
        dumped_list = cast(list[Any], dumped)
        return [
            problem
            for index, (a, b) in enumerate(zip(original_list, dumped_list, strict=False))
            for problem in unknown_keys(a, b, f"{where}[{index}]")
        ]
    return []


def test_found_samples() -> None:
    relative = {path.relative_to(SAMPLES).parts[0] for path in FILES}
    assert {"platform", "watchlist"} <= relative


def test_package_exports_generated_models() -> None:
    assert hub_contracts.Run is generated.Run
    assert "WatchItem" in hub_contracts.__all__


@pytest.mark.parametrize("path", FILES, ids=[str(path.relative_to(SAMPLES)) for path in FILES])
def test_sample(path: Path) -> None:
    match = SAMPLE_NAME.match(path.name)
    assert match, f"样例文件名必须是 <模型名>.<变体>.json（模型名大写开头）：{path.name}"
    model_name = match.group(1)
    schema_path = SCHEMAS / f"{model_name}.json"
    assert schema_path.exists(), f"找不到模型 {model_name} 的 JSON Schema：{schema_path.relative_to(ROOT)}"
    model = getattr(generated, model_name, None)
    assert isinstance(model, type) and issubclass(model, BaseModel), (
        f"hub_contracts.generated 里没有模型 {model_name}"
    )

    validator = Draft202012Validator(
        {"$ref": schema_path.name},
        registry=REGISTRY,
        format_checker=Draft202012Validator.FORMAT_CHECKER,
    )
    content = json.loads(path.read_text(encoding="utf-8"))
    items = cast(list[Any], content) if isinstance(content, list) else [content]
    assert items, f"{path.name} 是空数组"
    for index, item in enumerate(items, start=1):
        errors = sorted(validator.iter_errors(item), key=lambda error: list(error.path))
        assert not errors, f"第 {index} 份不符合 JSON Schema：" + "；".join(
            f"{'/'.join(map(str, error.path)) or '$'}: {error.message}" for error in errors
        )
        parsed = model.model_validate(item)
        dumped = parsed.model_dump(mode="json", exclude_unset=True)
        assert not unknown_keys(item, dumped), f"第 {index} 份有契约里没有的字段：{unknown_keys(item, dumped)}"
