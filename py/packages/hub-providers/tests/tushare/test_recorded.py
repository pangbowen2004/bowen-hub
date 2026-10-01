"""根注入凭据录制的两日原始Parquet完整离线验收。"""

import json
from datetime import date
from pathlib import Path

import polars as pl
import pytest

from hub_providers.tushare import collect, normalize
from hub_providers.tushare.adapter import ENDPOINTS
from hub_providers.tushare.replay import RecordedTushareSource

ROOT = Path(__file__).resolve().parents[5]


@pytest.mark.parametrize("stamp", ["2026-08-27", "2026-08-28"])
def test_real_full_collection_replay_and_current_membership(stamp: str) -> None:
    directory = ROOT / "fixtures" / "tushare" / stamp
    provider = RecordedTushareSource(directory)
    try:
        result = collect(provider, ROOT / "config", date.fromisoformat(stamp))
        assert result.core_ready
        assert not result.missing
        assert len(result.tables) == 170
        assert {request.endpoint for request in result.requests.values()} == ENDPOINTS
        assert result.membership_as_of == date(2026, 10, 2)
        assert result.membership_as_of != result.day
        compact = stamp.replace("-", "")
        assert result.tables[f"daily/{compact}"].height == 5547
        assert result.tables[f"daily_basic/{compact}"].height == 5547
        assert result.tables[f"stk_limit/{compact}"].height >= 5000
        for endpoint, count in (("daily", 65), ("stk_limit", 30), ("fund_daily", 21)):
            assert len([r for r in result.requests.values() if r.endpoint == endpoint]) == count
        indices = [frame for key, frame in result.tables.items() if key.startswith("index_daily/")]
        assert len(indices) == 6
        assert all(frame.height == 250 for frame in indices)
        directions = [frame for key, frame in result.tables.items() if key.startswith("ths_daily/")]
        assert len(directions) == 16
        # MLCC原来源历史短于请求窗口；保留实际覆盖，不补造30行。
        for key, frame in result.tables.items():
            if key.startswith("ths_daily/"):
                expected = (
                    (20 if stamp == "2026-08-27" else 21) if key.endswith("886112.TI") else 30
                )
                assert frame.height == expected
                assert frame["trade_date"].max() == compact
        assert result.tables["ths_daily/886112.TI"]["trade_date"].min() == "20260730"
        members = [frame for key, frame in result.tables.items() if key.startswith("ths_member/")]
        assert len(members) == 16
        assert all(frame.height > 0 and "con_code" in frame.columns for frame in members)
        # 非当前行业记录包含明确退出日期，不因is_new默认值丢掉历史。
        historical = result.tables["index_member_all/N"]
        assert historical.height == 2006
        assert historical["out_date"].drop_nulls().len() > 0
        market = result.tables[f"moneyflow_mkt_dc/{compact}"]
        normalized = normalize("moneyflow_mkt_dc", market)
        assert normalized["net_amount_cny"].item() == market["net_amount"].item()
        if stamp == "2026-08-28":
            assert market["net_amount"].item() == -34371002368.0
            assert normalized["net_amount_cny"].item() / 1e8 == pytest.approx(-343.7, abs=0.02)
        else:
            assert normalized["net_amount_cny"].item() / 1e8 == pytest.approx(537.72, abs=0.02)
    finally:
        provider.close()


@pytest.mark.parametrize("stamp", ["2026-08-27", "2026-08-28"])
def test_real_manifest_raw_rows_and_no_secret_metadata(stamp: str) -> None:
    directory = ROOT / "fixtures" / "tushare" / stamp
    manifest = json.loads((directory / "manifest.json").read_text())
    assert set(manifest) == {"date", "origin", "coreReady", "membershipAsOf", "missing", "tables"}
    assert manifest["coreReady"] is True
    assert manifest["missing"] == {}
    for entry in manifest["tables"]:
        assert set(entry) == {"file", "endpoint", "params", "rows", "units", "membershipAsOf"}
        assert entry["units"] == "raw"
        assert all(
            key not in {"token", "authorization", "headers", "body"} for key in entry["params"]
        )
        assert entry["membershipAsOf"] == (
            "2026-10-02" if entry["endpoint"] == "ths_member" else None
        )
        assert pl.read_parquet(directory / entry["file"]).height == entry["rows"]
