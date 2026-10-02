"""命令发现、真实收盘dry-run接线与工作流参数；无外部调用。"""

from pathlib import Path
from typing import Any

import httpx
import pytest
import yaml
from typer.testing import CliRunner

from hub_cli.main import create_app
from hub_core.http import HttpClient
from hub_market.eod import commands

from .test_service import ROOT, setup


@pytest.mark.parametrize("name", ["eod", "backfill"])
def test_help_no_configuration_or_source_reads(name: str, monkeypatch: pytest.MonkeyPatch) -> None:
    def fail(*args: Any, **kwargs: Any) -> None:
        raise AssertionError("help不能加载凭据或取数")

    monkeypatch.setattr(commands, "create", fail)
    result = CliRunner().invoke(create_app(), ["market", name, "--help"])
    assert result.exit_code == 0
    assert "--warmup-cache" in result.output


def test_installed_cli_real_dry_run_and_invalid_input(
    actual: Any, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    job, store, _, _, source = setup(actual, tmp_path / "warmup")
    http = HttpClient(
        client=httpx.Client(
            transport=httpx.MockTransport(lambda req: httpx.Response(500, request=req))
        )
    )

    def create(*args: Any, **kwargs: Any) -> Any:
        return job, source, http

    monkeypatch.setattr(commands, "create", create)
    try:
        path = tmp_path / "day.json"
        result = CliRunner().invoke(
            create_app(), ["market", "eod", "--date", "2026-08-28", "--dry-run", str(path)]
        )
        assert result.exit_code == 0, result.output
        assert "只计算" in result.output
        assert path.exists()
        assert not store.runs
        bad = CliRunner().invoke(create_app(), ["market", "eod", "--date", "无效不能回显"])
        assert bad.exit_code == 1
        assert "无效不能回显" not in bad.output
        invalid = CliRunner().invoke(create_app(), ["market", "eod", "--deadline", "25:00"])
        assert invalid.exit_code == 1
        assert "25:00" not in invalid.output
    finally:
        source.close()
        http.client.close()


def test_workflow_exact_cron_main_and_safe_dispatch_arguments() -> None:
    value = yaml.load(
        (ROOT / ".github/workflows/market-eod.yml").read_text(), Loader=yaml.BaseLoader
    )
    assert value["on"]["schedule"] == [{"cron": "5 9-14 * * 1-5"}]
    assert value["concurrency"]["cancel-in-progress"] == "false"
    assert set(value["on"]["workflow_dispatch"]["inputs"]) == {"date", "force"}
    job = value["jobs"]["publish"]
    assert job["steps"][0]["with"]["ref"] == "main"
    assert "TUSHARE_TOKEN" in job["env"]
    assert "GH_AUTOMATION_TOKEN" in job["env"]
    assert "OPENAI_API_KEY" not in job["env"]
    assert "mise run gen" in job["steps"][2]["run"]
    script = next(
        step["run"] for step in job["steps"] if step["name"] == "收盘计算、归档与派发预览构建"
    )
    assert 'args+=(--date "$MARKET_DATE")' in script
    assert "${{ inputs.date }}" not in script
    assert 'hub "${args[@]}"' in script


def test_workflow_preserves_historical_tushare_cache() -> None:
    text = (ROOT / ".github/workflows/market-eod.yml").read_text()
    assert "actions/cache/restore@v6" in text
    assert "actions/cache/save@v6" in text
    assert text.count("path: .cache/tushare") == 2
    assert "steps.cache-date.outputs.day" in text
    assert "hashFiles('config/market*.yaml')" in text
    assert "${{ github.run_id }}-${{ github.run_attempt }}" in text
    assert "restore-keys:" in text
    assert "always() && !cancelled()" in text
    assert text.index("actions/cache/restore@v6") < text.index("args=(market eod)")
    assert text.index("actions/cache/save@v6") > text.index("args=(market eod)")
