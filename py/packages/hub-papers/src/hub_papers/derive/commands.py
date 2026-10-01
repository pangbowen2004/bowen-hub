"""全部论文经API读取；五份派生文档经内部API写入。"""

from pathlib import Path
from typing import Annotated
from urllib.parse import quote

import typer
from pydantic import TypeAdapter

from hub_contracts import Paper, PaperPage
from hub_core.api import ApiClient
from hub_core.http import HttpClient, SourceRequestError
from hub_core.settings import Settings
from hub_papers.derive import derive_documents
from hub_papers.pdf.config import load_derivation_config


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("derive")(derive)


def derive(
    input_file: Annotated[Path | None, typer.Option("--input", help="离线Paper数组JSON")] = None,
    output: Annotated[Path | None, typer.Option("--output", help="离线派生目录；不会写API")] = None,
) -> None:
    try:
        if input_file is not None:
            if output is None:
                raise ValueError("离线模式必须提供--output")
            papers = TypeAdapter(list[Paper]).validate_json(input_file.read_text(encoding="utf-8"))
            spaces, aliases = load_derivation_config()
            documents = derive_documents(papers, spaces, aliases)
            output.mkdir(parents=True, exist_ok=True)
            for key, document in documents.items():
                (output / f"{key}.json").write_text(
                    document.model_dump_json(exclude_none=True), encoding="utf-8"
                )
        else:
            if output is not None:
                raise ValueError("--output仅用于--input离线模式")
            http = HttpClient()
            try:
                api = ApiClient(Settings(), http)
                papers: list[Paper] = []
                path = "/v1/papers?limit=100"
                seen: set[str] = set()
                while True:
                    page = api.get(path, PaperPage)
                    papers.extend(
                        api.get("/v1/papers/" + quote(item.id, safe=""), Paper)
                        for item in page.items
                    )
                    if page.nextCursor is None:
                        break
                    if page.nextCursor in seen:
                        raise ValueError("API分页游标重复")
                    seen.add(page.nextCursor)
                    path = "/v1/papers?limit=100&cursor=" + quote(page.nextCursor, safe="")
                spaces, aliases = load_derivation_config()
                documents = derive_documents(papers, spaces, aliases)
                for key, document in documents.items():
                    api.put("/v1/internal/documents/" + quote(key, safe=""), document)
            finally:
                http.close()
        typer.echo(f"论文派生成功：5份文档，{len(papers)}篇论文")
    except OSError, ValueError, SourceRequestError:
        typer.echo("论文派生失败：输入、配置或API数据不符合要求", err=True)
        raise typer.Exit(1) from None
