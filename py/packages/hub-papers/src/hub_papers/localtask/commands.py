"""本机任务不启动Agent；提交只替代作者步骤，仍校验、审核并经API写入。"""

import json
import re
import shutil
from pathlib import Path
from typing import Annotated
from urllib.parse import quote
from uuid import uuid4

import typer

from hub_contracts import Paper, PaperDraft
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_papers.excerpt import pages_text, parse_pages
from hub_papers.ids import identify
from hub_papers.ingest.cli import run_pipeline
from hub_papers.ingest.pipeline import Store
from hub_papers.pdf import extract_pdf
from hub_papers.pdf.config import config_root


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("task")(task)
    groups["papers"].command("submit")(submit)


def task(id: str | None = typer.Argument(None), file: Path | None = None) -> None:
    if (id is None) == (file is None):
        raise typer.BadParameter("论文ID和--file必须且只能指定一项")
    http = HttpClient()
    try:
        work = Path(".work") / str(uuid4())
        work.mkdir(parents=True)
        metadata = None
        if file is not None:
            shutil.copyfile(file, work / "source.pdf")
            pages = extract_pdf(work / "source.pdf", work)
            identity = identify(pages)
            identifier = identity.base_id if identity else "待定"
        else:
            assert id is not None
            store = Store(Settings(), http)
            base = "/v1/papers/" + quote(id, safe="")
            paper = store.api.get(base, Paper)
            metadata = paper.meta.model_dump(mode="json")
            raw = store.read(base + "/pages.jsonl")
            (work / "pages.jsonl").write_bytes(raw)
            pages = parse_pages(raw.decode("utf-8"))
            (work / "source.pdf").write_bytes(store.read(base + "/source.pdf"))
            identifier = id
        if identifier != "待定":
            if not re.fullmatch(r"[a-z0-9][a-z0-9._-]*", identifier):
                raise ValueError("论文ID不能用作本机目录名")
            target = Path(".work") / identifier
            shutil.copytree(work, target, dirs_exist_ok=True)
            shutil.rmtree(work)
            work = target
        prompt = (config_root().parent / "prompts/paper_author.md").read_text()
        text = (
            prompt
            + "\n\n## 本次任务真实材料\n\n论文ID："
            + identifier
            + "\n已知元数据："
            + json.dumps(metadata, ensure_ascii=False)
            + "\n请把完整PaperDraft JSON保存为本目录draft.json，不生成审核记录。\n\n"
            + pages_text(pages, numbered=True)
        )
        (work / "TASK.md").write_text(text, encoding="utf-8")
        typer.echo(str(work / "TASK.md"))
    except Exception:
        typer.echo("本机论文任务生成失败", err=True)
        raise typer.Exit(1) from None
    finally:
        http.close()


def submit(
    id_or_draft: str = typer.Argument(...),
    draft: Annotated[Path | None, typer.Argument()] = None,
    file: Path | None = None,
) -> None:
    if (draft is None) == (file is None):
        raise typer.BadParameter("使用submit <id> <草稿>或submit --file <PDF> <草稿>")
    try:
        supplied = PaperDraft.model_validate_json((draft or Path(id_or_draft)).read_text())
    except Exception:
        typer.echo("草稿文件不符合PaperDraft契约", err=True)
        raise typer.Exit(1) from None
    run_pipeline(
        source=file, paper_id=id_or_draft if draft is not None else None, supplied=supplied
    )
