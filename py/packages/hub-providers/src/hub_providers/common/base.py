"""适配器共用 HTTP、解析错误和健康状态；不写 API。"""

from collections.abc import Callable
from datetime import UTC, datetime
from typing import Any, TypeVar

from hub_contracts import NewsSourceHealth
from hub_core.http import HttpClient, SourceRequestError

T = TypeVar("T")


class ProviderError(RuntimeError):
    pass


class Provider:
    def __init__(
        self, http: HttpClient, source_id: str, *, headers: dict[str, str] | None = None
    ) -> None:
        self.http = http
        self.source_id = source_id
        self.headers = headers or {}
        self.health: NewsSourceHealth | None = None

    def run(self, action: Callable[[], T]) -> T:
        try:
            result = action()
        except SourceRequestError:
            self.health = self.http.health[self.source_id]
            raise
        except Exception:
            # 上游正文或校验异常可能含凭据，固定诊断不透出原文。
            self.health = NewsSourceHealth(
                id=self.source_id,
                checkedAt=datetime.now(UTC),
                status="failed",
                error="响应解析失败",
            )
            self.http.health[self.source_id] = self.health
            raise ProviderError(f"来源 {self.source_id} 响应解析失败") from None
        self.health = NewsSourceHealth(
            id=self.source_id, checkedAt=datetime.now(UTC), status="ok", error=None
        )
        self.http.health[self.source_id] = self.health
        return result

    def get(self, url: str, *, params: dict[str, str | int] | None = None) -> Any:
        return self.http.request(
            "GET", url, source=self.source_id, headers=self.headers, params=params
        ).json()

    def text(self, url: str, *, params: dict[str, str | int] | None = None) -> str:
        return self.http.request(
            "GET", url, source=self.source_id, headers=self.headers, params=params
        ).text
