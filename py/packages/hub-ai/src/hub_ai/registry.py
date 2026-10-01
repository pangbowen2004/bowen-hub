"""计算平面读配置；契约模型来自生成包。"""

import json
from pathlib import Path
from typing import Any, cast

import yaml
from jsonschema import Draft202012Validator
from pydantic import BaseModel

from hub_contracts.generated import models


def find_root(start: Path | None = None) -> Path:
    path = (start or Path.cwd()).resolve()
    for candidate in (path, *path.parents):
        if (candidate / "config/llm.yaml").is_file():
            return candidate
    raise ValueError("找不到仓库根目录，请指定 --root")


def read_yaml(path: Path) -> dict[str, Any]:
    data = yaml.safe_load(path.read_text())
    if not isinstance(data, dict):
        raise ValueError(f"配置必须是对象：{path.name}")
    return cast(dict[str, Any], data)


class Registry:
    def __init__(self, root: Path) -> None:
        self.root = root.resolve()
        self.llm = read_yaml(root / "config/llm.yaml")
        self.advice_words: list[str] = read_yaml(root / "config/newsroom.yaml")["adviceWords"]
        validator = Draft202012Validator(
            json.loads((root / "capabilities/_schema.json").read_text())
        )
        self.capabilities: dict[str, dict[str, Any]] = {}
        for path in sorted((root / "capabilities").glob("*.yaml")):
            capability = read_yaml(path)
            cast(Any, validator).validate(capability)
            if capability["id"] != path.stem:
                raise ValueError("清单 id 与文件名不符")
            self.capabilities[capability["id"]] = capability

    def model(self, name: str) -> type[BaseModel]:
        model = getattr(models, name)
        if not isinstance(model, type) or not issubclass(model, BaseModel):
            raise ValueError(f"未生成契约模型：{name}")
        return model

    def schema(self, name: str) -> dict[str, Any]:
        def expand(value: Any, seen: frozenset[str]) -> Any:
            if isinstance(value, list):
                return [expand(item, seen) for item in cast(list[Any], value)]
            if not isinstance(value, dict):
                return value
            node = cast(dict[str, Any], value)
            ref = node.get("$ref")
            if isinstance(ref, str) and ref.endswith(".json") and ref not in seen:
                other = json.loads((self.root / "contracts/generated/schemas" / ref).read_text())
                return expand(other, seen | {ref})
            return {key: expand(item, seen) for key, item in node.items()}

        return cast(
            dict[str, Any],
            expand(
                json.loads(
                    (self.root / "contracts/generated/schemas" / f"{name}.json").read_text()
                ),
                frozenset({f"{name}.json"}),
            ),
        )
