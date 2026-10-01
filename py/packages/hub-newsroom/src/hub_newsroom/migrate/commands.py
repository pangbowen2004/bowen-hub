"""本目录命令预接线；替换实现时保留登记入口。"""

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    for name in ("news-legacy", "watchlist"):
        groups["migrate"].command(name)(migrate)


def migrate(dry_run: bool = False, verify: bool = False) -> None:
    pending("T16")
