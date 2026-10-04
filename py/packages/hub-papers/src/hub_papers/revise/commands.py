"""论文命令复用统一流水线，写入与派生只经API。"""

import typer

from hub_papers.ingest.cli import run_pipeline


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("revise")(revise)


def revise(id: str = typer.Argument(...), instructions: str | None = None) -> None:
    run_pipeline(paper_id=id, instructions=instructions)
