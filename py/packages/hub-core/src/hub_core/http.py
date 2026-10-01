"""有限重试和来源健康；不记录 URL、正文或凭证。"""

from collections.abc import Callable
from datetime import UTC, datetime
from time import sleep
from typing import Any

import httpx

from hub_contracts import NewsSourceHealth


class HttpClient:
    def __init__(
        self,
        *,
        timeout: float = 30,
        retries: int = 3,
        backoff: float = 1,
        client: httpx.Client | None = None,
        sleeper: Callable[[float], None] = sleep,
        on_health: Callable[[NewsSourceHealth], None] | None = None,
    ) -> None:
        if timeout <= 0 or retries < 0 or backoff < 0:
            raise ValueError("超时必须为正；重试和退避不能为负")
        self.client = client or httpx.Client(timeout=timeout, follow_redirects=True)
        self._owns_client = client is None
        self.timeout = timeout
        self.retries = retries
        self.backoff = backoff
        self.sleeper = sleeper
        self.on_health = on_health
        self.health: dict[str, NewsSourceHealth] = {}

    def close(self) -> None:
        if self._owns_client:
            self.client.close()

    def _record(self, source: str, error: str | None) -> None:
        record = NewsSourceHealth(
            id=source,
            checkedAt=datetime.now(UTC),
            status="ok" if error is None else "failed",
            error=error,
        )
        self.health[source] = record
        if self.on_health is not None:
            self.on_health(record)

    def request(
        self, method: str, url: str, *, source: str, retry: bool | None = None, **kwargs: Any
    ) -> httpx.Response:
        # 非幂等写入默认不重试，避免响应丢失导致重复记录。
        can_retry = (
            method.upper() in {"GET", "HEAD", "PUT", "DELETE", "OPTIONS"}
            if retry is None
            else retry
        )
        attempts = self.retries + 1 if can_retry else 1
        for attempt in range(attempts):
            try:
                response = self.client.request(method, url, timeout=self.timeout, **kwargs)
                response.raise_for_status()
            except (httpx.TransportError, httpx.HTTPStatusError) as error:
                status = (
                    error.response.status_code if isinstance(error, httpx.HTTPStatusError) else None
                )
                transient = status in {408, 429, 500, 502, 503, 504} if status is not None else True
                if not transient or attempt + 1 == attempts:
                    self._record(
                        source, f"HTTP {status}" if status is not None else type(error).__name__
                    )
                    # 不泄露带 key 的 URL、请求头或上游正文。
                    raise SourceRequestError(
                        source, self.health[source].error or "请求失败"
                    ) from None
                self.sleeper(self.backoff * 2**attempt)
            else:
                self._record(source, None)
                return response
        raise AssertionError("请求循环不应走到此处")


class SourceRequestError(RuntimeError):
    def __init__(self, source: str, reason: str) -> None:
        super().__init__(f"来源 {source} 请求失败：{reason}")
