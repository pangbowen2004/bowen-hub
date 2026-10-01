"""纯计算输入；原始表、采集日期、交易日和配置均由编排显式注入。"""

from dataclasses import dataclass
from datetime import date
from typing import Any

import polars as pl


@dataclass(frozen=True)
class ComputeInput:
    on: date
    previous: date
    membership_as_of: date
    tables: dict[str, pl.DataFrame]
    indices: list[dict[str, Any]]
    directions: list[dict[str, Any]]
    themes: list[dict[str, Any]]
    etf: dict[str, Any]
    minimum_industry_samples: int = 10
    missing_endpoints: frozenset[str] = frozenset()

    def table(self, endpoint: str, suffix: str | None = None) -> pl.DataFrame | None:
        if endpoint in self.missing_endpoints:
            return None
        if suffix is not None:
            return self.tables.get(f"{endpoint}/{suffix}")
        frames = [frame for key, frame in self.tables.items() if key.startswith(f"{endpoint}/")]
        return pl.concat(frames, how="diagonal_relaxed") if frames else None

    def required(self, endpoint: str, suffix: str | None = None) -> pl.DataFrame:
        frame = self.table(endpoint, suffix)
        if frame is None:
            raise ValueError(f"核心表{endpoint}缺失")
        return frame
