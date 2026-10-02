"""导出CLI参数与错误输出回归；不连接API、SMTP或git。"""

import re
from pathlib import Path
from typing import Any

import pytest
import typer
from typer.testing import CliRunner

from hub_core.export import commands
from hub_core.settings import Settings


def app() -> typer.Typer:
    value = typer.Typer()
    commands.register({"export": value})
    return value


def test_export_cli_parameters_and_safe_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / ".git").mkdir()
    calls: list[dict[str, Any]] = []

    def execute(*args: Any, **kwargs: Any) -> dict[str, int]:
        calls.append(kwargs)
        raise RuntimeError("供应商原文或秘密不可进入CLI输出")

    monkeypatch.setattr(commands, "Settings", lambda: Settings())

    def client(*args: Any) -> object:
        return object()

    def config(path: Path) -> dict[str, int]:
        return {"monthlyBudgetUsd": 60}

    monkeypatch.setattr(commands, "ApiClient", client)
    monkeypatch.setattr(commands, "load_config", config)
    monkeypatch.setattr(commands, "run_export", execute)
    result = CliRunner().invoke(
        app(), ["--directory", str(tmp_path), "--date", "2026-10-02", "--force"]
    )
    assert result.exit_code == 1
    assert "数据导出失败" in result.output
    assert "秘密" not in result.output
    assert calls[0]["force"] is True
    assert str(calls[0]["business_date"]) == "2026-10-02"


@pytest.mark.parametrize("force_color", ["0", "1"])
def test_missing_directory_is_explicit_usage_error(force_color: str) -> None:
    result = CliRunner().invoke(app(), [], env={"FORCE_COLOR": force_color})
    assert result.exit_code == 2
    assert "--directory" in re.sub(r"\x1b\[[0-9;]*m", "", result.output)
