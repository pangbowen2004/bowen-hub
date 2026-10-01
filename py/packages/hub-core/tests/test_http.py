"""离线假 HTTP 覆盖终止、指数退避、健康记录与超时。"""

import httpx
import pytest

from hub_contracts import NewsSourceHealth
from hub_core.http import HttpClient, SourceRequestError


@pytest.mark.parametrize("failure", ["timeout", "connect", "429", "503"])
def test_transient_then_success(failure: str) -> None:
    calls: list[httpx.Request] = []
    pauses: list[float] = []
    health: list[NewsSourceHealth] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(request)
        if len(calls) < 4:
            if failure == "timeout":
                raise httpx.ReadTimeout("假超时", request=request)
            if failure == "connect":
                raise httpx.ConnectError("假网络故障", request=request)
            return httpx.Response(int(failure))
        return httpx.Response(200, json={"ok": True})

    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        client = HttpClient(
            client=transport, timeout=2.5, sleeper=pauses.append, on_health=health.append
        )
        assert (
            client.request("GET", "https://fake.test/?key=不应泄漏", source="rss").status_code
            == 200
        )
        assert len(calls) == 4
        assert pauses == [1, 2, 4]
        assert calls[0].extensions["timeout"] == {
            "connect": 2.5,
            "read": 2.5,
            "write": 2.5,
            "pool": 2.5,
        }
        assert health[0].status == "ok"
        assert health[0].error is None
        assert health[0].checkedAt.utcoffset() is not None


@pytest.mark.parametrize(
    ("method", "status", "expected"), [("GET", 404, 1), ("GET", 503, 4), ("POST", 503, 1)]
)
def test_exhaustion_and_nonretry(method: str, status: int, expected: int) -> None:
    calls: list[int] = []

    def handler(request: httpx.Request) -> httpx.Response:
        calls.append(1)
        return httpx.Response(status, json={"secret": "不应泄漏"})

    with httpx.Client(transport=httpx.MockTransport(handler)) as transport:
        client = HttpClient(client=transport, sleeper=lambda _: None)
        with pytest.raises(SourceRequestError, match=f"HTTP {status}") as error:
            client.request(method, "https://fake.test/?key=不应泄漏", source="sample")
        assert "不应泄漏" not in str(error.value)
        assert len(calls) == expected
        assert client.health["sample"].status == "failed"


@pytest.mark.parametrize(("timeout", "retries", "backoff"), [(0, 3, 1), (1, -1, 1), (1, 3, -1)])
def test_bad_options(timeout: float, retries: int, backoff: float) -> None:
    with pytest.raises(ValueError, match="超时"):
        HttpClient(timeout=timeout, retries=retries, backoff=backoff)
