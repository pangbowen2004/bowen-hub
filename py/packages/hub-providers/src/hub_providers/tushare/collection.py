"""配置驱动的取数计划、核心就绪与原始录制；领域指标归T21。"""

import json
from concurrent.futures import ThreadPoolExecutor
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from typing import Any

import polars as pl

from hub_core.config import load_config

from .adapter import SHANGHAI, TushareError, TushareSource
from .calendar import SseCalendar

CORE = frozenset(
    {
        "trade_cal",
        "daily",
        "daily_basic",
        "stk_limit",
        "stock_basic",
        "index_member_all",
        "index_daily",
    }
)


@dataclass(frozen=True)
class Request:
    endpoint: str
    params: dict[str, str]
    key: str


@dataclass
class Collection:
    day: date
    tables: dict[str, pl.DataFrame]
    requests: dict[str, Request]
    missing: dict[str, str]
    core_ready: bool
    membership_as_of: date

    def record(self, directory: Path) -> None:
        directory.mkdir(parents=True, exist_ok=True)
        entries: list[dict[str, Any]] = []
        for key, frame in self.tables.items():
            request = self.requests[key]
            relative = Path(request.endpoint) / f"{key.replace('/', '-')}.parquet"
            path = directory / relative
            path.parent.mkdir(parents=True, exist_ok=True)
            frame.write_parquet(path)
            entries.append(
                {
                    "file": relative.as_posix(),
                    "endpoint": request.endpoint,
                    "params": request.params,
                    "rows": frame.height,
                    "units": "raw",
                    "membershipAsOf": self.membership_as_of.isoformat()
                    if request.endpoint == "ths_member"
                    else None,
                }
            )
        (directory / "manifest.json").write_text(
            json.dumps(
                {
                    "date": self.day.isoformat(),
                    "origin": "真实TuShare原始响应录制",
                    "coreReady": self.core_ready,
                    "membershipAsOf": self.membership_as_of.isoformat(),
                    "missing": self.missing,
                    "tables": entries,
                },
                ensure_ascii=False,
                indent=2,
            )
        )


def collect(
    source: TushareSource, config_dir: Path, day: date, *, history: bool = True
) -> Collection:
    config = load_config(config_dir / "market.yaml")
    indices = load_config(config_dir / "market_indices.yaml")["indices"]
    directions = load_config(config_dir / "market_directions.yaml")["directions"]
    calendar = SseCalendar(source)
    tables: dict[str, pl.DataFrame] = {}
    requests: dict[str, Request] = {}
    missing: dict[str, str] = {}
    result = Collection(
        day, tables, requests, missing, False, source.now().astimezone(SHANGHAI).date()
    )
    try:
        if not calendar.is_session(day):
            missing["trade_cal"] = "目标日期不是交易日"
            return result
        sessions = calendar.lookback(day, max(config["lookback"].values()) if history else 2)
    except Exception:
        missing["trade_cal"] = "交易日历请求失败或回看不足"
        return result
    stamp = day.strftime("%Y%m%d")
    previous = calendar.previous_session(day).strftime("%Y%m%d")
    plan: list[Request] = []

    def add(endpoint: str, params: dict[str, str], suffix: str) -> None:
        key = f"{endpoint}/{suffix}"
        plan.append(Request(endpoint, params, key))

    for year in range(sessions[0].year, day.year + 1):
        add(
            "trade_cal",
            {"exchange": "SSE", "start_date": f"{year}0101", "end_date": f"{year}1231"},
            str(year),
        )
    for endpoint, setting in (
        ("daily", "dailySessions"),
        ("stk_limit", "limitSessions"),
        ("fund_daily", "fundSessions"),
    ):
        for session in sessions[-config["lookback"][setting] :] if history else [day]:
            value = session.strftime("%Y%m%d")
            add(endpoint, {"trade_date": value}, value)
    for endpoint in ("daily_basic", "moneyflow_dc", "moneyflow_mkt_dc"):
        add(endpoint, {"trade_date": stamp}, stamp)
    for status in ("L", "D", "P"):
        add("stock_basic", {"list_status": status}, status)
    for status in ("Y", "N"):
        add("index_member_all", {"is_new": status}, status)
    add("fund_basic", {"market": "E", "status": "L"}, "E-L")
    for value in (previous, stamp):
        add("fund_share", {"trade_date": value}, value)
    for category in ("U", "D", "Z"):
        add("limit_list_d", {"trade_date": stamp, "limit_type": category}, f"{stamp}-{category}")
    for row in indices:
        start = sessions[-int(config["lookback"]["indexSessions"])] if history else day
        add(
            "index_daily",
            {"ts_code": row["code"], "start_date": start.strftime("%Y%m%d"), "end_date": stamp},
            row["code"],
        )
    for row in directions:
        start = sessions[-int(config["lookback"]["thsSessions"])] if history else day
        add(
            "ths_daily",
            {"ts_code": row["code"], "start_date": start.strftime("%Y%m%d"), "end_date": stamp},
            row["code"],
        )
        add("ths_member", {"ts_code": row["code"]}, row["code"])

    def fetch(request: Request) -> tuple[Request, pl.DataFrame | None, str | None]:
        try:
            rows = source.query(request.endpoint, **request.params)
            return request, pl.DataFrame(rows, infer_schema_length=None), None
        except TushareError as error:
            return request, None, str(error).split("：", 1)[-1]
        except Exception:
            return request, None, "来源请求或解析失败"

    with ThreadPoolExecutor(max_workers=min(4, config["run"]["concurrency"])) as pool:
        for request, frame, error in pool.map(fetch, plan):
            requests[request.key] = request
            if error is not None or frame is None:
                missing[request.key] = error or "来源请求失败"
            else:
                tables[request.key] = frame
    for endpoint, minimum in config["minimumRows"].items():
        frame = tables.get(f"{endpoint}/{stamp}")
        if frame is not None and frame.height < minimum:
            missing[f"{endpoint}/{stamp}"] = f"核心表未就绪：{frame.height} < {minimum}"
    for endpoint in CORE - {"daily", "daily_basic", "stk_limit"}:
        frames = [frame for key, frame in tables.items() if key.startswith(endpoint + "/")]
        if not frames or not any(frame.height for frame in frames):
            missing[f"{endpoint}/core"] = "核心表为空或请求失败"
    for row in indices:
        frame = tables.get(f"index_daily/{row['code']}")
        if (
            frame is None
            or "trade_date" not in frame.columns
            or not frame.filter(pl.col("trade_date") == stamp).height
        ):
            missing[f"index_daily/{row['code']}"] = "核心指数缺少目标交易日"
    result.core_ready = not any(key.split("/", 1)[0] in CORE for key in missing)
    return result
