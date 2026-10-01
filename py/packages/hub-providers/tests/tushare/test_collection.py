"""合成交易日历/面板测试，不替代真实TuShare验收。"""

import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any

import httpx
import polars as pl
import pytest

from hub_core.protocols import TradingCalendar
from hub_providers.tushare import SseCalendar, TushareError, TushareSource, collect
from hub_providers.tushare.adapter import ENDPOINTS

ROOT = Path(__file__).resolve().parents[5]


class SyntheticSource(TushareSource):
    def __init__(self, tmp_path: Path) -> None:
        super().__init__(
            "OFFLINE",
            cache_dir=tmp_path,
            client=httpx.Client(transport=httpx.MockTransport(lambda request: httpx.Response(500))),
            now=lambda: datetime(2026, 10, 2, 12, tzinfo=UTC),
        )
        self.calls: list[tuple[str, dict[str, str]]] = []
        self.count = 5000
        self.omit_index = False
        self.history_member: list[dict[str, Any]] = []

    def query(self, endpoint: str, **params: str) -> list[dict[str, Any]]:
        self.calls.append((endpoint, params))
        if endpoint == "trade_cal":
            start = datetime.strptime(params["start_date"], "%Y%m%d").date()
            end = datetime.strptime(params["end_date"], "%Y%m%d").date()
            rows: list[dict[str, Any]] = []
            while start <= end:
                rows.append(
                    {
                        "cal_date": start.strftime("%Y%m%d"),
                        "is_open": int(start.weekday() < 5 and (start.month, start.day) != (10, 1)),
                        "pretrade_date": None,
                    }
                )
                start += timedelta(days=1)
            return rows
        if endpoint in {"daily", "daily_basic", "stk_limit"}:
            return [
                {"ts_code": f"{index:06d}.SZ", "trade_date": params["trade_date"], "close": 10.0}
                for index in range(self.count)
            ]
        if endpoint == "index_daily":
            return (
                []
                if self.omit_index and params["ts_code"] == "399303.SZ"
                else [
                    {"ts_code": params["ts_code"], "trade_date": params["end_date"], "close": 100.0}
                ]
            )
        if endpoint == "index_member_all":
            rows = [
                {
                    "l1_code": "801010.SI",
                    "l1_name": "合成行业",
                    "ts_code": "000001.SZ",
                    "in_date": "20200101",
                    "out_date": None if params["is_new"] == "Y" else "20260801",
                    "is_new": params["is_new"],
                }
            ]
            if params["is_new"] == "N":
                self.history_member = rows
            return rows
        if endpoint == "ths_member":
            return [
                {"ts_code": params["ts_code"], "con_code": "000001.SZ", "con_name": "合成股票"},
                {"ts_code": params["ts_code"], "con_code": "000002.SZ", "con_name": "合成股票2"},
            ]
        return [
            {
                "ts_code": params.get("ts_code", "000001.SZ"),
                "trade_date": params.get("trade_date", params.get("end_date", "20260828")),
                "close": 100.0,
            }
        ]


def test_calendar_protocol_real_date_lookup_not_weekday_guess(tmp_path: Path) -> None:
    provider = SyntheticSource(tmp_path)
    calendar: TradingCalendar = SseCalendar(provider)
    assert calendar.is_session(date(2026, 8, 28))
    assert not calendar.is_session(date(2026, 8, 29))
    assert not calendar.is_session(date(2026, 10, 1))
    assert calendar.previous_session(date(2026, 8, 31)) == date(2026, 8, 28)
    assert calendar.next_session(date(2026, 9, 30)) == date(2026, 10, 2)
    assert calendar.open_at(date(2026, 8, 28)).hour == 9
    assert calendar.close_at(date(2026, 8, 28)).hour == 15
    with pytest.raises(ValueError, match="不是SSE交易日"):
        calendar.open_at(date(2026, 8, 29))


def test_full_plan_all_fifteen_interfaces_lookbacks_and_current_members(tmp_path: Path) -> None:
    provider = SyntheticSource(tmp_path / "cache")
    result = collect(provider, ROOT / "config", date(2026, 8, 28))
    assert result.core_ready
    assert not result.missing
    assert {endpoint for endpoint, _ in provider.calls} == ENDPOINTS
    assert (
        len([request for request in result.requests.values() if request.endpoint == "daily"]) == 65
    )
    assert (
        len([request for request in result.requests.values() if request.endpoint == "stk_limit"])
        == 30
    )
    assert (
        len([request for request in result.requests.values() if request.endpoint == "fund_daily"])
        == 21
    )
    assert (
        len([request for request in result.requests.values() if request.endpoint == "index_daily"])
        == 6
    )
    assert (
        len([request for request in result.requests.values() if request.endpoint == "ths_daily"])
        == 16
    )
    assert (
        len([request for request in result.requests.values() if request.endpoint == "ths_member"])
        == 16
    )
    assert provider.history_member[0]["out_date"] == "20260801"
    assert result.membership_as_of == date(2026, 10, 2)
    assert result.tables["ths_member/885959.TI"]["con_code"].to_list() == ["000001.SZ", "000002.SZ"]
    directory = tmp_path / "recorded"
    result.record(directory)
    manifest = json.loads((directory / "manifest.json").read_text())
    for entry in manifest["tables"]:
        frame = pl.read_parquet(directory / entry["file"])
        assert frame.height == entry["rows"]
        assert entry["units"] == "raw"
        if entry["endpoint"] == "ths_member":
            assert entry["membershipAsOf"] == "2026-10-02"


@pytest.mark.parametrize(("count", "omit_index"), [(4999, False), (5000, True)])
def test_core_not_ready_has_explicit_reason(tmp_path: Path, count: int, omit_index: bool) -> None:
    provider = SyntheticSource(tmp_path)
    provider.count = count
    provider.omit_index = omit_index
    result = collect(provider, ROOT / "config", date(2026, 8, 28), history=False)
    assert not result.core_ready
    assert result.missing
    if count < 5000:
        assert "4999 < 5000" in result.missing["daily/20260828"]
    else:
        assert result.missing["index_daily/399303.SZ"] == "核心指数缺少目标交易日"


def test_parquet_replay_repeats_full_plan_without_network_and_rejects_missing(
    tmp_path: Path,
) -> None:
    from hub_providers.tushare.replay import RecordedTushareSource

    result = collect(SyntheticSource(tmp_path / "cache"), ROOT / "config", date(2026, 8, 28))
    result.record(tmp_path / "recorded")
    replay = RecordedTushareSource(tmp_path / "recorded")
    replayed = collect(replay, ROOT / "config", date(2026, 8, 28))
    assert replayed.core_ready
    assert replayed.membership_as_of == date(2026, 10, 2)
    assert replayed.tables.keys() == result.tables.keys()
    for key, frame in result.tables.items():
        assert replayed.tables[key].equals(frame)
    with pytest.raises(TushareError, match="录制覆盖"):
        replay.query("daily", trade_date="20260831")
    replay.close()
