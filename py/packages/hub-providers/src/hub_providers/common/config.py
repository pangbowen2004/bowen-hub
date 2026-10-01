"""来源配置保留顺序，默认值在 YAML 中合并。"""

from dataclasses import dataclass
from typing import Any, Literal


@dataclass(frozen=True)
class SourceConfig:
    id: str
    name: str
    type: str
    enabled: bool
    url: str | None
    lang: str
    paywall: Literal["none", "metered", "hard"]
    max_items: int
    timeout: float
    section: str
    weight: float
    category: str | None


def sources_config(config: dict[str, Any]) -> list[SourceConfig]:
    defaults = config["defaults"]
    result: list[SourceConfig] = []
    for item in config["sources"]:
        row = defaults | item
        result.append(
            SourceConfig(
                id=row["id"],
                name=row["name"],
                type=row["type"],
                enabled=row["enabled"],
                url=row.get("url"),
                lang=row["lang"],
                paywall=row["paywall"],
                max_items=int(row["maxItems"]),
                timeout=float(row["timeoutSec"]),
                section=row["section"],
                weight=float(row["weight"]),
                category=row.get("category"),
            )
        )
    return result
