"""合成边界响应，全部HTTP离线；真实交易日录制另有来源标记。"""

import json
import socket
from collections.abc import Callable
from concurrent.futures import ThreadPoolExecutor
from datetime import UTC, datetime
from pathlib import Path
from threading import Lock
from time import sleep
from typing import Any

import httpx
import polars as pl
import pytest

from hub_providers.tushare import TushareError, TushareSource, normalize
from hub_providers.tushare.adapter import ENDPOINTS

NOW = datetime(2026, 8, 28, 12, tzinfo=UTC)


@pytest.fixture(autouse=True)
def offline(monkeypatch: pytest.MonkeyPatch) -> None:
    def reject(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("T20测试必须离线")

    monkeypatch.setattr(socket.socket, "connect", reject)


def response(items: list[list[Any]], fields: list[str] | None = None) -> httpx.Response:
    return httpx.Response(
        200,
        json={
            "code": 0,
            "data": {"fields": fields or ["ts_code", "trade_date", "amount"], "items": items},
        },
    )


def source(
    tmp_path: Path, handler: Callable[[httpx.Request], httpx.Response], **kwargs: Any
) -> TushareSource:
    return TushareSource(
        "OFFLINE_TOKEN",
        cache_dir=tmp_path,
        client=httpx.Client(transport=httpx.MockTransport(handler)),
        now=lambda: NOW,
        sleeper=lambda seconds: None,
        **kwargs,
    )


@pytest.mark.parametrize("endpoint", sorted(ENDPOINTS))
def test_all_interfaces_raw_records_pagination_and_cache(tmp_path: Path, endpoint: str) -> None:
    calls: list[dict[str, Any]] = []

    def handle(request: httpx.Request) -> httpx.Response:
        data = json.loads(request.content)
        calls.append(data)
        assert data["api_name"] == endpoint
        assert data["token"] == "OFFLINE_TOKEN"
        return response(
            [["A", "20260827", 1.5], ["B", "20260827", None]]
            if data["params"]["offset"] == "0"
            else [["C", "20260827", 2.5]]
        )

    provider = source(tmp_path, handle, page_size=2)
    rows = provider.query(endpoint, trade_date="20260827", fields="ts_code,trade_date,amount")
    assert len(rows) == 3
    assert rows[0]["amount"] == 1.5
    assert rows[1]["amount"] is None
    assert [entry["params"]["offset"] for entry in calls] == ["0", "2"]
    assert (
        provider.query(endpoint, trade_date="20260827", fields="ts_code,trade_date,amount") == rows
    )
    assert len(calls) == 2
    for file in tmp_path.rglob("*.json"):
        assert "OFFLINE_TOKEN" not in file.read_text()
        assert json.loads(file.read_text())["units"] == "raw"


def test_today_always_refreshes_fields_do_not_share_cache_and_empty_not_cached(
    tmp_path: Path,
) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return response([["A", "20260828", calls]])

    provider = source(tmp_path, handle)
    assert provider.query("daily", trade_date="20260828")[0]["amount"] == 1
    assert provider.query("daily", trade_date="20260828")[0]["amount"] == 2
    provider.query("daily", trade_date="20260827", fields="amount")
    provider.query("daily", trade_date="20260827", fields="close")
    assert calls == 4
    assert len(list(tmp_path.rglob("*.parquet"))) == 3
    empty = source(tmp_path / "empty", lambda request: response([]))
    empty.query("daily", trade_date="20260827")
    assert not list((tmp_path / "empty").rglob("*.parquet"))


def test_weekly_and_current_member_refresh_by_actual_fetch_time(tmp_path: Path) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return response([["A", "20260827", calls]])

    provider = source(tmp_path, handle)
    provider.query("stock_basic")
    provider.query("ths_member", ts_code="885959.TI")
    provider.now = lambda: datetime(2026, 8, 29, 12, tzinfo=UTC)
    provider.query("stock_basic")
    provider.query("ths_member", ts_code="885959.TI")
    assert calls == 3
    provider.now = lambda: datetime(2026, 8, 31, 12, tzinfo=UTC)
    provider.query("stock_basic")
    assert calls == 4


@pytest.mark.parametrize("failure", ["http429", "transport", "limit"])
def test_three_retries_and_final_health(tmp_path: Path, failure: str) -> None:
    calls = 0
    delays: list[float] = []

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if calls < 4:
            if failure == "transport":
                raise httpx.ReadTimeout("OFFLINE_TOKEN", request=request)
            return (
                httpx.Response(429)
                if failure == "http429"
                else httpx.Response(
                    200, json={"code": -2001, "msg": "每分钟频次限制 OFFLINE_TOKEN"}
                )
            )
        return response([["A", "20260827", 1]])

    provider = source(tmp_path, handle)
    provider.sleeper = delays.append
    assert provider.query("daily", trade_date="20260827")
    assert delays == [1, 2, 4]
    assert calls == 4
    assert provider.health["daily"].status == "ok"


@pytest.mark.parametrize("bad", ["permission", "json", "columns", "repeated"])
def test_failures_fixed_reason_without_upstream_body(tmp_path: Path, bad: str) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        if bad == "permission":
            return httpx.Response(200, json={"code": -2002, "msg": "权限不足 OFFLINE_TOKEN"})
        if bad == "json":
            return httpx.Response(200, text="OFFLINE_TOKEN invalid JSON")
        if bad == "columns":
            return response([[1, 2]], ["one"])
        return response([["A", "20260827", 1], ["B", "20260827", 2]])

    provider = source(tmp_path, handle, page_size=2)
    with pytest.raises(TushareError) as error:
        provider.query("daily", trade_date="20260827")
    assert "OFFLINE_TOKEN" not in str(error.value)
    assert "OFFLINE_TOKEN" not in str(provider.health)
    assert calls == (2 if bad == "repeated" else 1)
    assert not list(tmp_path.rglob("*.parquet"))


def test_shared_http_concurrency_not_more_than_four(tmp_path: Path) -> None:
    active = maximum = 0
    lock = Lock()

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal active, maximum
        with lock:
            active += 1
            maximum = max(maximum, active)
        sleep(0.01)
        with lock:
            active -= 1
        return response([["A", "20260827", 1]])

    provider = source(tmp_path, handle)

    def fetch(index: int) -> None:
        provider.query("daily", trade_date=f"202608{index + 1:02d}")

    with ThreadPoolExecutor(max_workers=12) as pool:
        list(pool.map(fetch, range(12)))
    assert maximum <= 4


def test_units_raw_preserved_and_no_double_conversion() -> None:
    frame = pl.DataFrame({"amount": [1.25, None], "pct_chg": [2.5, None]})
    for endpoint in ("daily", "fund_daily", "index_daily"):
        normalized = normalize(endpoint, frame)
        assert normalized["amountCny"].to_list() == [1250, None]
        assert normalized["pct_chg_ratio"].to_list() == [0.025, None]
        assert normalized["amount"].to_list() == [1.25, None]
        assert normalize(endpoint, normalized).equals(normalized)
    assert (
        normalize("daily_basic", pl.DataFrame({"total_mv": [5.0], "circ_mv": [2.0]}))[
            "totalMarketCapCny"
        ].item()
        == 50000
    )
    assert (
        normalize("moneyflow_dc", pl.DataFrame({"net_amount": [7.0]}))["net_amount_cny"].item()
        == 70000
    )
    # 合成量级边界，不声称这是8/28的真实记录。
    mkt = normalize("moneyflow_mkt_dc", pl.DataFrame({"net_amount": [-343.7e8]}))
    assert mkt["net_amount_cny"].item() / 1e8 == pytest.approx(-343.7)
    assert normalize("fund_share", pl.DataFrame({"fd_share": [8.0]}))["shares"].item() == 80000


def test_corrupted_cache_refetch_and_final_rate_limit_failed(tmp_path: Path) -> None:
    calls = 0

    def handle(request: httpx.Request) -> httpx.Response:
        nonlocal calls
        calls += 1
        return response([["A", "20260827", 1]])

    provider = source(tmp_path, handle)
    provider.query("daily", trade_date="20260827")
    path = next(tmp_path.rglob("*.parquet"))
    path.write_bytes(b"not a parquet")
    assert provider.query("daily", trade_date="20260827")
    assert calls == 2
    limited = source(tmp_path / "limited", lambda request: httpx.Response(429))
    with pytest.raises(TushareError, match="HTTP 429"):
        limited.query("daily", trade_date="20260827")
    assert limited.health["daily"].status == "failed"
    assert limited.health["daily"].error == "HTTP 429"


@pytest.mark.parametrize(
    ("endpoint", "names"),
    [
        ("daily_basic", ("turnover_rate", "turnover_rate_f")),
        ("ths_daily", ("turnover_rate",)),
        (
            "moneyflow_dc",
            (
                "buy_elg_amount_rate",
                "buy_lg_amount_rate",
                "buy_md_amount_rate",
                "buy_sm_amount_rate",
            ),
        ),
        (
            "moneyflow_mkt_dc",
            (
                "pct_change_sh",
                "pct_change_sz",
                "buy_elg_amount_rate",
                "buy_lg_amount_rate",
                "buy_md_amount_rate",
                "buy_sm_amount_rate",
            ),
        ),
    ],
)
def test_documented_percentages_preserve_raw_and_nulls(
    endpoint: str, names: tuple[str, ...]
) -> None:
    raw = pl.DataFrame({name: [-2.5, None] for name in names})
    normalized = normalize(endpoint, raw)
    for name in names:
        assert normalized[name].to_list() == [-2.5, None]
        assert normalized[f"{name}_ratio"].to_list() == [-0.025, None]
    assert normalize(endpoint, normalized).equals(normalized)
