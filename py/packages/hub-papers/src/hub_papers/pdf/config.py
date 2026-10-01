"""配置与API接线的薄IO边界。"""

from pathlib import Path
from typing import Any

from hub_contracts import PaperSpace
from hub_core.config import load_config


def config_root() -> Path:
    for path in Path(__file__).resolve().parents:
        if (path / "config/paper_spaces.yaml").is_file():
            return path / "config"
    raise ValueError("找不到论文配置目录")


def load_rules() -> dict[str, Any]:
    return load_config(config_root() / "paper_rules.yaml")


def load_derivation_config() -> tuple[list[PaperSpace], dict[str, list[str]]]:
    root = config_root()
    spaces = [
        PaperSpace.model_validate({**entry, "paperCount": 0})
        for entry in load_config(root / "paper_spaces.yaml")["spaces"]
    ]
    return spaces, load_config(root / "paper_concept_aliases.yaml")["aliases"]
