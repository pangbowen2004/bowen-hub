"""预接线共用提示；后续任务在各自 commands.py 换成实现。"""

from typing import NoReturn

import typer


def pending(task: str) -> NoReturn:
    typer.echo(f"尚未实现（任务 {task}）", err=True)
    raise typer.Exit(2)
