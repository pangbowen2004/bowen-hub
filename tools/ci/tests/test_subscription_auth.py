"""仅用假认证与HTTP替身验证续期存储；不读取任何真实凭据。"""

import importlib.util
import json
from collections.abc import Mapping, Sequence
from email.message import Message
from http.client import HTTPMessage
from io import BytesIO
from pathlib import Path
from types import ModuleType, TracebackType
from typing import Protocol, cast
from urllib.error import HTTPError, URLError
from urllib.request import HTTPRedirectHandler, Request

import pytest


class AuthModule(Protocol):
    def main(self, arguments: Sequence[str], environment: Mapping[str, str]) -> int: ...


@pytest.fixture
def module() -> ModuleType:
    path = Path(__file__).parents[1] / "subscription-auth.py"
    spec = importlib.util.spec_from_file_location("subscription_auth", path)
    assert spec is not None
    assert spec.loader is not None
    value = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(value)
    return value


@pytest.fixture
def environment(tmp_path: Path) -> dict[str, str]:
    return {
        "CODEX_HOME": str(tmp_path / "runner" / "codex"),
        "RUNNER_TEMP": str(tmp_path / "runner"),
        "GITHUB_WORKSPACE": str(tmp_path / "checkout"),
        "CLOUDFLARE_ACCOUNT_ID": "0" * 32,
        "CLOUDFLARE_API_TOKEN": "fake-cf-sensitive-marker",
    }


def auth_bytes() -> bytes:
    return json.dumps(
        {
            "auth_mode": "chatgpt",
            "tokens": {
                "access_token": "fake-access-marker",
                "refresh_token": "fake-refresh-marker",
                "id_token": "fake-id-marker",
            },
            "last_refresh": "2026-10-03T01:00:00Z",
        }
    ).encode()


class Response:
    def __init__(self, body: bytes, status: int = 200) -> None:
        self.body, self.status = body, status

    def read(self) -> bytes:
        return self.body

    def __enter__(self) -> Response:
        return self

    def __exit__(
        self,
        exception_type: type[BaseException] | None,
        exception: BaseException | None,
        traceback: TracebackType | None,
    ) -> None:
        pass


