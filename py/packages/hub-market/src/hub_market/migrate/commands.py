"""老市场数据迁移命令：market-ledger（老假设账本）、market-events（事件日历）。

只读老数据文件；写入只经过服务令牌 API，全部按自然键覆盖，可以重复运行。
`--dry-run` 只读、转换、用契约校验并打印统计，不联网；`--verify` 只读 API 逐项核对。
"""

from collections.abc import Callable, Generator
from contextlib import closing, contextmanager
from datetime import date, datetime, time
from pathlib import Path
from typing import Annotated
from zoneinfo import ZoneInfo

import typer

from hub_core.config import load_config
from hub_core.http import HttpClient, SourceRequestError
from hub_core.protocols import TradingCalendar
from hub_core.settings import Settings
from hub_market.eod.repository import MarketApi, Repository
from hub_providers.tushare import SseCalendar, TushareSource

from .errors import MigrationError
from .events import convert_events, event_lines, read_calendar
from .history import verify_history
from .ledger import convert_ledger, ledger_lines, read_ledger
from .transfer import BATCH, Check, verify_events, verify_ledger, write_events, write_ledger

# docs/06 第 2、4 节：老账本 61 条、事件日历 79 条。数量不对说明老数据变了，先停下来问编排者。
EXPECTED_HYPOTHESES = 61
EXPECTED_EVENTS = 79
SHANGHAI = ZoneInfo("Asia/Shanghai")


def register(groups: dict[str, typer.Typer]) -> None:
    groups["migrate"].command("market-ledger")(market_ledger)
    groups["migrate"].command("market-events")(market_events)


def repository() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "tasks" / "graph.yaml").exists():
            return parent
    raise MigrationError("找不到仓库配置目录")


def clock() -> datetime:
    return datetime.now(SHANGHAI)


@contextmanager
def calendar_for(settings: Settings, root: Path) -> Generator[TradingCalendar]:
    """真实 SSE 交易日历（TuShare trade_cal，走本地缓存）；测试里替换成假日历。"""
    if settings.tushare_token is None:
        raise MigrationError(
            "缺少 TUSHARE_TOKEN：历史核对要用交易日历（只核对账本时可加 --no-history）"
        )
    config = load_config(root / "config/market.yaml")
    source = TushareSource(
        settings.tushare_token.get_secret_value(),
        cache_dir=root / config["cacheDir"],
        concurrency=config["run"]["concurrency"],
        retries=config["run"]["retries"],
    )
    try:
        yield SseCalendar(source)
    finally:
        source.close()


def guarded(label: str, action: Callable[[], None]) -> None:
    """失败只展示类别或已审过的短说明，不展示老数据正文、URL、请求头或凭据。"""
    try:
        action()
    except typer.Exit:
        raise
    except (MigrationError, SourceRequestError) as error:
        typer.echo(f"{label}失败：{error}", err=True)
        raise typer.Exit(1) from None
    except Exception as error:
        typer.echo(f"{label}失败：{type(error).__name__}", err=True)
        raise typer.Exit(1) from None


def exclusive(dry_run: bool, verify: bool) -> None:
    if dry_run and verify:
        raise MigrationError("--dry-run 与 --verify 不能同时使用：前者不联网，后者只读 API")


def source_file(settings: Settings, override: Path | None, relative: str) -> Path:
    if override is not None:
        return override
    if settings.legacy_market_dir is None:
        raise MigrationError("缺少 LEGACY_MARKET_DIR（或用 --source 指定文件）")
    return settings.legacy_market_dir / "data" / relative


def market_api(settings: Settings, http: HttpClient) -> MarketApi:
    if settings.hub_service_token is None or not settings.hub_service_token.get_secret_value():
        raise MigrationError("缺少 HUB_SERVICE_TOKEN")
    return MarketApi(settings, http)


def report(check: Check) -> None:
    for line in check.lines:
        typer.echo(line)
    for message in check.differences:
        typer.echo(message)
    typer.echo(f"核对差异：{len(check.differences)}项")
    if check.differences:
        raise typer.Exit(1)


