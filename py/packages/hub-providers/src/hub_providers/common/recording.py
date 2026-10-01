"""显式验收录制：只保存公共响应和无凭据的请求匹配字段。"""

import json
from datetime import UTC, datetime
from pathlib import Path

import httpx

_PARAMETERS = {
    "data",
    "category",
    "start",
    "end",
    "symbols",
    "timeframe",
    "feed",
    "adjustment",
    "startDate",
    "endDate",
    "from",
    "to",
    "release_id",
    "realtime_start",
    "realtime_end",
    "include_release_dates_with_no_data",
    "file_type",
    "limit",
    "offset",
    "sort",
    "include_content",
    "page_token",
    "field_tdr_date_value",
}


def public_location(value: str | None) -> str | None:
    if value is None:
        return None
    url = httpx.URL(value)
    query = httpx.QueryParams(
        {name: item for name, item in url.params.items() if name in _PARAMETERS}
    )
    return str(url.copy_with(query=str(query).encode(), fragment=None, username="", password=""))


class Recorder:
    def __init__(self, directory: Path) -> None:
        self.directory = directory
        directory.mkdir(parents=True, exist_ok=True)
        self.count = 0

    def response(self, response: httpx.Response) -> None:
        response.read()
        self.count += 1
        request = response.request
        entry = {
            "origin": "真实 HTTP 验收录制",
            "recordedAt": datetime.now(UTC).isoformat(),
            "request": {
                "method": request.method,
                "url": str(request.url.copy_with(query=None)),
                "params": {
                    key: value for key, value in request.url.params.items() if key in _PARAMETERS
                },
            },
            "response": {
                "status": response.status_code,
                "contentType": response.headers.get("content-type"),
                "location": public_location(response.headers.get("location"))
                if response.is_redirect
                else None,
                "text": response.text if response.is_success else None,
            },
        }
        (self.directory / f"{self.count:04d}.json").write_text(
            json.dumps(entry, ensure_ascii=False, indent=2), encoding="utf-8"
        )
