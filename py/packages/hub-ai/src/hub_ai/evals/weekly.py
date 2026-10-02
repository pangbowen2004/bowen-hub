"""每周评测只记录真实执行结果；失败门槛仍原样生效。"""

import os
from contextlib import suppress
from datetime import UTC, date, datetime
from urllib.parse import quote

from hub_ai.evals.runner import evaluate
from hub_ai.runtime import Runtime
from hub_contracts import AiCall, EvalResult, Run, RunPage
from hub_core.api import ApiClient
from hub_core.http import HttpClient
from hub_core.mail import Mailer
from hub_core.settings import Settings


async def execute_weekly(
    runtime: Runtime,
    ids: list[str],
    skipped: list[str],
    settings: Settings,
    business_date: date,
    *,
    force: bool = False,
) -> list[EvalResult]:
    http = HttpClient()
    api: ApiClient | None = None
    identifier = f"evals-weekly-{business_date.isoformat()}"
    old_record = runtime.record
    now = datetime.now(UTC)
    run = Run(
        id=identifier,
        job="evals-weekly",
        date=business_date,
        status="running",
        startedAt=now,
        finishedAt=None,
        error=None,
        stats={"skippedMissingCases": skipped, "evaluated": 0, "costUsd": 0},
    )
    notified = False
    results: list[EvalResult] = []

    async def record(call: AiCall) -> None:
        run.stats["costUsd"] = float(run.stats.get("costUsd", 0)) + call.costUsd
        run.stats["aiCalls"] = int(run.stats.get("aiCalls", 0)) + 1
        assert api is not None
        api.write_ai_calls([call.model_copy(update={"runId": identifier})])
        if old_record:
            await old_record(call)

    def failure() -> None:
        nonlocal notified
        run.status = "failed"
        run.error = "每周评测未完成或未达到既定门槛，请查看报告和运行记录"
        repository = os.environ.get("GITHUB_REPOSITORY")
        actions_id = os.environ.get("GITHUB_RUN_ID")
        link = (
            f"https://github.com/{repository}/actions/runs/{actions_id}"
            if repository and actions_id
            else "本机运行"
        )
        if not notified:
            notified = True
            try:
                run.stats["failureNotificationSent"] = Mailer(settings).notify_failure(
                    run.job, business_date, run.error, link
                )
            except Exception:
                run.stats["failureNotificationSent"] = False

    try:
        api = ApiClient(settings, http)
        if not force:
            cursor: str | None = None
            seen: set[str] = set()
            while True:
                path = "/v1/runs?job=evals-weekly&limit=100"
                if cursor:
                    path += "&cursor=" + quote(cursor, safe="")
                page = api.get(path, RunPage)
                if any(item.id == identifier and item.status == "succeeded" for item in page.items):
                    return []
                cursor = page.nextCursor
                if cursor is None:
                    break
                if cursor in seen:
                    raise ValueError("运行记录分页未前进")
                seen.add(cursor)
        api.write_run(run)
        runtime.record = record
        for name in ids:
            result = await evaluate(runtime, name)
            api.post_batch("/v1/internal/evals/results/batch", [result])
            results.append(result)
            run.stats.update(evaluated=len(results), costUsd=sum(r.costUsd or 0 for r in results))
        if any(not result.passed for result in results):
            failure()
        else:
            run.status = "succeeded"
        run.finishedAt = datetime.now(UTC)
        api.write_run(run)
        return results
    except Exception:
        failure()
        run.finishedAt = datetime.now(UTC)
        if api is not None:
            with suppress(Exception):
                api.write_run(run)
        raise
    finally:
        runtime.record = old_record
        http.close()