def parse_through(value: str | None) -> date | None:
    if value is None:
        return None
    try:
        return date.fromisoformat(value)
    except ValueError:
        raise MigrationError("--through 的日期格式应为 YYYY-MM-DD") from None


def latest_closed_session(
    calendar: TradingCalendar, start: date, now: datetime, deadline: time
) -> date:
    """最近一个交易日；今天是交易日但还没到收盘任务截止时间，就算上一个。"""
    local = now.astimezone(SHANGHAI)
    sessions = list(calendar.sessions(start, local.date()))
    if sessions and sessions[-1] == local.date() and local.time() < deadline:
        sessions = sessions[:-1]
    if not sessions:
        raise MigrationError("还没有可核对的交易日")
    return sessions[-1]


def market_ledger(
    dry_run: bool = False,
    verify: bool = False,
    source: Annotated[
        Path | None,
        typer.Option(
            help="老账本 ledger.json；默认读 LEGACY_MARKET_DIR/data/hypotheses/ledger.json"
        ),
    ] = None,
    history: Annotated[
        bool,
        typer.Option(help="--verify 时同时核对补跑后的历史：MarketDay 覆盖、周报、到期假设已结算"),
    ] = True,
    through: Annotated[
        str | None,
        typer.Option(help="历史核对截止的交易日（YYYY-MM-DD）；默认最近一个已收盘的交易日"),
    ] = None,
) -> None:
    def action() -> None:
        exclusive(dry_run, verify)
        settings = Settings()
        end = parse_through(through)
        plan = convert_ledger(read_ledger(source_file(settings, source, "hypotheses/ledger.json")))
        for line in ledger_lines(plan):
            typer.echo(line)
        if len(plan.hypotheses) != EXPECTED_HYPOTHESES:
            raise MigrationError(
                f"老账本应为{EXPECTED_HYPOTHESES}条，实际{len(plan.hypotheses)}条；老数据有变化，先问编排者"
            )
        if dry_run:
            typer.echo("试运行通过：只读了老账本并用契约校验，没有发送 API 请求")
            return
        root = repository()
        with closing(HttpClient()) as http:
            store = Repository(market_api(settings, http))
            if not verify:
                written = write_ledger(store, plan)
                typer.echo(
                    f"账本已写入 API：{written}条（每批{BATCH}条，按 ID 覆盖；"
                    "已结算的记录由 API 保留原结果）"
                )
                return
            check = verify_ledger(store, plan)
            if history:
                config = load_config(root / "config/market.yaml")
                start = date.fromisoformat(config["backfill"]["defaultStart"])
                with calendar_for(settings, root) as calendar:
                    last = end or latest_closed_session(
                        calendar, start, clock(), time.fromisoformat(config["run"]["deadline"])
                    )
                    more = verify_history(store, calendar, start=start, through=last)
                check.lines.extend(more.lines)
                check.differences.extend(more.differences)
            report(check)

    guarded("账本迁移", action)


def market_events(
    dry_run: bool = False,
    verify: bool = False,
    source: Annotated[
        Path | None,
        typer.Option(
            help="老事件日历 calendar.json；默认读 LEGACY_MARKET_DIR/data/events/calendar.json"
        ),
    ] = None,
) -> None:
    def action() -> None:
        exclusive(dry_run, verify)
        settings = Settings()
        plan = convert_events(read_calendar(source_file(settings, source, "events/calendar.json")))
        for line in event_lines(plan):
            typer.echo(line)
        if len(plan.events) != EXPECTED_EVENTS:
            raise MigrationError(
                f"老事件日历应为{EXPECTED_EVENTS}条，实际{len(plan.events)}条；老数据有变化，先问编排者"
            )
        if dry_run:
            typer.echo("试运行通过：只读了老事件日历并用契约校验，没有发送 API 请求")
            return
        with closing(HttpClient()) as http:
            api = market_api(settings, http)
            if verify:
                report(verify_events(api, plan))
                return
            written = write_events(api, plan)
            typer.echo(f"事件已写入 API：{written}条（每批{BATCH}条，按 ID 覆盖）")

    guarded("事件迁移", action)
