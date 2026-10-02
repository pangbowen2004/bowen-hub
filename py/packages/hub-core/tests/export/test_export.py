"""离线回放全部业务表，证明分页、提交/清理顺序和通知记账。"""

import json
import subprocess
from datetime import UTC, date, datetime
from pathlib import Path
from typing import Any
from urllib.parse import parse_qs, urlparse

import pytest

from hub_contracts import ExportPage, Run
from hub_core.export.pipeline import (
    TABLES,
    GitRepository,
    budget_alert,
    export_tables,
    pages,
    run_export,
)
from hub_core.mail import Mailer
from hub_core.settings import Settings

DAY = date(2026, 10, 2)
NOW = datetime(2026, 10, 2, tzinfo=UTC)


class FakeApi:
    def __init__(self, rows: dict[str, list[dict[str, Any]]] | None = None) -> None:
        self.rows = rows or {}
        self.events: list[str] = []
        self.runs: list[Run] = []
        self.calls: list[str] = []

    def get(self, path: str, model: type[ExportPage]) -> ExportPage:
        self.calls.append(path)
        url = urlparse(path)
        table = url.path.rsplit("/", 1)[-1]
        start = int(parse_qs(url.query).get("cursor", ["0"])[0])
        rows = self.rows.get(table, [])
        end = start + 100
        return model.model_validate(
            {
                "table": table,
                "items": rows[start:end],
                "nextCursor": str(end) if end < len(rows) else None,
            }
        )

    def post(self, path: str) -> None:
        self.events.append("prune")
        self.calls.append(path)

    def write_run(self, run: Run) -> None:
        self.runs.append(run)
        self.events.append(f"{run.job}:{run.status}")


class FakeRepository:
    def __init__(self, api: FakeApi, *, fail: bool = False) -> None:
        self.api = api
        self.fail = fail

    def publish(self, paths: list[Path], business_date: date) -> None:
        assert len(paths) == 22
        assert all(path.exists() for path in paths)
        assert business_date == DAY
        self.api.events.append("publish")
        if self.fail:
            raise RuntimeError("离线推送失败")


class FakeMailer(Mailer):
    def __init__(self, *, fail: bool = False) -> None:
        super().__init__(Settings())
        self.fail = fail
        self.sent: list[str] = []
        self.failures: list[str] = []

    def send(self, subject: str, text: str, html: str) -> None:
        if self.fail:
            raise ValueError("离线邮件失败")
        self.sent.append(subject)

    def notify_failure(self, job: str, business_date: date, summary: str, actions_url: str) -> bool:
        self.failures.append(job)
        return True


def test_full_export_all_pages_raw_values_and_no_auth(tmp_path: Path) -> None:
    rows = [{"id": n, "payload": '{"保留原字节": true}', "nullable": None} for n in range(205)]
    api = FakeApi({"articles": rows})
    paths, counts, cost, sent = export_tables(api, tmp_path, "2026-10")
    assert len(paths) == len(TABLES) == 22
    assert set(counts) == set(TABLES)
    assert counts["articles"] == 205
    assert json.loads((tmp_path / "articles.json").read_text()) == rows
    assert json.loads((tmp_path / "papers.json").read_text()) == []
    assert len([path for path in api.calls if "/articles?" in path]) == 3
    assert not any("auth" in path or "token" in path or "session" in path for path in api.calls)
    assert cost == 0
    assert not sent
    assert not list(tmp_path.glob("*.tmp"))


def test_publish_precedes_prune_and_final_run(tmp_path: Path) -> None:
    api = FakeApi()
    mailer = FakeMailer()
    result = run_export(
        api, FakeRepository(api), tmp_path, mailer, business_date=DAY, budget=60, now=lambda: NOW
    )
    assert result is not None
    assert len(result) == 22
    assert api.events == ["data-export:running", "publish", "prune", "data-export:succeeded"]
    assert api.calls[-1] == "/v1/internal/news/articles/prune?before=2025-10-02"
    assert not mailer.sent


def test_failed_publish_never_prunes_and_retains_files(tmp_path: Path) -> None:
    api = FakeApi({"articles": [{"id": "old"}]})
    mailer = FakeMailer()
    with pytest.raises(RuntimeError, match="离线推送失败"):
        run_export(
            api,
            FakeRepository(api, fail=True),
            tmp_path,
            mailer,
            business_date=DAY,
            budget=60,
            now=lambda: NOW,
        )
    assert "prune" not in api.events
    assert api.runs[-1].status == "failed"
    assert mailer.failures == ["数据导出"]
    assert json.loads((tmp_path / "articles.json").read_text()) == [{"id": "old"}]


