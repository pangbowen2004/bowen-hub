"""本地草稿或API已有论文的中文校验入口。"""

import json
from pathlib import Path
from typing import Annotated
from urllib.parse import quote

import typer

from hub_core.http import HttpClient, SourceRequestError
from hub_core.settings import Settings
from hub_papers.check import check_draft
from hub_papers.pdf.config import load_rules
from hub_papers.pdf.files import read_pages


def register(groups: dict[str, typer.Typer]) -> None:
    groups["papers"].command("check")(check)


def check(
    id_or_file: str = typer.Argument(...),
    pages: Annotated[
        Path | None, typer.Option("--pages", help="草稿对应pages.jsonl，默认取同目录")
    ] = None,
) -> None:
    path = Path(id_or_file)
    try:
        if path.is_file():
            value = json.loads(path.read_text(encoding="utf-8"))
            text = read_pages(pages or path.parent / "pages.jsonl")
        else:
            # 既有论文用于重写草稿检查；老迁移文档不冒充新草稿。
            settings = Settings()
            if settings.hub_service_token is None:
                raise ValueError("文件不存在，或缺少API服务令牌")
            http = HttpClient()
            try:
                headers = {
                    "Authorization": "Bearer " + settings.hub_service_token.get_secret_value()
                }
                base = settings.hub_api_url.rstrip("/") + "/v1/papers/" + quote(id_or_file, safe="")
                value = http.request("GET", base, source="hub-api", headers=headers).json()
                if pages is None:
                    raise ValueError("校验API论文需提供对应本地--pages页文本")
                text = read_pages(pages)
            finally:
                http.close()
        result = check_draft(value, text, load_rules())
        if not result.valid:
            for error in result.errors:
                typer.echo(error, err=True)
            raise typer.Exit(1)
        typer.echo("论文草稿校验通过")
    except typer.Exit:
        raise
    except OSError, ValueError, SourceRequestError:
        typer.echo("校验失败：草稿、页文本或API输入缺失或格式不正确", err=True)
        raise typer.Exit(1) from None
