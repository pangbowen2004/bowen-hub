"""真实Python入口的帮助、缺配置与退出码，不发真实HTTP。"""

import os
import subprocess
from pathlib import Path

import pytest

ROOT = Path(__file__).resolve().parents[5]


def test_actual_module_help_and_missing_token(tmp_path: Path) -> None:
    command = [str(ROOT / "py/.venv/bin/python"), "-m", "hub_providers.tushare"]
    help_result = subprocess.run(
        [*command, "--help"], cwd=ROOT, capture_output=True, text=True, timeout=15, check=False
    )
    assert help_result.returncode == 0
    assert "--dates" in help_result.stdout
    assert "--output" in help_result.stdout
    # 只移除环境中的令牌，不读取或输出任何值；Settings不读dotenv。
    environment = {key: value for key, value in os.environ.items() if key != "TUSHARE_TOKEN"}
    result = subprocess.run(
        [*command, "--dates", "2026-08-28", "--output", str(tmp_path)],
        cwd=ROOT,
        env=environment,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == 1
    assert "缺少 TUSHARE_TOKEN" in result.stdout
    assert not list(tmp_path.iterdir())


@pytest.mark.parametrize("failed", [False, True])
def test_actual_cli_collection_boundary_and_exit_status(tmp_path: Path, failed: bool) -> None:
    program = """
import sys, socket
from datetime import date
from pathlib import Path
from hub_contracts import NewsSourceHealth
from hub_core.settings import Settings
from hub_providers.tushare import __main__ as entry
from hub_providers.tushare.collection import Collection

def reject(*args, **kwargs):
    raise AssertionError('必须离线')
socket.socket.connect = reject
entry.Settings = lambda: Settings(tushare_token='OFFLINE')
failed = sys.argv[1] == 'True'
entry.collect = lambda *args, **kwargs: Collection(date(2026,8,28), {}, {}, {'daily/20260828':'核心表未就绪'} if failed else {}, not failed, date(2026,10,2))
sys.argv = ['tushare', '--dates', '2026-08-28', '--output', sys.argv[2]]
raise SystemExit(entry.main())
"""
    result = subprocess.run(
        [str(ROOT / "py/.venv/bin/python"), "-c", program, str(failed), str(tmp_path)],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == int(failed), result.stdout + result.stderr
    assert f"核心就绪={not failed}" in result.stdout
    assert "OFFLINE" not in result.stdout
    assert "Traceback" not in result.stderr
    assert (tmp_path / "2026-08-28/manifest.json").exists()
