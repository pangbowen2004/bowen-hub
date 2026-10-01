"""T20来源接口；T10共享providers check只调用此入口。"""

from datetime import UTC, datetime
from pathlib import Path

from hub_contracts import NewsSourceHealth
from hub_core.settings import Settings

from .adapter import ENDPOINTS, SHANGHAI, TushareError, TushareSource
from .calendar import SseCalendar
from .collection import Collection, collect
from .units import normalize

__all__ = [
    "Collection",
    "SseCalendar",
    "TushareError",
    "TushareSource",
    "check_sources",
    "collect",
    "normalize",
]


def check_sources(settings: Settings) -> list[NewsSourceHealth]:
    if settings.tushare_token is None:
        return [
            NewsSourceHealth(
                id="tushare",
                checkedAt=datetime.now(UTC),
                status="failed",
                error="缺少 TUSHARE_TOKEN",
            )
        ]
    root = next(
        (
            path
            for path in Path(__file__).resolve().parents
            if (path / "config/market.yaml").is_file()
        ),
        None,
    )
    if root is None:
        raise ValueError("找不到市场配置")
    source = TushareSource(
        settings.tushare_token.get_secret_value(), cache_dir=root / ".cache/tushare"
    )
    try:
        result = collect(source, root / "config", datetime.now(SHANGHAI).date(), history=False)
        records: list[NewsSourceHealth] = []
        for endpoint in sorted(ENDPOINTS):
            errors = [
                reason for key, reason in result.missing.items() if key.split("/", 1)[0] == endpoint
            ]
            health = source.health.get(endpoint)
            records.append(
                NewsSourceHealth(
                    id=f"tushare:{endpoint}",
                    checkedAt=datetime.now(UTC),
                    status="failed" if errors or health is None else health.status,
                    error="；".join(sorted(set(errors)))
                    if errors
                    else health.error
                    if health
                    else "未执行：交易日历未就绪或非交易日",
                )
            )
        return records
    finally:
        source.close()
