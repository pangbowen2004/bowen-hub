"""完整 docs09 命令表；用 entry point 安装结果，不直接注册替身。"""

import re
from importlib.metadata import entry_points

import pytest
from typer.testing import CliRunner

from hub_cli.main import GROUPS, create_app

CASES: list[tuple[list[str], str]] = (
    [(["news", name], "T13") for name in ["morning", "premarket", "weekly"]]
    + [
        (["news", "sources", "--check"], "T10"),
        (["market", "eod"], "T23"),
        (["market", "backfill", "--start", "2026-07-01", "--end", "2026-09-30"], "T23"),
        (["market", "compare", "2026-08-28"], "T21"),
        (["papers", "ingest", "upload-test"], "T31"),
        (["papers", "ingest", "--file", "test.pdf"], "T31"),
        (["papers", "ingest", "--arxiv", "https://arxiv.org/abs/test"], "T31"),
        (["papers", "revise", "test", "--instructions", "修改"], "T31"),
        (["papers", "check", "draft.json"], "T30"),
        (["papers", "task", "test"], "T31"),
        (["papers", "task", "--file", "test.pdf"], "T31"),
        (["papers", "submit", "test", "draft.json"], "T31"),
        (["papers", "submit", "--file", "test.pdf", "draft.json"], "T31"),
        (["papers", "derive"], "T30"),
        (["evals", "run", "--capability", "news.*", "--changed", "--offline"], "T04"),
        (["evals", "compare", "--candidate", "fake/model"], "T04"),
        (["evals", "harvest"], "T04"),
        (["providers", "check"], "T10/T20"),
        (["providers", "check-models"], "T04"),
        (["export"], "T42"),
    ]
    + [
        (["migrate", name, "--dry-run", "--verify"], task)
        for name, task in [
            ("papers", "T50"),
            ("news-legacy", "T16"),
            ("watchlist", "T16"),
            ("market-ledger", "T51"),
            ("market-events", "T51"),
        ]
    ]
)


@pytest.mark.parametrize(("args", "task"), CASES)
def test_command_help_and_placeholder(args: list[str], task: str) -> None:
    runner = CliRunner()
    app = create_app()
    help_result = runner.invoke(app, [*args, "--help"])
    assert help_result.exit_code == 0, help_result.output
    assert "Usage:" in help_result.output
    if task in {
        "T04",
        "T10",
        "T10/T20",
        "T30",
        "T21",
        "T13",
        "T23",
        "T31",
        "T42",
        "T50",
        "T51",
    } or (task == "T16" and args[:2] in (["migrate", "news-legacy"], ["migrate", "watchlist"])):
        # 已实现命令在这里验证帮助入口；领域测试负责真实退出码与离线行为。
        return
    result = runner.invoke(app, args)
    assert result.exit_code == 2, result.output
    assert f"任务 {task}" in result.output


@pytest.mark.parametrize("name", ["market-ledger", "market-events"])
def test_market_migrations_are_real_commands(name: str) -> None:
    runner = CliRunner()
    app = create_app()
    help_result = runner.invoke(app, ["migrate", name, "--help"])
    assert help_result.exit_code == 0, help_result.output
    # Rich 在强制着色的终端里可能把选项名拆开，先去掉 ANSI 样式再断言。
    plain = re.sub(r"\x1b\[[0-9;]*m", "", help_result.output)
    for option in ("--dry-run", "--verify", "--source"):
        assert option in plain
    assert "尚未实现" not in plain
    # 真实行为：--dry-run 与 --verify 互斥，先于读取环境、老数据和任何网络访问就退出 1。
    both = runner.invoke(app, ["migrate", name, "--dry-run", "--verify"])
    assert both.exit_code == 1, both.output
    assert "不能同时使用" in both.output
    assert "任务 T51" not in both.output


@pytest.mark.parametrize("group", [None, *GROUPS])
def test_group_help(group: str | None) -> None:
    result = CliRunner().invoke(create_app(), ["--help"] if group is None else [group, "--help"])
    assert result.exit_code == 0
    if group is None:
        assert all(name in result.output for name in GROUPS)


def test_entry_points_are_independent() -> None:
    values = {entry.value for entry in entry_points(group="hub.commands")}
    assert "hub_core.export.commands:register" in values
    assert "hub_papers.check.commands:register" in values
    assert "hub_market.eod.commands:register" in values
    assert "hub_ai.commands:register" in values
