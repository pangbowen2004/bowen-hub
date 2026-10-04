"""命令边界只展示安全失败摘要；不输出API响应或模型正文。"""

from pathlib import Path
from uuid import uuid4

import typer

from hub_contracts import PaperDraft
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_papers.ingest.pipeline import Store, execute


def run_pipeline(
    *,
    upload_id: str | None = None,
    source: Path | None = None,
    arxiv: str | None = None,
    paper_id: str | None = None,
    instructions: str | None = None,
    supplied: PaperDraft | None = None,
) -> None:
    http = HttpClient()
    try:
        paper = execute(
            Store(Settings(), http),
            upload_id=upload_id,
            source=source,
            arxiv=arxiv,
            paper_id=paper_id,
            instructions=instructions,
            supplied=supplied,
            work=Path(".work") / str(uuid4()),
        )
        typer.echo(f"论文已写入：{paper.id}；审核状态：{paper.status.review}")
    except Exception:
        typer.echo("论文处理失败，请检查运行记录或重试", err=True)
        raise typer.Exit(1) from None
    finally:
        http.close()
