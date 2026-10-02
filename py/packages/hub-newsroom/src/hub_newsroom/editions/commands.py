"""三版发行CLI；只读取进程环境，错误不展示供应商原始正文。"""

import asyncio
import os
from datetime import date as Date
from pathlib import Path

import typer
from pydantic import BaseModel

from hub_ai.gateway import GatewayAdapter
from hub_ai.registry import Registry, find_root
from hub_ai.runtime import Request, Response, Runtime, TransportError
from hub_core.calendar import NyseCalendar
from hub_core.config import load_config
from hub_core.http import HttpClient
from hub_core.mail import Mailer
from hub_core.settings import Settings
from hub_newsroom.common.settings import parse_settings
from hub_newsroom.pipeline.windows import EditionKind
from hub_providers.common.config import sources_config

from .collect import Collector
from .repository import NewsApi, Repository
from .service import Options, PublicationError, Publisher


class EmailOptions(BaseModel):
    fromName: str
    subjects: dict[str, str]


class UnavailableAdapter:
    async def generate(self, request: Request) -> Response:
        raise TransportError("模型凭据未配置")


def register(groups: dict[str, typer.Typer]) -> None:
    groups["news"].command("morning")(morning)
    groups["news"].command("premarket")(premarket)
    groups["news"].command("weekly")(weekly)


def morning(
    date: str | None = None, no_email: bool = False, no_ai: bool = False, force: bool = False
) -> None:
    execute("morning", date, no_email, no_ai, force)


def premarket(
    date: str | None = None,
    no_email: bool = False,
    no_ai: bool = False,
    force: bool = False,
    ignore_window: bool = False,
) -> None:
    execute("premarket", date, no_email, no_ai, force, ignore_window)


def weekly(
    date: str | None = None, no_email: bool = False, no_ai: bool = False, force: bool = False
) -> None:
    execute("weekly", date, no_email, no_ai, force)


def create_publisher(
    root: Path, environment: Settings, api_http: HttpClient, source_http: HttpClient, *, no_ai: bool
) -> Publisher:
    newsroom = load_config(root / "config/newsroom.yaml")
    keywords = load_config(root / "config/news_keywords.yaml")
    catalogue = load_config(root / "config/news_sources.yaml")
    settings = parse_settings(newsroom, keywords, catalogue)
    email = EmailOptions.model_validate(newsroom["email"])
    calendar = NyseCalendar()
    runtime = None
    if not no_ai:
        registry = Registry(root)
        adapter = (
            GatewayAdapter(registry, environment)
            if environment.openai_api_key and environment.cloudflare_account_id
            else UnavailableAdapter()
        )
        runtime = Runtime(registry, adapter)
    repository = os.getenv("GITHUB_REPOSITORY", "")
    run_id = os.getenv("GITHUB_RUN_ID", "")
    actions = (
        os.getenv("GITHUB_SERVER_URL", "https://github.com")
        + "/"
        + repository
        + "/actions/runs/"
        + run_id
        if repository and run_id
        else "本机运行（无 Actions 链接）"
    )
    return Publisher(
        settings,
        Repository(NewsApi(environment, api_http)),
        Collector(environment, settings, sources_config(catalogue), source_http, calendar),
        calendar,
        Mailer(environment, from_name=email.fromName),
        runtime=runtime,
        source_limit=int(newsroom["thresholds"]["tickerSources"]["max"]),
        subjects=email.subjects,
        console_url="https://bowen-console.pages.dev",
        actions_url=actions,
        run_suffix=(os.getenv("GITHUB_RUN_ID", "") + "-" + os.getenv("GITHUB_RUN_ATTEMPT", "1"))
        if os.getenv("GITHUB_RUN_ID")
        else None,
    )


def execute(
    kind: EditionKind,
    day: str | None,
    no_email: bool,
    no_ai: bool,
    force: bool,
    ignore_window: bool = False,
) -> None:
    api_http: HttpClient | None = None
    source_http: HttpClient | None = None
    try:
        options = Options(
            kind=kind,
            date=Date.fromisoformat(day) if day else None,
            no_email=no_email,
            no_ai=no_ai,
            force=force,
            ignore_window=ignore_window,
        )
        # 环境配置不读.env；--help不运行此路径。
        environment = Settings()
        api_http, source_http = HttpClient(), HttpClient()
        publisher = create_publisher(find_root(), environment, api_http, source_http, no_ai=no_ai)
        outcome = asyncio.run(publisher.publish(options))
        if outcome.skipped:
            typer.echo("已跳过：" + outcome.skipped)
        else:
            typer.echo(
                f"已归档 {outcome.edition.id if outcome.edition else ''}；正文 {outcome.mail.body_chars if outcome.mail else 0} 字；"
                + ("SMTP成功" if outcome.sent else "未发送邮件")
            )
    except Exception as error:
        typer.echo(
            str(error)
            if isinstance(error, PublicationError)
            else f"发行未完成（{type(error).__name__}）",
            err=True,
        )
        raise typer.Exit(1) from None
    finally:
        if api_http:
            api_http.close()
        if source_http:
            source_http.close()
