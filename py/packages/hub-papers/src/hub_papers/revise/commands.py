"""本目录命令预接线；替换实现时保留登记入口。"""

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("revise")(revise)


def revise(id: str = typer.Argument(...), instructions: str | None = None) -> None:
    pending("T31")
