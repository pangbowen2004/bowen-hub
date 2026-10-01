"""配置 IO 留在编排层，调用方传递解析对象给纯逻辑。"""

from pathlib import Path
from typing import Any, cast

import yaml


def load_config(path: str | Path) -> dict[str, Any]:
    with Path(path).open(encoding="utf-8") as file:
        data: object = yaml.safe_load(file)
    if not isinstance(data, dict):
        raise ValueError("配置必须是字符串键的 YAML 对象")
    mapping = cast(dict[object, object], data)
    if not all(isinstance(key, str) for key in mapping):
        raise ValueError("配置必须是字符串键的 YAML 对象")
    return cast(dict[str, Any], data)


def load_configs(directory: str | Path) -> dict[str, dict[str, Any]]:
    return {path.stem: load_config(path) for path in sorted(Path(directory).glob("*.yaml"))}
