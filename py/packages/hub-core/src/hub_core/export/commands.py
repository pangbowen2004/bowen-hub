"""数据导出命令；环境和 IO 仅在调用时加载。"""

from datetime import datetime
from pathlib import Path
from typing import Annotated
from zoneinfo import ZoneInfo

import typer

from hub_core.api import ApiClient
from hub_core.config import load_config
from hub_core.export.pipeline import GitRepository, run_export
from hub_core.http import HttpClient
from hub_core.mail import Mailer
from hub_core.settings import Settings


def register(groups: dict[str, typer.Typer]) -> None:
    groups["export"].callback(invoke_without_command=True)(export)


def export(
    directory: Annotated[Path, typer.Option(help="已经检出的私有数据仓库目录")],
    date: Annotated[str | None, typer.Option(help="业务日期 YYYY-MM-DD，默认新加坡今天")] = None,
    force: bool = False,
    root: Path = Path("."),
) -> None:
    from datetime import date as Date
    from os import environ

    try:
        business_date = (
            Date.fromisoformat(date) if date else datetime.now(ZoneInfo("Asia/Singapore")).date()
        )
        if not (directory / ".git").exists():
            raise ValueError("数据目录必须是已经检出的 git 仓库")
        settings = Settings()
        http = HttpClient()
        try:
            api = ApiClient(settings, http)
            result = run_export(
                api,
                GitRepository(directory, settings.gh_automation_token),
                directory,
                Mailer(settings),
                business_date=business_date,
                force=force,
                budget=float(load_config(root / "config/llm.yaml")["monthlyBudgetUsd"]),
                actions_url=environ.get("GITHUB_SERVER_URL", "https://github.com")
                + "/"
                + environ.get("GITHUB_REPOSITORY", "")
                + "/actions/runs/"
                + environ.get("GITHUB_RUN_ID", ""),
            )
        finally:
            http.close()
        typer.echo(
            f"数据导出已提交到远端：{business_date}。"
            if result is not None
            else f"{business_date} 已成功导出；如需重跑请加 --force。"
        )
    except Exception:
        # 外部异常可能携带远端 URL 或请求正文，只给固定摘要。
        typer.echo("数据导出失败；未确认提交成功时不会清理数据库。", err=True)
        raise typer.Exit(1) from None
