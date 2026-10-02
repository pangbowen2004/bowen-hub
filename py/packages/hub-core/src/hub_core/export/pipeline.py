"""逐表导出经服务 API，远端提交成功后才清理过期文章。"""

import base64
import json
import math
import os
import subprocess
from collections.abc import Callable, Iterator
from datetime import UTC, date, datetime, timedelta
from pathlib import Path
from typing import Any, Protocol, get_args
from urllib.parse import urlencode
from zoneinfo import ZoneInfo

from pydantic import SecretStr

from hub_contracts import ExportPage, Run
from hub_core.mail import Mailer

TABLES: tuple[str, ...] = get_args(ExportPage.model_fields["table"].annotation)
LOCAL = ZoneInfo("Asia/Singapore")


class ExportApi(Protocol):
    def get(self, path: str, model: type[ExportPage]) -> ExportPage: ...
    def post(self, path: str) -> None: ...
    def write_run(self, run: Run) -> None: ...


class Repository(Protocol):
    def publish(self, paths: list[Path], business_date: date) -> None: ...


class GitRepository:
    def __init__(self, directory: Path, token: SecretStr | None = None) -> None:
        self.directory = directory
        self.token = token

    def _git(self, *args: str, allow_unchanged: bool = False) -> int:
        environment: dict[str, str] | None = None
        if args[0] == "push" and self.token is not None:
            credential = base64.b64encode(
                ("x-access-token:" + self.token.get_secret_value()).encode()
            ).decode()
            # 仅push子进程的环境；不写gitconfig，不放命令参数/远端URL。
            environment = {
                **os.environ,
                "GIT_CONFIG_COUNT": "1",
                "GIT_CONFIG_KEY_0": "http.https://github.com/.extraheader",
                "GIT_CONFIG_VALUE_0": "AUTHORIZATION: basic " + credential,
            }
        result = subprocess.run(
            ["git", *args],
            cwd=self.directory,
            capture_output=True,
            check=False,
            env=environment,
        )
        if result.returncode != 0 and not (allow_unchanged and result.returncode == 1):
            # git 的远端 URL / stderr 可能带凭据，不复述。
            raise RuntimeError("数据仓库 git 操作失败")
        return result.returncode

    def publish(self, paths: list[Path], business_date: date) -> None:
        names = [path.relative_to(self.directory).as_posix() for path in paths]
        self._git("add", "--", *names)
        changed = self._git("diff", "--cached", "--quiet", "--", *names, allow_unchanged=True)
        if changed:
            self._git("commit", "--only", "-m", f"数据导出：{business_date}", "--", *names)
        # 无数据变化也要确认远端已收到上次提交；推送失败不 prune。
        self._git("push")


def pages(api: ExportApi, table: str) -> Iterator[list[dict[str, Any]]]:
    cursor: str | None = None
    seen: set[str] = set()
    while True:
        query = {"limit": "100"}
        if cursor is not None:
            query["cursor"] = cursor
        page = api.get(f"/v1/internal/export/{table}?{urlencode(query)}", ExportPage)
        if page.table != table:
            raise ValueError("API 返回了不同的导出表")
        yield page.items
        cursor = page.nextCursor
        if cursor is None:
            return
        if not page.items or cursor in seen:
            raise ValueError("导出分页未前进")
        seen.add(cursor)


