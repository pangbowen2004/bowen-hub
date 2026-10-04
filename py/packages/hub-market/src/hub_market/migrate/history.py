"""补跑后核对（docs/06 第 4 节、docs/03 的 M-3 与 M-4）：只读 API 和交易日历。"""

from datetime import date, timedelta

from hub_contracts import WeeklyReport, WeeklySummary
from hub_core.protocols import TradingCalendar
from hub_market.eod.repository import Repository

from .transfer import Check


def _week(day: date) -> tuple[int, int]:
    return day.isocalendar()[:2]


def _join(days: list[date]) -> str:
    return "、".join(str(day) for day in days)


def verify_history(
    store: Repository, calendar: TradingCalendar, *, start: date, through: date
) -> Check:
    check = Check()
    sessions = list(calendar.sessions(start, through))
    if not sessions:
        check.differences.append(f"{start} 至 {through} 之间没有交易日，无法核对")
        return check

    # 每个交易日都要有 MarketDay，也不该有非交易日的 MarketDay。
    summaries = {row.date: row for row in store.summaries(through + timedelta(days=1), start)}
    missing = sorted(set(sessions) - summaries.keys())
    extra = sorted(summaries.keys() - set(sessions))
    check.differences.extend(f"缺 MarketDay：{day}" for day in missing)
    check.differences.extend(f"非交易日却有 MarketDay：{day}" for day in extra)
    incomplete = sorted(day for day, row in summaries.items() if not row.complete)

    # 没有到期日早于最近一个交易日的 PENDING；到期日恰为该日的只作提示（缺数据时允许保持待结算）。
    ledger = store.ledger()
    stale = [row for row in ledger if row.result == "PENDING" and row.dueOn < through]
    check.differences.extend(
        f"到期日早于{through}仍是PENDING：{row.id}（到期{row.dueOn}）" for row in stale
    )
    pending_on_through = sum(
        1 for row in ledger if row.result == "PENDING" and row.dueOn == through
    )

    # 每个周内最后一个交易日（下一交易日在下一周）都要有周报。
    following = [*sessions[1:], calendar.next_session(sessions[-1])]
    expected = [
        day for day, after in zip(sessions, following, strict=True) if _week(after) != _week(day)
    ]
    listed = {
        row.date: row
        for row in store.api.get_list("/v1/public/markets/weeklies", WeeklySummary)
        if start <= row.date <= through
    }
    check.differences.extend(f"缺周报：{day}" for day in sorted(set(expected) - listed.keys()))
    check.differences.extend(
        f"多余周报（不是周内最后一个交易日）：{day}"
        for day in sorted(listed.keys() - set(expected))
    )
    detail: list[str] = []
    for day in sorted(set(expected) & listed.keys()):
        report = store.api.get(f"/v1/public/markets/weeklies/{day}", WeeklyReport)
        window = set(report.sessions)
        settled = [row for row in ledger if row.result != "PENDING" and row.settledOn in window]
        errors = {row.id for row in settled if row.result == "NOT_CONFIRMED"}
        verification = report.previousJudgmentVerification
        detail.append(
            f"{day}（结算{report.settledCount}/未确认{report.researchErrorCount}"
            f"/证据不足{report.inconclusiveCount}）"
        )
        problems: list[str] = []
        if report.date != day:
            problems.append("日期与路径不一致")
        if {item.id for item in report.researchErrors.items} != errors:
            problems.append("Research Error 与账本里窗口内的未确认假设不一致")
        if report.researchErrorCount != len(errors) or (
            verification.notConfirmedCount != report.researchErrorCount
        ):
            problems.append("Research Error 计数不等于未确认条数")
        if verification.inconclusiveCount != report.inconclusiveCount:
            problems.append("证据不足计数不一致")
        if report.settledCount != len(settled):
            problems.append("结算条数与账本不一致")
        check.differences.extend(f"周报{day}：{problem}" for problem in problems)

    check.lines = [
        f"历史核对：{start} 至 {through}，交易日{len(sessions)}个；MarketDay {len(summaries)}个"
        f"（缺{len(missing)}、多{len(extra)}）",
        f"dataStatus.complete=false 的交易日：{len(incomplete)}个"
        + (f"（{_join(incomplete)}）" if incomplete else ""),
        f"周报：应有{len(expected)}份（{_join(expected)}），API 里窗口内共{len(listed)}份",
        "周报明细（本周结算数/Research Error 即未确认数/证据不足数）：" + "、".join(detail),
        f"到期日早于{through}仍是PENDING：{len(stale)}条；到期日恰为{through}仍是PENDING："
        f"{pending_on_through}条",
    ]
    return check
