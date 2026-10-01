"""七个命令组通过 entry point 预接线。"""

from collections.abc import Callable
from importlib.metadata import entry_points
from typing import cast

import typer

GROUPS = ("news", "market", "papers", "migrate", "evals", "providers", "export")


def create_app() -> typer.Typer:
    app = typer.Typer(help="Bowen Hub 计算任务", no_args_is_help=True)
    groups = {
        name: typer.Typer(help=f"{name} 命令", no_args_is_help=name != "export") for name in GROUPS
    }
    for entry in sorted(
        entry_points(group="hub.commands"), key=lambda item: (item.value, item.name)
    ):
        register = cast(Callable[[dict[str, typer.Typer]], None], entry.load())
        register(groups)
    for name, group in groups.items():
        app.add_typer(group, name=name)
    return app


def main() -> None:
    create_app()()