def test_pagination_cycle_and_wrong_table_fail_without_publish(tmp_path: Path) -> None:
    class BrokenApi(FakeApi):
        def get(self, path: str, model: type[ExportPage]) -> ExportPage:
            return model.model_validate(
                {"table": "articles", "items": [{"id": "a"}], "nextCursor": "same"}
            )

    with pytest.raises(ValueError, match="未前进"):
        list(pages(BrokenApi(), "articles"))
    with pytest.raises(ValueError, match="不同"):
        export_tables(BrokenApi(), tmp_path, "2026-10")
    assert not list(tmp_path.glob("*.tmp"))


def test_month_uses_singapore_boundary_and_only_succeeded_alerts(tmp_path: Path) -> None:
    api = FakeApi(
        {
            "ai_calls": [
                {"at": "2026-09-30T15:59:59Z", "cost_usd": 100},
                {"at": "2026-09-30T16:00:00Z", "cost_usd": 0.1},
                {"at": "2026-10-31T15:59:59Z", "cost_usd": 0.2},
                {"at": "2026-10-31T16:00:00Z", "cost_usd": 100},
            ],
            "runs": [
                {"job": "budget-alert", "status": "failed", "date": "2026-10-01"},
                {"job": "budget-alert", "status": "succeeded", "date": "2026-09-01"},
            ],
        }
    )
    assert export_tables(api, tmp_path, "2026-10")[2:] == (0.30000000000000004, False)
    api.rows["runs"].append({"job": "budget-alert", "status": "succeeded", "date": "2026-10-02"})
    assert export_tables(api, tmp_path, "2026-10")[3]


def test_budget_alert_records_only_after_success_and_deduplicates() -> None:
    api = FakeApi()
    with pytest.raises(ValueError, match="邮件失败"):
        budget_alert(
            api,
            FakeMailer(fail=True),
            business_date=DAY,
            cost=61,
            budget=60,
            already_sent=False,
            now=lambda: NOW,
        )
    assert not api.runs
    mailer = FakeMailer()
    assert budget_alert(
        api, mailer, business_date=DAY, cost=61, budget=60, already_sent=False, now=lambda: NOW
    )
    assert api.runs[0].id == "budget-alert-2026-10"
    assert api.runs[0].status == "succeeded"
    assert not budget_alert(
        api, mailer, business_date=DAY, cost=61, budget=60, already_sent=True, now=lambda: NOW
    )
    assert not budget_alert(
        api, mailer, business_date=DAY, cost=60, budget=60, already_sent=False, now=lambda: NOW
    )
    assert len(mailer.sent) == 1


