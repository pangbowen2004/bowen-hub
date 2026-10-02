"""计算平面只经服务令牌 API 写入；正文来自生成模型。"""

from collections.abc import Sequence
from typing import TypeVar
from urllib.parse import quote

from pydantic import BaseModel, TypeAdapter

from hub_contracts import AiCall, NewsSourceHealth, Run
from hub_core.http import HttpClient
from hub_core.settings import Settings

Model = TypeVar("Model", bound=BaseModel)


class ApiClient:
    def __init__(self, settings: Settings, http: HttpClient) -> None:
        if settings.hub_service_token is None or not settings.hub_service_token.get_secret_value():
            raise ValueError("缺少 HUB_SERVICE_TOKEN")
        self.base_url = settings.hub_api_url.rstrip("/")
        self._headers = {"Authorization": f"Bearer {settings.hub_service_token.get_secret_value()}"}
        self.http = http

    def put(self, path: str, model: BaseModel) -> None:
        self.http.request(
            "PUT",
            self.base_url + path,
            source="hub-api",
            headers=self._headers,
            json=model.model_dump(mode="json", exclude_unset=True),
        )

    def post_batch(self, path: str, models: Sequence[BaseModel]) -> None:
        self.http.request(
            "POST",
            self.base_url + path,
            source="hub-api",
            headers=self._headers,
            json=[model.model_dump(mode="json", exclude_unset=True) for model in models],
            retry=False,
        )

    def post(self, path: str) -> None:
        self.http.request(
            "POST", self.base_url + path, source="hub-api", headers=self._headers, retry=False
        )

    def get(self, path: str, model: type[Model]) -> Model:
        response = self.http.request(
            "GET", self.base_url + path, source="hub-api", headers=self._headers
        )
        return model.model_validate(response.json())

    def get_list(self, path: str, model: type[Model]) -> list[Model]:
        response = self.http.request(
            "GET", self.base_url + path, source="hub-api", headers=self._headers
        )
        return TypeAdapter(list[model]).validate_python(response.json())

    def write_run(self, run: Run) -> None:
        self.put(f"/v1/internal/runs/{quote(run.id, safe='')}", run)

    def write_ai_calls(self, calls: Sequence[AiCall]) -> None:
        self.post_batch("/v1/internal/ai-calls/batch", calls)

    def write_source_health(self, health: NewsSourceHealth) -> None:
        self.put(f"/v1/internal/news/sources/{quote(health.id, safe='')}/health", health)
