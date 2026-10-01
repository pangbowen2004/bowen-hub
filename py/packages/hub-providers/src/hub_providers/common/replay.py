"""真实录制的严格离线回放；没有对应请求就失败，不扩大覆盖。"""

import json
from collections import defaultdict, deque
from pathlib import Path
from typing import Any

import httpx


class ReplayTransport(httpx.MockTransport):
    def __init__(self, directory: Path) -> None:
        self.records: dict[tuple[str, str, tuple[tuple[str, str], ...]], deque[dict[str, Any]]] = (
            defaultdict(deque)
        )
        for file in sorted(directory.glob("[0-9][0-9][0-9][0-9].json")):
            data = json.loads(file.read_text(encoding="utf-8"))
            request = data["request"]
            key = (request["method"], request["url"], tuple(sorted(request["params"].items())))
            self.records[key].append(data["response"])
        super().__init__(self.replay)

    def replay(self, request: httpx.Request) -> httpx.Response:
        key = (
            request.method,
            str(request.url.copy_with(query=None)),
            tuple(
                sorted(
                    (name, value)
                    for name, value in request.url.params.items()
                    if name not in {"api_key", "token"}
                )
            ),
        )
        if not self.records[key]:
            raise httpx.ConnectError("请求不在录制覆盖范围内", request=request)
        record = self.records[key].popleft()
        headers = {"content-type": record["contentType"]} if record.get("contentType") else {}
        if record.get("location"):
            headers["location"] = record["location"]
        return httpx.Response(
            record["status"], text=record["text"] or "", headers=headers, request=request
        )
