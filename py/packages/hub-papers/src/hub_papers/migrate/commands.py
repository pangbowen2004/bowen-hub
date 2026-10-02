"""论文迁移：只读来源，契约校验，API覆盖写入。"""

import json
from datetime import datetime
from pathlib import Path
from typing import Annotated
from zoneinfo import ZoneInfo

import typer

from hub_core.http import HttpClient, SourceRequestError
from hub_core.settings import Settings

from .io import MigrationApi, read_plan


def register(groups: dict[str, typer.Typer]) -> None:
    groups["migrate"].command("papers")(migrate)


def migrate(
    dry_run: bool = False,
    verify: bool = False,
    source: Annotated[Path | None, typer.Option(help="老科研根目录；默认LEGACY_PAPERS_DIR")] = None,
    baseline: Annotated[Path | None, typer.Option(help="公开paper_ids基线文件")] = None,
    graph: Annotated[Path | None, typer.Option(help="自动研究图谱YAML")] = None,
    report: Annotated[Path | None, typer.Option(help="将统计和键扫描另存JSON（无原文）")] = None,
) -> None:
    try:
        if dry_run and verify:
            raise ValueError("--dry-run与--verify不能同时使用")
        settings = Settings()
        root = source or settings.legacy_papers_dir
        if root is None:
            raise ValueError("需要--source或LEGACY_PAPERS_DIR")
        plan = read_plan(
            root,
            baseline or root / "docs/paper-public-baseline.json",
            graph or root / "论文阅读/04-跨论文综合/自动研究图谱.yml",
            today=datetime.now(ZoneInfo("Asia/Singapore")).date(),
        )
        stats = plan.report()
        typer.echo(json.dumps(stats, ensure_ascii=False, indent=2))
        if report:
            report.write_text(
                json.dumps(stats, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
            )
        if dry_run:
            typer.echo("论文迁移预检完成：只读来源，未写API；PDF缺失见统计")
            return
        if (
            len(plan.items) != 89
            or stats["public"] != 19
            or stats["evidence"] != 88
            or stats["pdf"] != 88
            or stats["article"] != 88
        ):
            raise ValueError("正式迁移/核对需要89篇、19公开、88证据、88PDF完整来源")
        http = HttpClient()
        try:
            api = MigrationApi(settings, http)
            if verify:
                api.verify(plan)
                typer.echo("API论文、私人内容、PDF、页文本、页图及公开目录核对通过")
                return
            api.write(plan)
        finally:
            http.close()
        typer.echo("论文迁移与派生写入完成；请执行hub migrate papers --verify")
    except (OSError, ValueError, SourceRequestError) as error:
        typer.echo(
            "论文迁移失败：" + str(error)
            if not isinstance(error, ValueError)
            else "论文迁移失败：来源、契约或统计不符合要求",
            err=True,
        )
        raise typer.Exit(1) from None
