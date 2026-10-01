"""本包外部 HTTP 全离线；漏接回放时立即阻止网络。"""

import socket
from typing import Any

import pytest


@pytest.fixture(autouse=True)
def no_external_network(monkeypatch: pytest.MonkeyPatch) -> None:
    def reject(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("供应商测试必须使用离线 HTTP 回放")

    monkeypatch.setattr(socket.socket, "connect", reject)
    monkeypatch.setattr(socket.socket, "connect_ex", reject)
