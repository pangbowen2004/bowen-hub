"""新闻与自选股迁移；只读旧数据，写入唯一API。"""

from contextlib import closing
from pathlib import Path

import typer
from pydantic import BaseModel

from hub_contracts import WatchItem
from hub_core.api import ApiClient
from hub_core.config import load_config
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_newsroom.common.settings import SourceCatalogue

from .errors import MigrationError
from .legacy import convert, read_archive
from .transfer import seed_watchlist, verify_news, verify_watchlist, write_news


class WatchConfig(BaseModel):
    items: list[dict[str, object]]


def read_watchlist(path: Path) -> tuple[list[WatchItem], list[str]]:
    rows = WatchConfig.model_validate(load_config(path)).items
    items = [
        WatchItem.model_validate(
            {
                **row,
                "underlying": row.get("underlying"),
                "sectorEtf": row.get("sectorEtf"),
                "aliases": row.get("aliases", []),
                "active": row.get("active", True),
            }
        )
        for row in rows
    ]
    if len({item.symbol for item in items}) != len(items):
        raise MigrationError("初始自选股代码重复")
    pending = [str(row["symbol"]) for row in rows if row.get("verify") is True]
    return items, pending


def config_dir(value: Path | None) -> Path:
    return value if value is not None else Path(__file__).resolve().parents[6] / "config"


def print_differences(differences: list[str]) -> None:
    for message in differences:
        typer.echo(message)
    typer.echo(f"核对差异：{len(differences)}项")
    if differences:
        raise typer.Exit(1)


def news_legacy(dry_run: bool = False, verify: bool = False, config: Path | None = None) -> None:
    try:
        if dry_run and verify:
            raise MigrationError("--dry-run与--verify不能同时使用：前者不联网，后者只读API")
        settings = Settings()
        if settings.legacy_news_dir is None:
            raise MigrationError("缺少LEGACY_NEWS_DIR")
        catalogue = SourceCatalogue.model_validate(
            load_config(config_dir(config) / "news_sources.yaml")
        )
        plan = convert(
            read_archive(settings.legacy_news_dir / "archive/items.jsonl"), catalogue.sources
        )
        typer.echo(
            f"新闻转换：{len(plan.editions)}期，实际要闻{plan.item_count}条，去重文章{len(plan.articles)}篇"
        )
        typer.echo(f"旧模式：{plan.modes}；无时区timestamp：{plan.timestamps_without_zone}期")
        typer.echo("generatedAt/模型出处保持null；mode不对应新业务字段，timestamp不推定时区")
        typer.echo(f"未知来源映射legacy：{plan.unknown_sources}")
        if dry_run:
            typer.echo("试运行通过：未读取密钥文件，未发送API请求")
            return
        with closing(HttpClient()) as http:
            api = ApiClient(settings, http)
            if verify:
                print_differences(verify_news(api, plan))
            else:
                write_news(api, plan)
                typer.echo("新闻API导入完成")
    except typer.Exit:
        raise
    except Exception as error:
        # 不展示模型输入、HTTP正文或带凭据URL；问题通过类别与数据核对统计追踪。
        typer.echo(
            f"新闻迁移失败：{str(error) if isinstance(error, MigrationError) else type(error).__name__}",
            err=True,
        )
        raise typer.Exit(1) from None


def watchlist(dry_run: bool = False, verify: bool = False, config: Path | None = None) -> None:
    try:
        if dry_run and verify:
            raise MigrationError("--dry-run与--verify不能同时使用：前者不联网，后者只读API")
        items, pending = read_watchlist(config_dir(config) / "us_watchlist.yaml")
        typer.echo(f"自选股转换：{len(items)}条；代码尚待核实：{', '.join(pending) or '无'}")
        if dry_run:
            typer.echo("试运行通过：未发送API请求，未判定或剔除未经核实的代码")
            return
        with closing(HttpClient()) as http:
            api = ApiClient(Settings(), http)
            if verify:
                print_differences(verify_watchlist(api, items))
            elif seed_watchlist(api, items):
                typer.echo("自选股空表初值导入完成")
            else:
                typer.echo("自选股表非空，已跳过；保留控制台维护资料")
    except typer.Exit:
        raise
    except Exception as error:
        typer.echo(
            f"自选股迁移失败：{str(error) if isinstance(error, MigrationError) else type(error).__name__}",
            err=True,
        )
        raise typer.Exit(1) from None


def register(groups: dict[str, typer.Typer]) -> None:
    groups["migrate"].command("news-legacy")(news_legacy)
    groups["migrate"].command("watchlist")(watchlist)
