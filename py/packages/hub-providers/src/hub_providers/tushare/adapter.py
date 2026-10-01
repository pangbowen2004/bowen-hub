"""TuShare公开数据HTTP、原始Parquet缓存与有限重试；不写API。"""

import hashlib
import json
from collections.abc import Callable, Sequence
from datetime import UTC, datetime
from pathlib import Path
from threading import BoundedSemaphore, Lock
from time import sleep
from typing import Any, cast
from zoneinfo import ZoneInfo

import httpx
import polars as pl

from hub_contracts import NewsSourceHealth

SHANGHAI = ZoneInfo("Asia/Shanghai")
ENDPOINTS = frozenset(
    {
        "trade_cal",
        "daily",
        "daily_basic",
        "stk_limit",
        "stock_basic",
        "index_member_all",
        "index_daily",
        "limit_list_d",
        "moneyflow_dc",
        "moneyflow_mkt_dc",
        "fund_basic",
        "fund_daily",
        "fund_share",
        "ths_member",
        "ths_daily",
    }
)
WEEKLY = frozenset({"stock_basic", "index_member_all", "fund_basic"})


class TushareError(RuntimeError):
    """只暴露固定原因，供应商原文可能含token，不直接输出。"""


class TushareSource:
    def __init__(
        self,
        token: str,
        *,
        cache_dir: Path = Path(".cache/tushare"),
        client: httpx.Client | None = None,
        concurrency: int = 4,
        retries: int = 3,
        now: Callable[[], datetime] = lambda: datetime.now(UTC),
        sleeper: Callable[[float], None] = sleep,
        page_size: int = 2000,
    ) -> None:
        if not token or not 1 <= concurrency <= 4 or not 0 <= retries <= 3 or page_size < 1:
            raise ValueError("TuShare配置无效")
        self._token = token
        self.client = client or httpx.Client(timeout=30, follow_redirects=True)
        self._owns_client = client is None
        self.cache_dir = cache_dir
        self.semaphore = BoundedSemaphore(concurrency)
        self.lock = Lock()
        self.retries = retries
        self.now = now
        self.sleeper = sleeper
        self.page_size = page_size
        self.health: dict[str, NewsSourceHealth] = {}

    def close(self) -> None:
        if self._owns_client:
            self.client.close()

    def _health(self, endpoint: str, error: str | None) -> None:
        with self.lock:
            self.health[endpoint] = NewsSourceHealth(
                id=f"tushare:{endpoint}",
                checkedAt=self.now(),
                status="ok" if error is None else "failed",
                error=error,
            )

    def _page(self, endpoint: str, params: dict[str, str], fields: str) -> list[dict[str, Any]]:
        for attempt in range(self.retries + 1):
            reason = "响应解析失败"
            retry = False
            try:
                with self.semaphore:
                    response = self.client.post(
                        "https://api.tushare.pro",
                        json={
                            "api_name": endpoint,
                            "token": self._token,
                            "params": params,
                            "fields": fields,
                        },
                        timeout=30,
                    )
                if response.status_code != 200:
                    reason = f"HTTP {response.status_code}"
                    retry = response.status_code in {408, 429, 500, 502, 503, 504}
                else:
                    payload = response.json()
                    if payload.get("code") != 0:
                        message = str(payload.get("msg", ""))
                        retry = any(word in message for word in ("频率", "频次", "每分钟", "限流"))
                        reason = (
                            "接口限流"
                            if retry
                            else "接口权限不足"
                            if any(word in message for word in ("权限", "积分"))
                            else "供应商返回错误"
                        )
                    else:
                        data = payload["data"]
                        if not isinstance(data["fields"], list) or not isinstance(
                            data["items"], list
                        ):
                            raise ValueError()
                        raw_names = cast(list[Any], data["fields"])
                        if not all(isinstance(name, str) for name in raw_names):
                            raise ValueError()
                        names = cast(list[str], raw_names)
                        if len(names) != len(set(names)):
                            raise ValueError()
                        items = cast(list[Any], data["items"])
                        rows: list[dict[str, Any]] = []
                        for raw_row in items:
                            if not isinstance(raw_row, list):
                                raise ValueError()
                            row = cast(list[Any], raw_row)
                            if len(row) != len(names):
                                raise ValueError()
                            rows.append(dict(zip(names, row, strict=True)))
                        return rows
            except httpx.TransportError as error:
                reason = type(error).__name__
                retry = True
            except Exception:
                reason = "响应解析失败"
            if retry and attempt < self.retries:
                self.sleeper(2**attempt)
                continue
            raise TushareError(f"{endpoint}：{reason}") from None
        raise AssertionError("重试循环不应走到此处")

    def _path(self, endpoint: str, params: dict[str, str], fields: str) -> Path:
        identity = json.dumps(
            {"params": params, "fields": fields}, sort_keys=True, ensure_ascii=True
        )
        digest = hashlib.sha256(identity.encode()).hexdigest()[:16]
        key = params.get("trade_date") or params.get("ts_code") or "all"
        # 代码、日期只作可读前缀；未知参数不能成为目录穿越路径。
        prefix = "".join(char for char in key if char.isalnum() or char in "._-")[:40]
        return self.cache_dir / endpoint / f"{prefix}-{digest}.parquet"

    def _fresh(self, endpoint: str, params: dict[str, str], metadata: dict[str, Any]) -> bool:
        today = self.now().astimezone(SHANGHAI).date()
        fetched = datetime.fromisoformat(str(metadata["fetchedAt"])).astimezone(SHANGHAI).date()
        if endpoint in WEEKLY:
            return fetched.isocalendar()[:2] == today.isocalendar()[:2]
        if endpoint in {"ths_member", "trade_cal"}:
            return fetched == today
        last = params.get("trade_date") or params.get("end_date")
        return last is not None and last < today.strftime("%Y%m%d")

    def query(self, endpoint: str, **params: str) -> Sequence[dict[str, Any]]:
        if endpoint not in ENDPOINTS:
            raise ValueError("未登记的TuShare接口")
        clean = dict(params)
        fields = clean.pop("fields", "")
        if any(key.lower() in {"token", "api_key", "authorization"} for key in clean):
            raise ValueError("凭据不能作为查询参数")
        path = self._path(endpoint, clean, fields)
        meta = path.with_suffix(".json")
        try:
            if path.exists() and meta.exists():
                metadata = json.loads(meta.read_text())
                if (
                    metadata.get("units") == "raw"
                    and metadata.get("params") == clean
                    and metadata.get("fields") == fields
                    and self._fresh(endpoint, clean, metadata)
                ):
                    result = pl.read_parquet(path).to_dicts()
                    self._health(endpoint, None)
                    return result
        except Exception:
            # 缓存损坏仅重新取数，不以旧文件冒充有效结果。
            pass
        try:
            rows: list[dict[str, Any]] = []
            offset = 0
            previous: list[dict[str, Any]] | None = None
            while True:
                page = self._page(
                    endpoint, clean | {"limit": str(self.page_size), "offset": str(offset)}, fields
                )
                if page and page == previous:
                    raise TushareError(f"{endpoint}：分页未推进")
                rows.extend(page)
                if len(page) < self.page_size:
                    break
                previous = page
                offset += len(page)
            if rows:
                path.parent.mkdir(parents=True, exist_ok=True)
                # 缓存和录制始终保存原始单位；不缓存空表来遮盖稍后就绪。
                pl.DataFrame(rows, infer_schema_length=None).write_parquet(path)
                meta.write_text(
                    json.dumps(
                        {
                            "endpoint": endpoint,
                            "params": clean,
                            "fields": fields,
                            "units": "raw",
                            "fetchedAt": self.now().isoformat(),
                            "rows": len(rows),
                        },
                        ensure_ascii=False,
                        indent=2,
                    )
                )
            self._health(endpoint, None)
            return rows
        except TushareError as error:
            self._health(endpoint, str(error).split("：", 1)[-1])
            raise
        except Exception:
            self._health(endpoint, "响应或缓存写入失败")
            raise TushareError(f"{endpoint}：响应或缓存写入失败") from None
