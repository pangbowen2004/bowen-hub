"""新闻管线离线测试配置；所有金融数值都是明确的合成输入。"""

from datetime import date
from pathlib import Path

import pytest

from hub_contracts import WatchItem
from hub_core.calendar import NyseCalendar
from hub_core.config import load_config
from hub_newsroom.common.settings import Settings, parse_settings


@pytest.fixture
def settings() -> Settings:
    root = Path(__file__).resolve().parents[4]
    return parse_settings(
        load_config(root / "config/newsroom.yaml"),
        load_config(root / "config/news_keywords.yaml"),
        load_config(root / "config/news_sources.yaml"),
    )


@pytest.fixture
def calendar() -> NyseCalendar:
    return NyseCalendar(date(2025, 1, 1), date(2028, 12, 31))


@pytest.fixture
def watchlist() -> list[WatchItem]:
    def item(
        symbol: str,
        name: str,
        kind: str = "stock",
        underlying: str | None = None,
        sector: str | None = None,
    ) -> WatchItem:
        return WatchItem.model_validate(
            {
                "symbol": symbol,
                "name": name,
                "kind": kind,
                "group": "合成测试",
                "underlying": underlying,
                "sectorEtf": sector,
                "aliases": [name],
                "active": True,
            }
        )

    return [
        item("NVDA", "Nvidia", sector="SMH"),
        item("TSM", "TSMC", sector="SMH"),
        item("TSMX", "杠杆台积电", "leveraged_etf", "TSM"),
        item("AAPL", "Apple"),
        item("TEST", "测试公司"),
        item("BTC", "Bitcoin", "crypto"),
    ]
