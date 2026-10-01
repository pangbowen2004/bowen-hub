"""本目录命令预接线；替换实现时保留登记入口。"""

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    groups["evals"].command("run")(run)
    groups["evals"].command("compare")(compare)
    groups["evals"].command("harvest")(harvest)
    groups["providers"].command("check-models")(check_models)


def run(capability: str | None = None, changed: bool = False, offline: bool = False) -> None:
    pending("T04")


def compare(candidate: str = typer.Option(...), capability: str | None = None) -> None:
    pending("T04")


def harvest() -> None:
    pending("T04")


def check_models() -> None:
    pending("T04")
