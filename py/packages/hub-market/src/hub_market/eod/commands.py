"""本目录命令预接线；替换实现时保留登记入口。"""

from pathlib import Path

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    groups["market"].command("eod")(eod)
    groups["market"].command("backfill")(backfill)


def eod(
    date: str | None = None,
    force: bool = False,
    deadline: str = "22:00",
    dry_run: Path | None = None,
) -> None:
    pending("T23")


def backfill(start: str = typer.Option(...), end: str = typer.Option(...)) -> None:
    pending("T23")
