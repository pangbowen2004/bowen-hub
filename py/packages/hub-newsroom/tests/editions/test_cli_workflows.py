"""实际entry point CLI及三个工作流的有限接线。"""

from pathlib import Path

import pytest
import yaml
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
def test_installed_cli_runs_real_domain(
    kind: EditionKind,
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
    help_result = CliRunner().invoke(create_app(), [*args, "--help"])
    assert help_result.exit_code == 0
    for flag in ("--date", "--no-email", "--no-ai", "--force"):
        assert flag in help_result.output
    assert ("--ignore-window" in help_result.output) == (kind == "premarket")
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
        ("weekly", ["10 1 * * 6"]),
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
    run = steps[-1]["run"]
    assert f"args=(news {kind})" in run
    assert '--date "$NEWS_DATE"' in run
    assert "${{ inputs." not in run
    assert '"${args[@]}"' in run
    assert "mise run gen" in steps[-2]["run"]
    assert "HUB_SERVICE_TOKEN" in workflow["jobs"]["publish"]["env"]
