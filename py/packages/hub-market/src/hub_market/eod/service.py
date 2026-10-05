"""收盘与按真实交易日顺序回填的薄编排；无模型调用。"""

import json
import logging
from collections.abc import Callable, Sequence
from dataclasses import dataclass
from datetime import date, datetime, time
from pathlib import Path
from typing import Protocol
from uuid import uuid4
from zoneinfo import ZoneInfo

from hub_contracts import Hypothesis, IndexBar, MarketDay, MarketDayWrite, Run, WeeklyReport
from hub_core.config import load_config
from hub_core.protocols import TradingCalendar
from hub_market.compute.day import complete_day, compute
from hub_market.compute.indices import bars
from hub_market.hypotheses.engine import Mode, generate, merge_pending, settle
from hub_market.weekly.report import build as build_weekly
from hub_providers.tushare.collection import Collection

from .inputs import compute_input, reference
from .repository import Store
from .warmup import summary as warmup_summary

SHANGHAI = ZoneInfo("Asia/Shanghai")
logger = logging.getLogger(__name__)


class Notification(Protocol):
    def notify_failure(
        self, job: str, business_date: date, summary: str, actions_url: str
    ) -> object: ...


class Collector(Protocol):
    def collect(self, on: date) -> Collection: ...


class MarketJobError(RuntimeError):
    pass


@dataclass(frozen=True)
class Result:
    status: str
    document: MarketDayWrite | None = None
    weekly: WeeklyReport | None = None
    hypotheses: tuple[Hypothesis, ...] = ()
    published: bool = False


