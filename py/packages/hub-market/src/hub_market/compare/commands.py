"""M-1命令：离线原始录制现场复算或读取契约日文档。"""

import json
from datetime import date as Date
from pathlib import Path
from typing import Annotated

import typer

from hub_contracts import MarketDay, MarketDayWrite
from hub_core.config import load_config
from hub_market.compute.day import Computed, compute
from hub_market.compute.input import ComputeInput

from .load import recorded
from .report import report


def register(groups: dict[str, typer.Typer]) -> None:
    groups["market"].command("compare")(compare)


def repository() -> Path:
    for parent in Path(__file__).resolve().parents:
        if (parent / "tasks" / "graph.yaml").exists():
            return parent
    raise ValueError("找不到仓库数据目录")


def from_document(day: MarketDay) -> Computed:
    return Computed(
        inputs=ComputeInput(
            on=day.date,
            previous=day.previousDate,
            membership_as_of=day.directions.membershipAsOf if day.directions else day.date,
            tables={},
            indices=[],
            directions=[],
            themes=[],
            etf={},
        ),
        data_status=day.dataStatus,
        indices=day.indices,
        market=day.market,
        temperature=day.temperature,
        sentiment=day.sentiment,
        style=day.style,
        limit_ecology=day.limitEcology,
        moneyflow=day.moneyflow,
        industries=day.industries,
        themes=day.themes,
        directions=day.directions,
        etf_groups=day.etfGroups,
        segments=day.segments,
        stocks=day.stocks,
        technical=day.technical,
        summary=day.summary,
    )


def compare(
    date: str = typer.Argument(...), input: Annotated[Path | None, typer.Option("--input")] = None
) -> None:
    try:
        on = Date.fromisoformat(date)
        root = repository()
        if input is not None:
            raw = json.loads(input.read_text())
            if not isinstance(raw, dict):
                raise ValueError("输入必须是MarketDay或MarketDayWrite对象")
            day = (
                MarketDayWrite.model_validate(raw).day
                if "day" in raw
                else MarketDay.model_validate(raw)
            )
            if day.date != on:
                raise ValueError("输入文档日期与目标日期不一致")
            computed = from_document(day)
        else:
            computed = compute(
                recorded(root, on), load_config(root / "config" / "market_summary.yaml")
            )
        result = report(
            computed,
            json.loads((root / "fixtures" / "market" / f"close-analysis-{date}.json").read_text()),
        )
        typer.echo(json.dumps(result, ensure_ascii=False, indent=2))
        if not result["passed"]:
            raise typer.Exit(1)
    except typer.Exit:
        raise
    except (ValueError, OSError, KeyError) as error:
        typer.echo(f"市场对照失败：{error}", err=True)
        raise typer.Exit(2) from error
