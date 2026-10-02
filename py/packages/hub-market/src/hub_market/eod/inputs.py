"""将T20原始表和公开配置注入T21；不改计算公式或伪造历史成员。"""

from datetime import date
from pathlib import Path

from hub_contracts import MarketReference
from hub_core.config import load_config
from hub_market.compute.input import ComputeInput
from hub_providers.tushare.collection import Collection


def compute_input(root: Path, value: Collection, previous: date) -> ComputeInput:
    config = load_config(root / "config/market.yaml")
    return ComputeInput(
        on=value.day,
        previous=previous,
        membership_as_of=value.membership_as_of,
        tables=value.tables,
        indices=load_config(root / "config/market_indices.yaml")["indices"],
        directions=load_config(root / "config/market_directions.yaml")["directions"],
        themes=load_config(root / "config/market_themes.yaml")["themes"],
        etf=load_config(root / "config/market_etf_groups.yaml"),
        minimum_industry_samples=config["industries"]["minSamples"],
        missing_endpoints=frozenset(key.split("/", 1)[0] for key in value.missing),
    )


def reference(root: Path) -> MarketReference:
    sources = load_config(root / "config/market_sources.yaml")
    return MarketReference.model_validate(
        {
            "metrics": load_config(root / "config/market_metrics.yaml")["metrics"],
            "directions": load_config(root / "config/market_directions.yaml")["directions"],
            "etfGroups": load_config(root / "config/market_etf_groups.yaml")["groups"],
            "themes": load_config(root / "config/market_themes.yaml")["themes"],
            "indices": load_config(root / "config/market_indices.yaml")["indices"],
            "sources": sources["sources"],
            "limitations": sources["limitations"],
            "disclaimer": sources["disclaimer"],
        }
    )
