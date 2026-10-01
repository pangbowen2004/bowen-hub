"""离线录制读取边界；不请求供应商，也不填补缺失表。"""

from datetime import date
from pathlib import Path

from hub_core.config import load_config
from hub_market.compute.input import ComputeInput
from hub_providers.tushare import SseCalendar, collect
from hub_providers.tushare.replay import RecordedTushareSource


def recorded(root: Path, on: date, *, directory: Path | None = None) -> ComputeInput:
    source = RecordedTushareSource(
        directory if directory is not None else root / "fixtures" / "tushare" / on.isoformat()
    )
    if source.manifest["date"] != on.isoformat():
        source.close()
        raise ValueError("录制日期与目标日期不一致")
    try:
        result = collect(source, root / "config", on)
        if not result.core_ready:
            raise ValueError("录制核心表未就绪")
        previous = SseCalendar(source).previous_session(on)
    finally:
        source.close()
    config = load_config(root / "config" / "market.yaml")
    return ComputeInput(
        on=on,
        previous=previous,
        membership_as_of=result.membership_as_of,
        tables=result.tables,
        indices=load_config(root / "config" / "market_indices.yaml")["indices"],
        directions=load_config(root / "config" / "market_directions.yaml")["directions"],
        themes=load_config(root / "config" / "market_themes.yaml")["themes"],
        etf=load_config(root / "config" / "market_etf_groups.yaml"),
        minimum_industry_samples=config["industries"]["minSamples"],
        missing_endpoints=frozenset(key.split("/", 1)[0] for key in result.missing),
    )