def test_git_commit_excludes_unrelated_staged_files_and_push_failure_is_safe(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    calls: list[list[str]] = []

    def git(args: list[str], **kwargs: Any) -> subprocess.CompletedProcess[bytes]:
        calls.append(args)
        return subprocess.CompletedProcess(
            args, 1 if args[1] in {"diff", "push"} else 0, b"", b"secret-url-must-not-be-shown"
        )

    monkeypatch.setattr(subprocess, "run", git)
    with pytest.raises(RuntimeError, match=r"^数据仓库 git 操作失败$"):
        GitRepository(tmp_path).publish([tmp_path / "articles.json"], DAY)
    assert calls == [
        ["git", "add", "--", "articles.json"],
        ["git", "diff", "--cached", "--quiet", "--", "articles.json"],
        ["git", "commit", "--only", "-m", "数据导出：2026-10-02", "--", "articles.json"],
        ["git", "push"],
    ]


def test_completed_date_skips_and_force_reexports(tmp_path: Path) -> None:
    api = FakeApi({"runs": [{"id": f"data-export-{DAY}", "status": "succeeded"}]})
    mailer = FakeMailer()
    assert (
        run_export(
            api,
            FakeRepository(api),
            tmp_path,
            mailer,
            business_date=DAY,
            budget=60,
            now=lambda: NOW,
        )
        is None
    )
    assert not api.events
    assert (
        run_export(
            api,
            FakeRepository(api),
            tmp_path,
            mailer,
            business_date=DAY,
            budget=60,
            force=True,
            now=lambda: NOW,
        )
        is not None
    )
    assert "prune" in api.events


def test_historical_business_date_checks_actual_current_month(tmp_path: Path) -> None:
    api = FakeApi({"ai_calls": [{"at": "2026-10-01T00:00:00Z", "cost_usd": 61}]})
    mailer = FakeMailer()

    class RepositoryForHistoricalDate(FakeRepository):
        def publish(self, paths: list[Path], business_date: date) -> None:
            assert business_date == date(2026, 9, 30)
            self.api.events.append("publish")

    run_export(
        api,
        RepositoryForHistoricalDate(api),
        tmp_path,
        mailer,
        business_date=date(2026, 9, 30),
        budget=60,
        now=lambda: NOW,
    )
    assert api.runs[-2].id == "budget-alert-2026-10"
    assert mailer.sent == ["⚠️ [AI 月度预算] 超支｜2026-10"]


@pytest.mark.parametrize(
    "row",
    [
        {"at": "2026-10-02T00:00:00Z", "cost_usd": -1},
        {"at": "2026-10-02T00:00:00Z", "cost_usd": float("nan")},
        {"at": "2026-10-02T00:00:00", "cost_usd": 1},
    ],
)
def test_bad_fee_data_fails_before_publish(tmp_path: Path, row: dict[str, Any]) -> None:
    api = FakeApi({"ai_calls": [row]})
    mailer = FakeMailer()
    with pytest.raises(ValueError, match="AI 费用"):
        run_export(
            api,
            FakeRepository(api),
            tmp_path,
            mailer,
            business_date=DAY,
            budget=60,
            now=lambda: NOW,
        )
    assert "publish" not in api.events
    assert "prune" not in api.events
    assert api.runs[-1].status == "failed"
    assert not list(tmp_path.glob("*.tmp"))


def test_preflight_api_failure_notifies_and_never_publishes(tmp_path: Path) -> None:
    class UnavailableApi(FakeApi):
        def get(self, path: str, model: type[ExportPage]) -> ExportPage:
            raise RuntimeError("离线API失败")

    api = UnavailableApi()
    mailer = FakeMailer()
    with pytest.raises(RuntimeError):
        run_export(
            api,
            FakeRepository(api),
            tmp_path,
            mailer,
            business_date=DAY,
            budget=60,
            now=lambda: NOW,
        )
    assert api.events == ["data-export:failed"]
    assert mailer.failures == ["数据导出"]


def test_failed_git_commit_does_not_push(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    calls: list[str] = []

    def git(args: list[str], **kwargs: Any) -> subprocess.CompletedProcess[bytes]:
        calls.append(args[1])
        return subprocess.CompletedProcess(args, 1 if args[1] in {"diff", "commit"} else 0)

    monkeypatch.setattr(subprocess, "run", git)
    with pytest.raises(RuntimeError):
        GitRepository(tmp_path).publish([tmp_path / "papers.json"], DAY)
    assert calls == ["add", "diff", "commit"]


def test_push_credential_only_in_child_environment(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from pydantic import SecretStr

    calls: list[tuple[list[str], dict[str, Any]]] = []

    def git(args: list[str], **kwargs: Any) -> subprocess.CompletedProcess[bytes]:
        calls.append((args, kwargs))
        return subprocess.CompletedProcess(args, 0)

    monkeypatch.setattr(subprocess, "run", git)
    GitRepository(tmp_path, SecretStr("test-invalid-token")).publish([tmp_path / "runs.json"], DAY)
    assert [args[1] for args, _ in calls] == ["add", "diff", "push"]
    assert all(kwargs["env"] is None for _, kwargs in calls[:-1])
    assert calls[-1][1]["env"]["GIT_CONFIG_COUNT"] == "1"
    assert calls[-1][1]["env"]["GIT_CONFIG_KEY_0"] == "http.https://github.com/.extraheader"
    assert calls[-1][1]["env"]["GIT_CONFIG_VALUE_0"].startswith("AUTHORIZATION: basic ")
    assert all("test-invalid-token" not in str(args) for args, _ in calls)
    assert not (tmp_path / ".gitconfig").exists()


def test_repeated_export_uses_persisted_successful_month_alert(tmp_path: Path) -> None:
    api = FakeApi({"ai_calls": [{"at": "2026-10-02T00:00:00Z", "cost_usd": 61}]})
    mailer = FakeMailer()
    run_export(
        api, FakeRepository(api), tmp_path, mailer, business_date=DAY, budget=60, now=lambda: NOW
    )
    alert = next(run for run in api.runs if run.job == "budget-alert")
    # 下一次API读取的是已成功写回的运行记录，而不是进程内去重状态。
    api.rows["runs"] = [alert.model_dump(mode="json")]
    run_export(
        api,
        FakeRepository(api),
        tmp_path,
        mailer,
        business_date=DAY,
        budget=60,
        force=True,
        now=lambda: NOW,
    )
    assert len(mailer.sent) == 1
    assert len([run for run in api.runs if run.job == "budget-alert"]) == 1


@pytest.mark.parametrize("label", [date(2025, 1, 1), date(2027, 10, 3)])
def test_export_label_does_not_move_actual_retention_cutoff(tmp_path: Path, label: date) -> None:
    api = FakeApi()

    class LabelRepository:
        def publish(self, paths: list[Path], business_date: date) -> None:
            assert business_date == label
            assert len(paths) == 22
            api.events.append("publish")

    result = run_export(
        api,
        LabelRepository(),
        tmp_path,
        FakeMailer(),
        business_date=label,
        budget=60,
        now=lambda: NOW,
    )
    assert result is not None
    assert api.calls[-1] == "/v1/internal/news/articles/prune?before=2025-10-02"
    assert api.runs[-1].date == label
    assert api.events.index("publish") < api.events.index("prune")
