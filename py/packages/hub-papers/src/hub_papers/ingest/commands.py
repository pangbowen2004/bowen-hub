"""论文命令复用统一流水线，写入与派生只经API。"""

from pathlib import Path

import typer

from hub_papers.ingest.cli import run_pipeline


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("ingest")(ingest)


def ingest(
    upload_id: str | None = typer.Argument(None), file: Path | None = None, arxiv: str | None = None
) -> None:
    if sum(value is not None for value in (upload_id, file, arxiv)) != 1:
        raise typer.BadParameter("uploadId、--file、--arxiv 必须且只能指定一项")
    run_pipeline(upload_id=upload_id, source=file, arxiv=arxiv)