def export_tables(
    api: ExportApi, directory: Path, month: str
) -> tuple[list[Path], dict[str, int], float, bool]:
    paths: list[Path] = []
    counts: dict[str, int] = {}
    costs: list[float] = []
    alerted = False
    for table in TABLES:
        path = directory / f"{table}.json"
        temporary = path.with_suffix(".json.tmp")
        count = 0
        try:
            with temporary.open("w", encoding="utf-8") as output:
                output.write("[\n")
                for items in pages(api, table):
                    for row in items:
                        if count:
                            output.write(",\n")
                        output.write(json.dumps(row, ensure_ascii=False, sort_keys=True))
                        count += 1
                        if table == "ai_calls":
                            at = datetime.fromisoformat(str(row["at"]))
                            if at.tzinfo is None:
                                raise ValueError("AI 费用时间缺少时区")
                            if at.astimezone(LOCAL).strftime("%Y-%m") == month:
                                value = float(row["cost_usd"])
                                if not math.isfinite(value) or value < 0:
                                    raise ValueError("AI 费用无效")
                                costs.append(value)
                        if table == "runs" and row.get("job") == "budget-alert":
                            alerted |= row.get("status") == "succeeded" and str(
                                row.get("date", "")
                            ).startswith(month + "-")
                output.write("\n]\n")
            temporary.replace(path)
        finally:
            temporary.unlink(missing_ok=True)
        paths.append(path)
        counts[table] = count
    return paths, counts, math.fsum(costs), alerted


def budget_alert(
    api: ExportApi,
    mailer: Mailer,
    *,
    business_date: date,
    cost: float,
    budget: float,
    already_sent: bool,
    now: Callable[[], datetime],
) -> bool:
    if cost <= budget or already_sent:
        return False
    month = business_date.strftime("%Y-%m")
    started = now()
    subject = f"⚠️ [AI 月度预算] 超支｜{month}"
    summary = f"本月 AI 费用 ${cost:.4f}，已超过月度预算 ${budget:.2f}。"
    # SMTP 成功后才记 success；失败不占用本月提醒资格。
    mailer.send(subject, summary, f"<p>{summary}</p>")
    api.write_run(
        Run(
            id=f"budget-alert-{month}",
            job="budget-alert",
            date=business_date,
            status="succeeded",
            startedAt=started,
            finishedAt=now(),
            stats={"costUsd": cost, "budgetUsd": budget},
            error=None,
        )
    )
    return True


def run_export(
    api: ExportApi,
    repository: Repository,
    directory: Path,
    mailer: Mailer,
    *,
    business_date: date,
    budget: float,
    actions_url: str = "",
    force: bool = False,
    now: Callable[[], datetime] = lambda: datetime.now(UTC),
) -> dict[str, int] | None:
    if not math.isfinite(budget) or budget < 0:
        raise ValueError("月度预算无效")
    started = now()
    budget_date = started.astimezone(LOCAL).date()
    record = Run(
        id=f"data-export-{business_date}",
        job="data-export",
        date=business_date,
        status="running",
        startedAt=started,
        finishedAt=None,
        stats={},
        error=None,
    )
    stage = "读取已完成任务"
    try:
        if not force and any(
            row.get("id") == f"data-export-{business_date}" and row.get("status") == "succeeded"
            for items in pages(api, "runs")
            for row in items
        ):
            return None
        stage = "开始运行记账"
        api.write_run(record)
        stage = "分页读取业务表"
        paths, counts, cost, sent = export_tables(api, directory, budget_date.strftime("%Y-%m"))
        stage = "提交并推送数据仓库"
        repository.publish(paths, business_date)
        stage = "清理过期文章"
        api.post(
            "/v1/internal/news/articles/prune?"
            + urlencode({"before": str(budget_date - timedelta(days=365))})
        )
        stage = "检查月度预算并发送提醒"
        budget_alert(
            api,
            mailer,
            business_date=budget_date,
            cost=cost,
            budget=budget,
            already_sent=sent,
            now=now,
        )
        stage = "成功运行记账"
        api.write_run(
            record.model_copy(update={"status": "succeeded", "finishedAt": now(), "stats": counts})
        )
        return counts
    except Exception:
        message = f"数据导出失败：{stage}未完成。"
        try:
            api.write_run(
                record.model_copy(
                    update={"status": "failed", "finishedAt": now(), "error": message}
                )
            )
        finally:
            mailer.notify_failure("数据导出", business_date, message, actions_url)
        raise