class Eod:
    def __init__(
        self,
        root: Path,
        store: Store,
        collector: Collector,
        calendar: TradingCalendar,
        dispatch: Callable[[date], None],
        notify: Notification,
        *,
        clock: Callable[[], datetime] = lambda: datetime.now(SHANGHAI),
        actions_url: str = "本机运行（无 Actions 链接）",
        run_suffix: str | None = None,
        warmup_cache: Path | None = None,
        source_version: str = "hub-market-0.1.0",
    ) -> None:
        self.root = root
        self.store = store
        self.collector = collector
        self.calendar = calendar
        self.dispatch = dispatch
        self.notify = notify
        self.clock = clock
        self.actions_url = actions_url
        self.run_suffix = run_suffix
        self.config = load_config(root / "config/market.yaml")
        self.templates = load_config(root / "config/market_summary.yaml")
        self.warmup_cache = warmup_cache or root / self.config["cacheDir"] / "eod-warmup"
        self.source_version = source_version

    def run(
        self,
        on: date,
        *,
        force: bool = False,
        deadline: time = time(22),
        dry_run: Path | None = None,
        mode: Mode = "realtime",
        dispatch: bool = True,
    ) -> Result:
        now = self.clock()
        if now.tzinfo is None:
            raise ValueError("运行时钟必须包含时区")
        run = Run(
            id=f"market-eod-{on}-{self.run_suffix or uuid4().hex}",
            job="market-eod",
            date=on,
            status="running",
            startedAt=now,
            finishedAt=None,
            stats={"mode": mode, "published": False},
            error=None,
        )
        try:
            if dry_run is None:
                self.store.run(run)
            if not self.calendar.is_session(on):
                return self.finish(run, Result("非交易日"), dry_run)
            existing = self.store.day(on)
            if existing and existing.dataStatus.complete and not force:
                return self.finish(run, Result("已经完成"), dry_run)
            collected = self.collector.collect(on)
            if collected.day != on:
                raise ValueError("采集日期与目标日期不一致")
            if not collected.core_ready:
                if self.clock().astimezone(SHANGHAI) < datetime.combine(on, deadline, SHANGHAI):
                    run.stats["missingCore"] = sorted(collected.missing)
                    return self.finish(run, Result("数据未就绪"), dry_run)
                raise MarketJobError("核心数据过截止时间仍未就绪")
            previous = self.calendar.previous_session(on)
            # 最近20交易日用于统计/缺失超时；五日摘要必须逐一来自真实目标日期。
            sessions = list(self.calendar.sessions(date(on.year - 1, 1, 1), on))[-20:]
            if len(sessions) < 5 or sessions[-1] != on:
                raise ValueError("真实交易日窗口不足")
            required_dates = sessions[-5:-1]
            summaries = self.store.summaries(on, required_dates[0])
            selected = {row.date: row for row in summaries}
            absent = [day for day in required_dates if day not in selected]
            run.stats["apiMissingSummaries"] = [str(day) for day in absent]
            warmed: list[dict[str, object]] = []
            for day in absent:
                value, metadata = warmup_summary(
                    self.root,
                    self.warmup_cache,
                    day,
                    self.calendar.previous_session(day),
                    self.collector.collect,
                    self.templates,
                    now=now,
                    source_version=self.source_version,
                )
                selected[day] = value
                warmed.append(metadata)
            run.stats["warmup"] = warmed
            ledger = self.store.ledger()
            if on < date.fromisoformat(self.config["hypotheses"]["startDate"]) and not ledger:
                raise MarketJobError("旧假设账本尚未迁移；不能以空账本替代")
            computed = compute(compute_input(self.root, collected, previous), self.templates)
            previous_summaries = [selected[day] for day in required_dates]
            draft = complete_day(
                computed,
                generated_at=now,
                previous_summaries=previous_summaries,
                settled_hypotheses=ledger,
                recent_sessions=sessions,
            )
            day_cache: dict[date, MarketDay | None] = {on: draft.day}

            def get_day(day: date) -> MarketDay | None:
                if day not in day_cache:
                    day_cache[day] = self.store.day(day)
                return day_cache[day]

            updated: list[Hypothesis] = []
            for hypothesis in ledger:
                if hypothesis.result != "PENDING" or hypothesis.dueOn > on:
                    updated.append(hypothesis)
                    continue
                baseline = get_day(hypothesis.createdOn)
                members = (
                    {
                        row.name: row.memberCodes
                        for row in baseline.directions.items
                        if row.memberCodes is not None
                    }
                    if baseline and baseline.directions
                    else {}
                )
                elapsed = len(self.calendar.sessions(hypothesis.dueOn, on)) - int(
                    self.calendar.is_session(hypothesis.dueOn)
                )
                updated.append(
                    settle(
                        hypothesis,
                        get_day(hypothesis.dueOn),
                        on,
                        sessions_after_due=elapsed,
                        pending_max_sessions=self.config["hypotheses"]["pendingMaxSessions"],
                        baseline_members=members,
                    )
                )
            generated = (
                generate(draft.day, self.calendar.next_session(on), mode)
                if on >= date.fromisoformat(self.config["hypotheses"]["startDate"])
                else []
            )
            merged = merge_pending(updated, generated)
            document = complete_day(
                computed,
                generated_at=now,
                previous_summaries=previous_summaries,
                settled_hypotheses=merged,
                recent_sessions=sessions,
            )
            old = {row.id: row for row in ledger}
            changed = [row for row in merged if row.id not in old or row != old[row.id]]
            last_in_week = self.calendar.next_session(on).isocalendar()[:2] != on.isocalendar()[:2]
            weekly = (
                build_weekly(
                    [*previous_summaries, document.summary],
                    merged,
                    missing=[f"{on}:{value}" for value in document.day.dataStatus.missing],
                )
                if last_in_week
                else None
            )
            run.stats.update(
                {
                    "missing": document.day.dataStatus.missing,
                    "hypothesesWritten": len(changed),
                    "membershipAsOf": collected.membership_as_of.isoformat(),
                    "weekly": weekly is not None,
                }
            )
            result = Result(
                "只计算" if dry_run else "已发布", document, weekly, tuple(changed), dry_run is None
            )
            if dry_run:
                dry_run.parent.mkdir(parents=True, exist_ok=True)
                dry_run.write_text(
                    json.dumps(
                        {
                            "day": document.day.model_dump(mode="json"),
                            "summary": document.summary.model_dump(mode="json"),
                            "hypotheses": [row.model_dump(mode="json") for row in changed],
                            "weekly": weekly.model_dump(mode="json") if weekly else None,
                        },
                        ensure_ascii=False,
                        indent=2,
                    )
                    + "\n"
                )
            else:
                self.store.hypotheses(changed)
                for index in computed.inputs.indices:
                    values: Sequence[IndexBar] = bars(
                        computed.inputs.required("index_daily", index["code"]), on
                    )
                    self.store.bars(index["code"], values)
                self.store.write_day(document)
                if weekly:
                    self.store.weekly(weekly)
                self.store.reference(reference(self.root))
                run.stats["published"] = True
                if dispatch:
                    self.dispatch(on)
            return self.finish(run, result, dry_run)
        except Exception as error:
            summary = (
                str(error)
                if isinstance(error, MarketJobError)
                else f"收盘任务失败（{type(error).__name__}）"
            )
            run.status = "failed"
            run.finishedAt = self.clock()
            run.error = summary
            if dry_run is None:
                try:
                    self.store.run(run)
                except Exception:
                    logger.error("失败运行记录未写入API")
                try:
                    self.notify.notify_failure("market-eod", on, summary, self.actions_url)
                except Exception:
                    logger.error("失败通知邮件未发出")
            raise MarketJobError(summary) from None

    def finish(self, run: Run, result: Result, dry_run: Path | None) -> Result:
        if dry_run is None:
            run.status = "succeeded"
            run.finishedAt = self.clock()
            run.stats["status"] = result.status
            self.store.run(run)
        return result

    def backfill(self, start: date, end: date, *, force: bool = False) -> list[Result]:
        if start > end:
            raise ValueError("回填起止日期顺序无效")
        run = Run(
            id=f"market-backfill-{start}-{self.run_suffix or uuid4().hex}",
            job="market-backfill",
            date=start,
            status="running",
            startedAt=self.clock(),
            finishedAt=None,
            stats={"start": str(start), "end": str(end)},
            error=None,
        )
        child_failed = False
        try:
            self.store.run(run)
            sessions = sorted(set(self.calendar.sessions(start, end)))
            results: list[Result] = []
            for on in sessions:
                try:
                    results.append(self.run(on, mode="backfill", dispatch=False, force=force))
                except MarketJobError:
                    child_failed = True
                    raise
            published = [
                on for on, result in zip(sessions, results, strict=True) if result.published
            ]
            run.stats["publishedDates"] = [str(on) for on in published]
            if published:
                self.dispatch(published[-1])
            run.status = "succeeded"
            run.finishedAt = self.clock()
            self.store.run(run)
            return results
        except Exception as error:
            run.status = "failed"
            run.finishedAt = self.clock()
            run.error = (
                str(error)
                if isinstance(error, MarketJobError)
                else f"回填失败（{type(error).__name__}）"
            )
            try:
                self.store.run(run)
            except Exception:
                logger.error("回填失败运行记录未写入API")
            if not child_failed:
                try:
                    self.notify.notify_failure(
                        "market-backfill", start, run.error, self.actions_url
                    )
                except Exception:
                    logger.error("回填失败通知邮件未发出")
            raise MarketJobError(run.error) from None
