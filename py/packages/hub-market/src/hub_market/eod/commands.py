"""T23收盘与回填命令：Settings只读进程环境，所有外部验收由根注入。"""

import os
import re
import subprocess
from datetime import date as Date
from datetime import datetime, time
from pathlib import Path
from typing import Annotated

import typer

from hub_core.config import load_config
from hub_core.http import HttpClient
from hub_core.mail import Mailer
from hub_core.settings import Settings
from hub_providers.tushare import SseCalendar, TushareSource, collect
from hub_providers.tushare.collection import Collection

from .repository import MarketApi, Repository
from .service import SHANGHAI, Eod, MarketJobError


class Collector:
    def __init__(self, root: Path, source: TushareSource) -> None:
        self.root = root
        self.source = source

    def collect(self, on: Date) -> Collection:
        return collect(self.source, self.root / "config", on)


def repository() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "tasks/graph.yaml").exists():
            return parent
    raise ValueError("找不到仓库配置目录")


def create(
    root: Path,
    environment: Settings,
    *,
    warmup_cache: Path | None = None,
    dispatch_enabled: bool = True,
) -> tuple[Eod, TushareSource, HttpClient]:
    if environment.tushare_token is None:
        raise ValueError("缺少 TUSHARE_TOKEN")
    config = load_config(root / "config/market.yaml")
    source = TushareSource(
        environment.tushare_token.get_secret_value(),
        cache_dir=root / config["cacheDir"],
        concurrency=config["run"]["concurrency"],
        retries=config["run"]["retries"],
    )
    http = HttpClient()
    try:
        store = Repository(MarketApi(environment, http))
        repo = os.getenv("GITHUB_REPOSITORY") or os.getenv("GITHUB_REPO")
        run_id = os.getenv("GITHUB_RUN_ID")
        actions = (
            f"{os.getenv('GITHUB_SERVER_URL', 'https://github.com')}/{repo}/actions/runs/{run_id}"
            if repo and run_id
            else "本机运行（无 Actions 链接）"
        )

        def dispatch(on: Date) -> None:
            if not dispatch_enabled:
                return
            if not environment.gh_automation_token or not repo:
                raise MarketJobError(
                    "缺少 GitHub 派发配置；数据可能已写入，补配置后使用 --force 重跑"
                )
            http.request(
                "POST",
                f"https://api.github.com/repos/{repo}/dispatches",
                source="github-dispatch",
                retry=False,
                headers={
                    "Authorization": "Bearer " + environment.gh_automation_token.get_secret_value(),
                    "Accept": "application/vnd.github+json",
                    "X-GitHub-Api-Version": "2022-11-28",
                },
                json={"event_type": "markets-updated", "client_payload": {"date": str(on)}},
            )

        stamp = subprocess.run(
            ["git", "-C", str(root), "rev-parse", "HEAD"],
            capture_output=True,
            text=True,
            check=True,
        ).stdout.strip()
        return (
            Eod(
                root,
                store,
                Collector(root, source),
                SseCalendar(source),
                dispatch,
                Mailer(environment, from_name="A 股观测台"),
                actions_url=actions,
                run_suffix=f"{run_id}-{os.getenv('GITHUB_RUN_ATTEMPT', '1')}" if run_id else None,
                source_version=stamp,
                warmup_cache=warmup_cache,
            ),
            source,
            http,
        )
    except Exception:
        source.close()
        http.close()
        raise


def register(groups: dict[str, typer.Typer]) -> None:
    groups["market"].command("eod")(eod)
    groups["market"].command("backfill")(backfill)


def eod(
    date: str | None = None,
    force: bool = False,
    deadline: str = "22:00",
    dry_run: Path | None = None,
    warmup_cache: Annotated[
        Path | None, typer.Option(help="缺历史摘要时，真实预热输入缓存目录")
    ] = None,
) -> None:
    resources: tuple[Eod, TushareSource, HttpClient] | None = None
    try:
        on = Date.fromisoformat(date) if date else datetime.now(SHANGHAI).date()
        if not re.fullmatch(r"\d{2}:\d{2}", deadline):
            raise ValueError("截止时间格式无效")
        end = time.fromisoformat(deadline)
        resources = create(repository(), Settings(), warmup_cache=warmup_cache)
        result = resources[0].run(on, force=force, deadline=end, dry_run=dry_run)
        typer.echo(result.status + (f"：{on}" if result.document else ""))
    except Exception as error:
        typer.echo(
            str(error)
            if isinstance(error, MarketJobError)
            else f"收盘失败（{type(error).__name__}）",
            err=True,
        )
        raise typer.Exit(1) from None
    finally:
        if resources:
            resources[1].close()
            resources[2].close()


def backfill(
    start: str = typer.Option(...),
    end: str = typer.Option(...),
    warmup_cache: Path | None = None,
    force: Annotated[
        bool, typer.Option(help="重建已有完整日与周报；按日期顺序修复历史摘要")
    ] = False,
    dispatch: Annotated[
        bool,
        typer.Option(
            help="补跑结束后派发一次 markets-updated 触发网站部署；--no-dispatch 只写数据"
        ),
    ] = True,
) -> None:
    resources: tuple[Eod, TushareSource, HttpClient] | None = None
    try:
        first, last = Date.fromisoformat(start), Date.fromisoformat(end)
        if first > last:
            raise ValueError("起止日期顺序无效")
        resources = create(
            repository(), Settings(), warmup_cache=warmup_cache, dispatch_enabled=dispatch
        )
        results = resources[0].backfill(first, last, force=force)
        typer.echo(
            f"回填处理 {len(results)} 个真实交易日；发布 {sum(value.published for value in results)} 日"
            + ("" if dispatch else "；未派发部署（--no-dispatch）")
        )
    except Exception as error:
        typer.echo(
            str(error)
            if isinstance(error, MarketJobError)
            else f"回填失败（{type(error).__name__}）",
            err=True,
        )
        raise typer.Exit(1) from None
    finally:
        if resources:
            resources[1].close()
            resources[2].close()
