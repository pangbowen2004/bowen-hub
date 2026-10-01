"""本目录命令预接线；替换实现时保留登记入口。"""

from pathlib import Path

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    groups["market"].command("compare")(compare)


def compare(date: str = typer.Argument(...), input: Path | None = None) -> None:
    pending("T21")
