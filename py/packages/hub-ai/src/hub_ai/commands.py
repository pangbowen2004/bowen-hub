"""命令登记；离线与真实网关调用明确分开。"""

import asyncio
import subprocess
from datetime import date as Date
from datetime import datetime
from pathlib import Path
from zoneinfo import ZoneInfo

import typer
from openai import AsyncOpenAI

from hub_ai.checks import CheckRegistry
from hub_ai.evals.case_report import CaseReport
from hub_ai.evals.runner import evaluate, markdown, select_capabilities
from hub_ai.evals.weekly import execute_weekly
from hub_ai.gateway import GatewayAdapter, gateway_url
from hub_ai.registry import Registry, find_root
from hub_ai.runtime import Request, Response, Runtime
from hub_contracts import EvalResult
from hub_core.api import ApiClient
from hub_core.http import HttpClient
from hub_core.settings import Settings


class UnavailableAdapter:
    async def generate(self, request: Request) -> Response:
        raise ValueError("离线模式禁止调用模型；需要显式回放夹具")


def register(groups: dict[str, typer.Typer]) -> None:
    groups["evals"].command("run")(run)
    groups["evals"].command("compare")(compare)
    groups["evals"].command("harvest")(harvest)
    groups["providers"].command("check-models")(check_models)


def _never_registered_cases(root: Path, path: Path) -> bool:
    """只证明本线从未登记；Git 不可用或缺少基线时不能把缺失当占位。"""
    try:
        relative = path.relative_to(root).as_posix()

        def git(*arguments: str) -> str:
            return subprocess.run(
                ["git", *arguments], cwd=root, text=True, capture_output=True, check=True
            ).stdout.strip()

        if git("ls-files", "--", relative):
            return False
        if git("log", "-1", "--format=%H", "HEAD", "--", relative):
            return False
        # ls-tree 的成功空结果才证明此基线没有该文件；缺失 origin/main 不是证明。
        return not git("ls-tree", "--name-only", "origin/main", "--", relative)
    except OSError, ValueError, subprocess.CalledProcessError:
        return False


def run(
    capability: str | None = None,
    changed: bool = False,
    offline: bool = False,
    weekly: bool = False,
    write_api: bool = False,
    root: Path | None = None,
    report: Path | None = None,
    date: str | None = None,
    force: bool = False,
    case_report: Path | None = None,
) -> None:
    try:
        if write_api and (not weekly or changed or offline):
            raise ValueError("只有显式真实每周评测允许写 API")
        if (date is not None or force) and not (weekly and write_api):
            raise ValueError("日期和强制重跑只用于真实每周评测")
        registry = Registry(root or find_root())
        ids = select_capabilities(registry, capability, changed=changed, weekly=weekly)
        if not ids and capability is not None and not changed:
            raise ValueError("没有匹配的能力")
        skipped: list[str] = []
        if weekly or changed:
            skipped = [
                name
                for name in ids
                if not (
                    registry.root / registry.capabilities[name]["evals"]["dataset"] / "cases.yaml"
                ).is_file()
                and (
                    not changed
                    or _never_registered_cases(
                        registry.root,
                        registry.root
                        / registry.capabilities[name]["evals"]["dataset"]
                        / "cases.yaml",
                    )
                )
            ]
            ids = [name for name in ids if name not in skipped]
            for name in skipped:
                typer.echo(f"跳过 {name}：未注册用例，没有生成评测结果。")
        if not ids and not (weekly and write_api):
            typer.echo("受影响能力：0；没有运行产品评测。")
            return
        settings = Settings()
        case_writer = CaseReport(case_report) if case_report is not None else None
        checks = CheckRegistry()
        checks.load_plugins()
        if offline:
            adapter = UnavailableAdapter()
        elif case_writer is not None:
            adapter = GatewayAdapter(registry, settings, observer=case_writer.observe)
        else:
            adapter = GatewayAdapter(registry, settings)
        runtime = Runtime(registry, adapter, checks=checks)

        async def execute() -> list[EvalResult]:
            if weekly and write_api:
                on = (
                    Date.fromisoformat(date)
                    if date
                    else datetime.now(ZoneInfo("Asia/Singapore")).date()
                )
                return await execute_weekly(
                    runtime, ids, skipped, settings, on, force=force, case_report=case_writer
                )
            return [
                await evaluate(runtime, name, offline=offline, case_report=case_writer)
                for name in ids
            ]

        results = asyncio.run(execute())
        content = markdown(results)
        typer.echo(content)
        if report:
            report.parent.mkdir(parents=True, exist_ok=True)
            report.write_text(content)
        if any(not result.passed for result in results):
            raise typer.Exit(1)
    except (ValueError, OSError) as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from None


