"""可选私有逐例报告，只保存输出与安全诊断，不序列化评测输入。"""

import json
import os
import re
from collections.abc import Generator
from contextlib import contextmanager
from contextvars import ContextVar
from pathlib import Path
from typing import Any

SAFE_REASONS = {
    "输入或输出契约不合格",
    "超过 token 上限",
    "结构修复后仍不合格",
    "模型传输失败",
    "校验执行失败",
    "能力执行失败",
}
SAFE_ERRORS = {
    "ValueError",
    "ValidationError",
    "TransportError",
    "StructureError",
    "TokenLimitError",
    "FileNotFoundError",
    "OSError",
    "TimeoutError",
    "ModelAPIError",
    "TypeError",
    "KeyError",
    "StopIteration",
    "UnexpectedModelBehavior",
    "CancelledError",
}


def identifier(value: str) -> str:
    return re.sub(r"[^a-zA-Z0-9_.:-]", "_", value)[:80]


def error_label(message: str, error_type: str | None = None) -> str:
    name = error_type or message.partition(":")[0]
    return name if name in SAFE_ERRORS else "Error"


class CaseReport:
    def __init__(self, path: Path) -> None:
        self.path = path
        self.groups: dict[str, Any] = {}
        self.responses: dict[tuple[str, str], list[dict[str, Any]]] = {}
        self.current: ContextVar[tuple[str, str] | None] = ContextVar("eval_case", default=None)

    @contextmanager
    def case(self, capability: str, case_id: str) -> Generator[None]:
        token = self.current.set((capability, case_id))
        try:
            yield
        finally:
            self.current.reset(token)

    def observe(self, response: dict[str, Any]) -> None:
        # 观察器仅收取网关白名单输出，不接受Request或HTTP元数据。
        current = self.current.get()
        if current is not None:
            self.responses.setdefault(current, []).append(response)

    def write(self, capability: str, cases: list[dict[str, Any]]) -> None:
        for case in cases:
            case["model_responses"] = self.responses.get((capability, case["id"]), [])
        self.groups[capability] = {"cases": cases}
        self.path.parent.mkdir(parents=True, exist_ok=True)
        # 既有文件也先收紧权限；不跟随符号链接覆盖其它文件。
        fd = os.open(self.path, os.O_WRONLY | os.O_CREAT | os.O_TRUNC | os.O_NOFOLLOW, 0o600)
        with os.fdopen(fd, "w", encoding="utf-8") as output:
            os.fchmod(output.fileno(), 0o600)
            json.dump({"capabilities": self.groups}, output, ensure_ascii=False, indent=2)
