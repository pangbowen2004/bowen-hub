"""本目录命令预接线；替换实现时保留登记入口。"""

from pathlib import Path
from typing import Annotated

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("task")(task)
    groups["papers"].command("submit")(submit)


def task(id: str | None = typer.Argument(None), file: Path | None = None) -> None:
    pending("T31")


def submit(
    id_or_draft: str = typer.Argument(...),
    draft: Annotated[Path | None, typer.Argument()] = None,
    file: Path | None = None,
) -> None:
    pending("T31")
