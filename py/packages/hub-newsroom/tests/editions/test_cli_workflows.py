"""实际entry point CLI及三个工作流的有限接线。"""

from pathlib import Path

import pytest
import typer.rich_utils
import yaml
from click import unstyle
from typer.testing import CliRunner

from hub_cli.main import create_app
from hub_contracts import WatchItem
from hub_core.calendar import NyseCalendar
from hub_core.http import HttpClient
from hub_core.settings import Settings as EnvironmentSettings
from hub_newsroom.common.settings import Settings
from hub_newsroom.editions.service import Publisher
from hub_newsroom.pipeline.windows import EditionKind

from .helpers import ROOT
from .test_publish import publisher


@pytest.mark.parametrize("kind", ["morning", "premarket", "weekly"])
@pytest.mark.parametrize("colored_help", [False, True])
def test_installed_cli_runs_real_domain(
    kind: EditionKind,
    colored_help: bool,
    settings: Settings,
    calendar: NyseCalendar,
    watchlist: list[WatchItem],
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    service, store, _, transport = publisher(kind, settings, calendar, watchlist)

    def create(
        root: Path,
        environment: EnvironmentSettings,
        api_http: HttpClient,
        source_http: HttpClient,
        *,
        no_ai: bool,
    ) -> Publisher:
        assert no_ai
        return service

    monkeypatch.setattr("hub_newsroom.editions.commands.create_publisher", create)
    args = ["news", kind, "--no-ai", "--no-email"]
    monkeypatch.setattr(typer.rich_utils, "FORCE_TERMINAL", colored_help)
    monkeypatch.setattr(typer.rich_utils, "COLOR_SYSTEM", "standard" if colored_help else None)
    help_result = CliRunner().invoke(create_app(), [*args, "--help"], color=colored_help)
    assert help_result.exit_code == 0
    assert ("\x1b[" in help_result.output) == colored_help
    # CI Rich 帮助可在选项字符间插入 ANSI 样式，检查实际显示文字。
    help_text = unstyle(help_result.output)
    for flag in ("--date", "--no-email", "--no-ai", "--force"):
        assert flag in help_text
    assert ("--ignore-window" in help_text) == (kind == "premarket")
    actual = CliRunner().invoke(create_app(), args)
    assert actual.exit_code == 0, actual.output
    assert "已归档" in actual.output
    assert "未发送邮件" in actual.output
    assert store.runs[-1].status == "succeeded"
    assert not transport.messages
    invalid = CliRunner().invoke(create_app(), ["news", kind, "--date", "bad-secret-date"])
    assert invalid.exit_code == 1
    assert "bad-secret-date" not in invalid.output


@pytest.mark.parametrize(
    ("kind", "crons"),
    [
        ("morning", ["10 23 * * *", "40 23 * * *"]),
        ("premarket", ["40 12 * * 1-5", "40 13 * * 1-5"]),
    ],
)
def test_three_workflows_exact_cron_and_safe_argument_arrays(kind: str, crons: list[str]) -> None:
    content = (ROOT / f".github/workflows/news-{kind}.yml").read_text()
    # YAML1.1把on读作bool；明确用BaseLoader核查工作流键，不改变生产YAML。
    workflow = yaml.load(content, Loader=yaml.BaseLoader)
    assert [entry["cron"] for entry in workflow["on"]["schedule"]] == crons
    inputs = workflow["on"]["workflow_dispatch"]["inputs"]
    assert {"date", "force"}.issubset(inputs)
    assert ("ignore_window" in inputs) == (kind == "premarket")
    assert workflow["concurrency"]["cancel-in-progress"] == "false"
    steps = workflow["jobs"]["publish"]["steps"]
    assert steps[0]["with"]["ref"] == "main"
    run = next(step["run"] for step in steps if step.get("name", "").startswith("生成、归档并发送"))
    assert f"args=(news {kind})" in run
    assert '--date "$NEWS_DATE"' in run
    assert "${{ inputs." not in run
    assert '"${args[@]}"' in run
    assert any("mise run gen" in step.get("run", "") for step in steps)
    assert "HUB_SERVICE_TOKEN" in workflow["jobs"]["publish"]["env"]


def test_weekly_runs_with_monday_morning_and_has_no_separate_schedule() -> None:
    weekly = yaml.load(
        (ROOT / ".github/workflows/news-weekly.yml").read_text(), Loader=yaml.BaseLoader
    )
    assert "schedule" not in weekly["on"]
    assert "workflow_dispatch" in weekly["on"]
    morning = yaml.load(
        (ROOT / ".github/workflows/news-morning.yml").read_text(), Loader=yaml.BaseLoader
    )
    step = next(
        step for step in morning["jobs"]["publish"]["steps"] if "周一" in step.get("name", "")
    )
    assert "TZ=Asia/Singapore date +%F" in step["run"]
    assert '!= "1"' in step["run"]
    assert 'args=(news weekly --date "$business_day")' in step["run"]
    assert '"${args[@]}"' in step["run"]
