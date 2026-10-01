"""录制Parquet按原查询参数离线读取，不扩充缺失窗口或成员历史。"""

import json
from datetime import date, datetime, time
from pathlib import Path
from typing import Any

import httpx
import polars as pl

from .adapter import SHANGHAI, TushareError, TushareSource


class RecordedTushareSource(TushareSource):
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        self.manifest: dict[str, Any] = json.loads((directory / "manifest.json").read_text())
        self.membership_as_of = date.fromisoformat(self.manifest["membershipAsOf"])
        super().__init__(
            "OFFLINE_RECORDED",
            client=httpx.Client(transport=httpx.MockTransport(self.reject)),
            now=lambda: datetime.combine(self.membership_as_of, time.min, SHANGHAI),
        )

    @staticmethod
    def reject(request: httpx.Request) -> httpx.Response:
        raise httpx.ConnectError("离线Parquet回放不能联网", request=request)

    def query(self, endpoint: str, **params: str) -> list[dict[str, Any]]:
        for entry in self.manifest["tables"]:
            if entry["endpoint"] == endpoint and entry["params"] == params:
                if entry["units"] != "raw":
                    raise TushareError("录制不是原始单位")
                self._health(endpoint, None)
                return pl.read_parquet(self.directory / entry["file"]).to_dicts()
        self._health(endpoint, "请求不在录制覆盖范围内")
        raise TushareError(f"{endpoint}：请求不在录制覆盖范围内")

    def close(self) -> None:
        self.client.close()
