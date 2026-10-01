"""论文领域测试不联网；真实PDF预先下载，测试只读本地文件。"""

import socket
from typing import Any

import pytest


@pytest.fixture(autouse=True)
def offline(monkeypatch: pytest.MonkeyPatch) -> None:
    def reject(*args: Any, **kwargs: Any) -> Any:
        raise AssertionError("论文领域测试不能联网")

    monkeypatch.setattr(socket.socket, "connect", reject)
    monkeypatch.setattr(socket.socket, "connect_ex", reject)
