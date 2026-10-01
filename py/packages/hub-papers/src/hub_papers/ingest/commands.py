"""本目录命令预接线；替换实现时保留登记入口。"""

from pathlib import Path

import typer

from hub_core.cli import pending


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("ingest")(ingest)


def ingest(
    upload_id: str | None = typer.Argument(None), file: Path | None = None, arxiv: str | None = None
) -> None:
    pending("T31")
