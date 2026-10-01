"""来源检查和显式公共响应录制；不写 API，不读 dotenv。"""

import importlib
import json
from datetime import UTC, date, datetime
from pathlib import Path

import typer

from hub_contracts import NewsSourceHealth
from hub_core.settings import Settings
from hub_providers.common.checks import check_sources
from hub_providers.common.recording import Recorder


def register(groups: dict[str, typer.Typer]) -> None:
    groups["providers"].command("check")(check)
    groups["news"].command("sources")(sources)


def config_path(directory: Path | None) -> Path:
    if directory is not None:
        return directory
    for parent in (Path.cwd(), *Path.cwd().parents):
        if (parent / "config/news_sources.yaml").is_file():
            return parent / "config"
    raise typer.BadParameter("找不到配置目录，请传 --config-dir")


def execute(
    day: str | None, directory: Path | None, record: Path | None, include_disabled: bool
) -> list[NewsSourceHealth]:
    session = date.fromisoformat(day) if day else datetime.now(UTC).date()
    recorder = Recorder(record) if record else None
    records = check_sources(
        Settings(),
        config_path(directory),
        session,
        include_disabled=include_disabled,
        recorder=recorder,
    )
    for item in records:
        typer.echo(f"{item.id}: {item.status}" + (f"（{item.error}）" if item.error else ""))
    if recorder is not None:
        (recorder.directory / "manifest.json").write_text(
            json.dumps(
                {
                    "date": session.isoformat(),
                    "windowTimezone": "America/New_York",
                    "scope": "当天新闻/公告/内部人、当日日线和前一日、随后七日日程、RSS 当前可获得前 N 条",
                    "coverage": "RSS 无历史全日覆盖保证；失败或缺配置的源不假装录制成功",
                    "responses": recorder.count,
                    "health": [item.model_dump(mode="json") for item in records],
                },
                ensure_ascii=False,
                indent=2,
            ),
            encoding="utf-8",
        )
    return records


def check(
    date: str | None = None, config_dir: Path | None = None, record: Path | None = None
) -> None:
    records = execute(date, config_dir, record, False)
    # T20 约定入口；尚未接入时只明确提示，不冒充 TuShare 成功。
    module = importlib.import_module("hub_providers.tushare")
    if hasattr(module, "check_sources"):
        for item in module.check_sources(Settings()):
            typer.echo(f"{item.id}: {item.status}")
            if item.status == "failed":
                records.append(item)
    else:
        typer.echo("tushare: 未完成（任务 T20）")
    if any(item.status == "failed" for item in records):
        raise typer.Exit(1)


def sources(
    check: bool = False,
    date: str | None = None,
    config_dir: Path | None = None,
    record: Path | None = None,
    include_disabled: bool = False,
) -> None:
    if not check:
        typer.echo("使用 --check 检查来源可用性；不会写 API")
        return
    records = execute(date, config_dir, record, include_disabled)
    if any(item.status == "failed" for item in records):
        raise typer.Exit(1)