def compare(
    candidate: str = typer.Option(...),
    capability: str | None = None,
    root: Path | None = None,
    report: Path | None = None,
) -> None:
    try:
        registry = Registry(root or find_root())
        if candidate not in registry.llm["candidates"] or candidate not in registry.llm["prices"]:
            raise ValueError("候选模型必须在 config/llm.yaml 登记")
        checks = CheckRegistry()
        checks.load_plugins()
        runtime = Runtime(registry, GatewayAdapter(registry, Settings()), checks=checks)

        async def execute() -> list[EvalResult]:
            results: list[EvalResult] = []
            for name in select_capabilities(registry, capability):
                baseline = await evaluate(runtime, name)
                proposed = await evaluate(runtime, name, candidate=candidate)
                proposed.passed &= all(
                    proposed.scores[key] >= value for key, value in baseline.scores.items()
                )
                results.extend([baseline, proposed])
            return results

        results = asyncio.run(execute())
        content = (
            markdown(results)
            + f"\n月度预算：${registry.llm['monthlyBudgetUsd']}；换模前需人工核对调用量预测。\n"
        )
        typer.echo(content)
        if report:
            report.write_text(content)
        if not results or any(not result.passed for result in results):
            raise typer.Exit(1)
    except (ValueError, OSError) as error:
        typer.echo(str(error), err=True)
        raise typer.Exit(1) from None


def harvest(output: Path = Path("evals/harvest-drafts.yaml"), since: str | None = None) -> None:
    import yaml

    from hub_ai.evals.harvest import harvest_feedback

    http = HttpClient()
    try:
        drafts = harvest_feedback(ApiClient(Settings(), http), since=since)
        output.parent.mkdir(parents=True, exist_ok=True)
        output.write_text(yaml.safe_dump(drafts, allow_unicode=True, sort_keys=False))
        typer.echo(f"已生成 {len(drafts)} 条待补齐草稿；不是可直接运行的评测集。")
    except Exception:
        typer.echo("收集未完成：API读取失败或环境未配置。", err=True)
        raise typer.Exit(1) from None
    finally:
        http.close()


def check_models(root: Path | None = None) -> None:
    try:
        registry = Registry(root or find_root())
        settings = Settings()

        async def execute() -> bool:
            async with AsyncOpenAI(
                base_url=gateway_url(registry, settings),
                api_key=settings.openai_api_key.get_secret_value()
                if settings.openai_api_key
                else "",
                max_retries=0,
            ) as client:
                available = {model.id async for model in await client.models.list()}
            ok = True
            for tier, config in registry.llm["tiers"].items():
                found = config["model"] in available
                typer.echo(
                    f"{tier}: {config['model']} {'可用' if found else '失败：网关列表没有该模型'}"
                )
                ok &= found
            return ok

        if not asyncio.run(execute()):
            raise typer.Exit(1)
    except Exception as error:
        if isinstance(error, typer.Exit):
            raise
        typer.echo("模型检查失败：环境配置或网关模型列表未通过。", err=True)
        raise typer.Exit(1) from None
