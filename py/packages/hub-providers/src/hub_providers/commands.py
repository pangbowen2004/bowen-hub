"""本目录命令预接线；替换实现时保留登记入口。"""

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    groups["providers"].command("check")(check)
    groups["news"].command("sources")(sources)


def check() -> None:
    pending("T10/T20")


def sources(check: bool = False) -> None:
    pending("T10")
