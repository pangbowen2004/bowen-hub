"""串行私有CI认证恢复/保存；凭据只经过内存与独立临时目录。"""

import json
import os
import re
import sys
from collections.abc import Mapping, Sequence
from datetime import datetime
from http.client import HTTPResponse
from pathlib import Path
from typing import cast
from urllib.error import HTTPError
from urllib.parse import quote
from urllib.request import HTTPRedirectHandler, Request, build_opener


class AuthError(Exception):
    """只携带固定安全错误，不包含输入、路径或HTTP正文。"""


class RejectRedirect(HTTPRedirectHandler):
    """认证请求只到固定Cloudflare端点，不能转发Bearer到重定向目标。"""

    def redirect_request(
        self, req: Request, fp: object, code: int, msg: str, headers: object, newurl: str
    ) -> None:
        raise AuthError("认证存储拒绝重定向")


def urlopen(request: Request, timeout: int) -> HTTPResponse:
    return cast(HTTPResponse, build_opener(RejectRedirect()).open(request, timeout=timeout))


def auth_path(environment: Mapping[str, str]) -> Path:
    raw = environment.get("CODEX_HOME", "").strip()
    temporary = environment.get("RUNNER_TEMP", "").strip()
    if not raw or not temporary:
        raise AuthError("认证目录配置缺失")
    home, runner = Path(raw), Path(temporary)
    if not home.is_absolute() or not runner.is_absolute():
        raise AuthError("认证目录必须是绝对临时路径")
    resolved, runner = home.resolve(), runner.resolve()
    workspace = Path(environment.get("GITHUB_WORKSPACE") or Path(__file__).resolve().parents[2])
    if (
        resolved == runner
        or not resolved.is_relative_to(runner)
        or resolved.is_relative_to(workspace.resolve())
        or resolved.is_relative_to(Path(__file__).resolve().parents[2])
        or resolved == Path.home()
        or (
            resolved.is_relative_to(Path.home())
            and resolved.relative_to(Path.home()).parts[0].startswith(".codex")
        )
        or home.is_symlink()
    ):
        raise AuthError("认证目录必须位于工作区及个人目录之外的runner临时子目录")
    path = resolved / "auth.json"
    if path.is_symlink():
        raise AuthError("认证文件不能是符号链接")
    return path


def validate_auth(body: bytes) -> None:
    value: object = json.loads(body)
    if not isinstance(value, dict):
        raise AuthError("认证文件不是managed ChatGPT会话")
    data = cast(dict[str, object], value)
    tokens = data.get("tokens")
    if data.get("auth_mode") != "chatgpt" or not isinstance(tokens, dict):
        raise AuthError("认证文件不是managed ChatGPT会话")
    bundle = cast(dict[str, object], tokens)
    for key in ("access_token", "refresh_token", "id_token"):
        token = bundle.get(key)
        if not isinstance(token, str) or not token.strip():
            raise AuthError("认证会话缺少有效token")
    refreshed = data.get("last_refresh")
    if not isinstance(refreshed, str) or not refreshed.strip():
        raise AuthError("认证会话缺少有效刷新时间")
    parsed = datetime.fromisoformat(refreshed)
    if parsed.tzinfo is None:
        raise AuthError("认证会话缺少有效刷新时间")


def request(environment: Mapping[str, str], method: str, body: bytes | None = None) -> bytes:
    account = environment.get("CLOUDFLARE_ACCOUNT_ID", "").strip()
    token = environment.get("CLOUDFLARE_API_TOKEN", "").strip()
    if not re.fullmatch(r"[a-fA-F0-9]{32}", account) or not token:
        raise AuthError("Cloudflare认证配置缺失或无效")
    url = (
        f"https://api.cloudflare.com/client/v4/accounts/{account}/r2/buckets/"
        "bowen-hub-automation/objects/" + quote("codex/auth.json", safe="/")
    )
    headers = {"Authorization": f"Bearer {token}", "Accept": "application/octet-stream"}
    if body is not None:
        headers["Content-Type"] = "application/octet-stream"
    try:
        with urlopen(
            Request(url, data=body, headers=headers, method=method), timeout=30
        ) as response:
            if not 200 <= response.status < 300:
                raise AuthError("认证存储请求失败")
            result = response.read()
            if method == "GET":
                return result
            receipt: object = json.loads(result)
            if (
                not isinstance(receipt, dict)
                or cast(dict[str, object], receipt).get("success") is not True
            ):
                raise AuthError("认证存储未确认保存成功")
            return b""
    except HTTPError as error:
        if method == "GET" and error.code == 404:
            raise AuthError("认证对象不存在（404）；必须由根初始化，不能恢复旧seed") from None
        raise AuthError("认证存储请求失败") from None


def transfer(mode: str, environment: Mapping[str, str]) -> None:
    path = auth_path(environment)
    if mode == "restore":
        if path.exists():
            raise AuthError("认证文件已存在；拒绝覆盖可能已续期的会话")
        body = request(environment, "GET")
        validate_auth(body)
        path.parent.mkdir(mode=0o700, parents=True, exist_ok=True)
        path.parent.chmod(0o700)
        # O_EXCL同时防止检查与写入之间覆盖已有刷新文件。
        descriptor = os.open(path, os.O_WRONLY | os.O_CREAT | os.O_EXCL, 0o600)
        try:
            with os.fdopen(descriptor, "wb") as target:
                os.fchmod(target.fileno(), 0o600)
                target.write(body)
        except Exception:
            path.unlink(missing_ok=True)
            raise
    elif mode == "persist":
        body = path.read_bytes()
        validate_auth(body)
        request(environment, "PUT", body)
    else:
        raise AuthError("仅支持restore或persist")


def main(
    arguments: Sequence[str] | None = None, environment: Mapping[str, str] | None = None
) -> int:
    args = list(arguments if arguments is not None else sys.argv[1:])
    try:
        if len(args) != 1:
            raise AuthError("仅支持restore或persist")
        transfer(args[0], environment if environment is not None else os.environ)
    except AuthError as error:
        print(str(error), file=sys.stderr)
        return 1
    except Exception:
        # 绝不输出异常消息/回溯，供应商正文与token可能包含在异常中。
        print("认证恢复或保存失败", file=sys.stderr)
        return 1
    print("认证恢复完成" if args[0] == "restore" else "认证保存完成")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