def test_restore_persist_refreshed_bytes_and_permissions(
    module: ModuleType, environment: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    requests: list[Request] = []

    def http(request: Request, timeout: int) -> Response:
        assert timeout == 30
        requests.append(request)
        return Response(auth_bytes() if request.method == "GET" else b'{"success":true}')

    monkeypatch.setattr(module, "urlopen", http)
    auth = cast(AuthModule, module)
    assert auth.main(["restore"], environment) == 0
    directory = Path(environment["CODEX_HOME"])
    target = directory / "auth.json"
    assert directory.stat().st_mode & 0o777 == 0o700
    assert target.stat().st_mode & 0o777 == 0o600
    assert target.read_bytes() == auth_bytes()
    other = directory / "untouched.txt"
    other.write_text("keep")
    refreshed = auth_bytes().replace(b"2026-10-03", b"2026-10-10")
    target.write_bytes(refreshed)
    assert auth.main(["persist"], environment) == 0
    assert requests[0].method == "GET"
    assert requests[0].data is None
    assert requests[1].method == "PUT"
    assert requests[1].data == refreshed
    for request in requests:
        assert request.full_url == (
            "https://api.cloudflare.com/client/v4/accounts/"
            + "0" * 32
            + "/r2/buckets/bowen-hub-automation/objects/codex/auth.json"
        )
        assert request.get_header("Authorization") == "Bearer fake-cf-sensitive-marker"
    assert requests[1].get_header("Content-type") == "application/octet-stream"
    assert other.read_text() == "keep"


def test_restore_refuses_existing_file_before_http(
    module: ModuleType, environment: dict[str, str], monkeypatch: pytest.MonkeyPatch
) -> None:
    target = Path(environment["CODEX_HOME"]) / "auth.json"
    target.parent.mkdir(parents=True)
    target.write_bytes(b"already refreshed")

    def unexpected_http(*args: object, **kwargs: object) -> None:
        pytest.fail("已有会话不得请求远端旧副本")

    monkeypatch.setattr(module, "urlopen", unexpected_http)
    assert cast(AuthModule, module).main(["restore"], environment) == 1
    assert target.read_bytes() == b"already refreshed"


def test_runner_temp_under_home_is_not_personal_codex(
    module: ModuleType, environment: dict[str, str], monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    monkeypatch.setenv("HOME", str(tmp_path))

    def http(request: Request, timeout: int) -> Response:
        return Response(auth_bytes())

    monkeypatch.setattr(module, "urlopen", http)
    assert cast(AuthModule, module).main(["restore"], environment) == 0


@pytest.mark.parametrize("body", [b'{"success":false,"errors":["sensitive-marker"]}', b"{}"])
def test_put_requires_success_receipt(
    body: bytes,
    module: ModuleType,
    environment: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    target = Path(environment["CODEX_HOME"]) / "auth.json"
    target.parent.mkdir(parents=True)
    target.write_bytes(auth_bytes())

    def http(request: Request, timeout: int) -> Response:
        return Response(body)

    monkeypatch.setattr(module, "urlopen", http)
    assert cast(AuthModule, module).main(["persist"], environment) == 1
    assert "marker" not in capsys.readouterr().err


def test_rejects_auth_file_symlink(
    module: ModuleType, environment: dict[str, str], tmp_path: Path
) -> None:
    target = Path(environment["CODEX_HOME"]) / "auth.json"
    target.parent.mkdir(parents=True)
    outside = tmp_path / "outside-auth"
    outside.write_bytes(auth_bytes())
    target.symlink_to(outside)
    assert cast(AuthModule, module).main(["persist"], environment) == 1
    assert outside.read_bytes() == auth_bytes()


@pytest.mark.parametrize("mode", ["restore", "persist"])
@pytest.mark.parametrize(
    "body",
    [
        b"not-json-sensitive-marker",
        b"[]",
        b"{}",
        b'{"auth_mode":"api"}',
        auth_bytes().replace(b"fake-refresh-marker", b""),
        auth_bytes().replace(b"2026-10-03T01:00:00Z", b"invalid-sensitive-marker"),
    ],
)
def test_bad_auth_fails_without_secret_output(
    mode: str,
    body: bytes,
    module: ModuleType,
    environment: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    requests: list[str] = []

    def http(request: Request, timeout: int) -> Response:
        requests.append(request.get_method())
        return Response(body)

    monkeypatch.setattr(module, "urlopen", http)
    target = Path(environment["CODEX_HOME"]) / "auth.json"
    if mode == "persist":
        target.parent.mkdir(parents=True)
        target.write_bytes(body)
    assert cast(AuthModule, module).main([mode], environment) == 1
    assert requests == (["GET"] if mode == "restore" else [])
    assert "marker" not in capsys.readouterr().err
    if mode == "restore":
        assert not target.exists()


@pytest.mark.parametrize("mode", ["restore", "persist"])
@pytest.mark.parametrize("code", [404, 403, 500, 0])
def test_http_failure_safe_and_404_no_seed(
    mode: str,
    code: int,
    module: ModuleType,
    environment: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    capsys: pytest.CaptureFixture[str],
) -> None:
    def http(request: Request, timeout: int) -> Response:
        if code:
            raise HTTPError(request.full_url, code, "sensitive-error-marker", Message(), None)
        raise URLError("fake-cf-sensitive-marker")

    monkeypatch.setattr(module, "urlopen", http)
    target = Path(environment["CODEX_HOME"]) / "auth.json"
    if mode == "persist":
        target.parent.mkdir(parents=True)
        target.write_bytes(auth_bytes())
    assert cast(AuthModule, module).main([mode], environment) == 1
    output = capsys.readouterr()
    assert output.out == ""
    assert "marker" not in output.err
    assert "http" not in output.err
    assert "Traceback" not in output.err
    if mode == "restore":
        assert not target.exists()
        assert ("404" in output.err) == (code == 404)
    else:
        assert target.read_bytes() == auth_bytes()


@pytest.mark.parametrize(
    "kind", ["missing", "relative", "workspace", "runner", "personal", "symlink"]
)
def test_unsafe_directory_rejected_without_http(
    kind: str,
    module: ModuleType,
    environment: dict[str, str],
    monkeypatch: pytest.MonkeyPatch,
    tmp_path: Path,
) -> None:
    if kind == "missing":
        environment.pop("CODEX_HOME")
    elif kind == "relative":
        environment["CODEX_HOME"] = "relative/codex"
    elif kind == "workspace":
        environment["GITHUB_WORKSPACE"] = environment["RUNNER_TEMP"]
    elif kind == "runner":
        environment["CODEX_HOME"] = environment["RUNNER_TEMP"]
    elif kind == "personal":
        monkeypatch.setenv("HOME", str(tmp_path))
        environment["RUNNER_TEMP"] = str(tmp_path)
        environment["CODEX_HOME"] = str(tmp_path / ".codex")
    else:
        target = Path(environment["CODEX_HOME"])
        target.parent.mkdir(parents=True)
        outside = tmp_path / "outside"
        outside.mkdir()
        target.symlink_to(outside, target_is_directory=True)

    def unexpected_http(*args: object, **kwargs: object) -> None:
        pytest.fail("不安全路径不能触发网络")

    monkeypatch.setattr(module, "urlopen", unexpected_http)
    assert cast(AuthModule, module).main(["restore"], environment) == 1


def test_redirect_is_denied(module: ModuleType) -> None:
    handler_type = cast(type[HTTPRedirectHandler], module.RejectRedirect)
    with pytest.raises(Exception, match=r"^认证存储拒绝重定向$"):
        handler_type().redirect_request(
            Request("https://api.cloudflare.com/"),
            BytesIO(),
            302,
            "sensitive-marker",
            HTTPMessage(),
            "https://other.invalid/",
        )
