"""实际安装的CLI离线执行；成功输入、真实差异、错误输入各自退出码。"""

import json
import subprocess
import sys
from decimal import Decimal
from pathlib import Path

import pytest

from hub_contracts import MarketDay
from hub_market.compare.commands import from_document
from hub_market.compare.report import report

ROOT = Path(__file__).resolve().parents[5]


def cli(*arguments: str) -> subprocess.CompletedProcess[str]:
    return subprocess.run(
        [str(Path(sys.executable).with_name("hub")), "market", "compare", *arguments],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=30,
        check=False,
    )


def test_real_cli_input_document_success() -> None:
    result = cli(
        "2026-08-28", "--input", str(ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json")
    )
    assert result.returncode == 0, result.stderr
    payload = json.loads(result.stdout)
    assert payload["passed"]
    assert payload["passedCount"] == payload["total"]


def test_real_cli_recorded_source_reports_actual_differences() -> None:
    result = cli("2026-08-28")
    assert result.returncode == 1, result.stderr
    payload = json.loads(result.stdout)
    assert not payload["passed"]
    assert (payload["passedCount"], payload["total"]) == (184, 218)
    evidence = payload["sourceEvidence"]
    assert evidence["rawRecordingDate"] == "2026-10-02"
    equalities = {row["code"]: row for row in evidence["maExactEqualities"]}
    assert equalities["002340.SZ"]["sumDecimal"] == "133.40"
    assert equalities["301221.SZ"]["sumDecimal"] == "567.40"
    assert evidence["industryCoverage"]["oldFullMemberListAvailable"] is False
    assert evidence["moneyflowCoverage"]["sourceUniqueCodes"] == 6007
    assert evidence["moneyflowCoverage"]["sourceDates"] == ["20260828"]
    assert evidence["moneyflowCoverage"]["duplicateCodeRows"] == 0
    assert evidence["moneyflowCoverage"]["outsideDailyCodes"] == 460
    assert set(evidence["moneyflowCoverage"]["sourceNullCounts"].values()) == {0}
    assert any(row["field"] == "market.aboveMa20Share" for row in payload["failures"])
    assert any(row["field"] == "industries.轻工制造.return1d" for row in payload["failures"])


@pytest.mark.parametrize("on", ["bad-date", "2026-08-27"])
def test_cli_invalid_or_mismatched_date(on: str) -> None:
    result = cli(on, "--input", str(ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json"))
    assert result.returncode == 2
    assert "市场对照失败" in result.stderr


def test_cli_invalid_json(tmp_path: Path) -> None:
    source = tmp_path / "invalid.json"
    source.write_text("{")
    result = cli("2026-08-28", "--input", str(source))
    assert result.returncode == 2


def test_exact_tolerances_detect_count_yuan_and_return_changes() -> None:
    day = MarketDay.model_validate_json(
        (ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text()
    )
    old = json.loads((ROOT / "fixtures/market/close-analysis-2026-08-28.json").read_text())
    day.market.advanceCount += 1
    day.market.turnoverCny += 1
    day.market.advanceShare += 1e-8
    result = report(from_document(day), old)
    fields = {row["field"] for row in result["failures"]}
    assert {"market.advanceCount", "market.turnoverCny", "market.advanceShare"} <= fields


def test_score_decimal_tolerance_is_not_expanded() -> None:
    day = MarketDay.model_validate_json(
        (ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text()
    )
    old = json.loads((ROOT / "fixtures/market/close-analysis-2026-08-28.json").read_text())
    original = old["temperature"]["components"]["breadth35"]
    day.temperature.parts.breadth = float(Decimal(str(original)) + Decimal("0.01"))
    accepted = report(from_document(day), old)
    assert next(row for row in accepted["checks"] if row["field"] == "temperature.parts.breadth")[
        "passed"
    ]
    day.temperature.parts.breadth = float(Decimal(str(original)) + Decimal("0.0100000000001"))
    rejected = report(from_document(day), old)
    assert not next(
        row for row in rejected["checks"] if row["field"] == "temperature.parts.breadth"
    )["passed"]
