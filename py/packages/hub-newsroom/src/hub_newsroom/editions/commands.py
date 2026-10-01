"""本目录命令预接线；替换实现时保留登记入口。"""

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    for name in ("morning", "premarket", "weekly"):
        groups["news"].command(name)(edition)


def edition(
    date: str | None = None, no_email: bool = False, no_ai: bool = False, force: bool = False
) -> None:
    pending("T13")
