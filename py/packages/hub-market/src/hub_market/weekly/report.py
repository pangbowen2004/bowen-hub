"""周报与Markdown来自同一结构，Research Error只含未确认。"""

from collections.abc import Sequence
from datetime import date

from hub_contracts import (
    Hypothesis,
    MarketDaySummary,
    WeeklyDataHealth,
    WeeklyJudgment,
    WeeklyLifecycle,
    WeeklyOscillatingDirection,
    WeeklyQuestion,
    WeeklyReport,
    WeeklyResearchError,
    WeeklyResearchErrors,
    WeeklyStructuralChange,
    WeeklySummary,
    WeeklyVerification,
)
from hub_market.common.windows import appearances, five_sessions


def _judgment(row: Hypothesis) -> WeeklyJudgment:
    return WeeklyJudgment(id=row.id, title=row.title, result=row.result, resultNote=row.resultNote)


def _oscillations(rows: Sequence[MarketDaySummary]) -> list[WeeklyOscillatingDirection]:
    changes: dict[str, int] = {}
    previous: dict[str, float] = {}
    for day in rows:
        current = (
            {row.name: row.relativeVsAllA for row in day.directionsRelative}
            if day.directionsRelative is not None
            else {}
        )
        for name, value in current.items():
            if name in previous and previous[name] * value < 0:
                changes[name] = changes.get(name, 0) + 1
        # 缺一天或缺某方向便断开连续比较；零值不冒充正负切换。
        previous = current
    return [
        WeeklyOscillatingDirection(name=name, signChanges=count, latestRelative=previous.get(name))
        for name, count in sorted(changes.items(), key=lambda pair: (-pair[1], pair[0]))
        if count >= 2
    ][:8]


def build(
    rows: Sequence[MarketDaySummary],
    hypotheses: Sequence[Hypothesis],
    *,
    missing: Sequence[str] = (),
) -> WeeklyReport:
    ordered = five_sessions(rows)
    first, last = ordered[0], ordered[-1]
    sessions = [row.date for row in ordered]
    session_set = set(sessions)
    settled = sorted(
        (row for row in hypotheses if row.result != "PENDING" and row.settledOn in session_set),
        key=lambda row: (row.settledOn or date.min, row.id),
    )
    pending = sorted(
        (row for row in hypotheses if row.result == "PENDING" and row.dueOn in session_set),
        key=lambda row: (row.dueOn, row.id),
    )
    a = last.advanceShare - first.advanceShare
    m = last.aboveMa20Share - first.aboveMa20Share
    turnover = last.turnoverCny / first.turnoverCny - 1 if first.turnoverCny > 0 else None
    title = (
        "广度与趋势存量同步改善"
        if a > 0 and m > 0
        else "广度改善但趋势存量未同步"
        if a > 0
        else "广度回落，结构持续性接受检验"
    )
    if turnover is None:
        raise ValueError("首日成交额为零，无法计算周报量能变化")
    turnover_text = f"{turnover:+.2%}"
    sentence = f"五个交易日内，上涨覆盖变化{a:+.2%}、MA20上方比例变化{m:+.2%}、成交额首尾变化{turnover_text}；结论只描述状态迁移。"
    errors = [row for row in settled if row.result == "NOT_CONFIRMED"]
    coverage = sum(row.directionsRelative is not None for row in ordered)
    top = (
        sorted(last.topDirections, key=lambda row: (-row.return1d, row.name))[0].name
        if last.directionsRelative is not None and last.topDirections
        else None
    )
    weak = (
        [
            row.name
            for row in sorted(
                last.directionsRelative, key=lambda row: (row.relativeVsAllA, row.name)
            )[:3]
        ]
        if last.directionsRelative is not None
        else None
    )
    gaps = list(missing)
    gaps.extend(f"{row.date}方向数据未就绪" for row in ordered if row.directionsRelative is None)
    gaps.extend(f"{row.date}数据不完整" for row in ordered if not row.complete)
    report = WeeklyReport(
        date=last.date,
        title=title,
        sentence=sentence,
        settledCount=len(settled),
        researchErrorCount=len(errors),
        inconclusiveCount=sum(row.result == "INCONCLUSIVE" for row in settled),
        sessions=sessions,
        previousJudgmentVerification=WeeklyVerification(
            settledCount=len(settled),
            confirmedCount=sum(row.result == "CONFIRMED" for row in settled),
            notConfirmedCount=len(errors),
            inconclusiveCount=sum(row.result == "INCONCLUSIVE" for row in settled),
            unsettledDueCount=len(pending),
            items=[_judgment(row) for row in [*settled, *pending]],
        ),
        threeStructuralChanges=[
            WeeklyStructuralChange(
                name="市场广度",
                change=a,
                judgment="扩张" if a > 0 else "收窄" if a < 0 else "持平",
                counter="首尾变化不能代替日内路径，需同时查看五日区间。",
            ),
            WeeklyStructuralChange(
                name="趋势存量",
                change=m,
                judgment="改善" if m > 0 else "弱化" if m < 0 else "持平",
                counter="MA20状态具有滞后性，不等于次日方向。",
            ),
            # 契约change必填；无有效量能变化时拒绝构造，绝不填零冒充测量结果。
            WeeklyStructuralChange(
                name="市场量能",
                change=turnover,
                judgment="扩张"
                if turnover and turnover > 0
                else "收缩"
                if turnover and turnover < 0
                else "持平",
                counter="量能需与上涨覆盖、封板质量共同判断。",
            ),
        ],
        lifecycle=WeeklyLifecycle(
            persistentDirections=[
                item for item in appearances(ordered, directions=True) if item.top3Appearances >= 2
            ],
            oscillatingDirections=_oscillations(ordered),
            latestWeakDirections=weak,
            directionCoverageDays=coverage,
            windowDays=5,
        ),
        researchErrors=WeeklyResearchErrors(
            items=[
                WeeklyResearchError(
                    id=row.id, title=row.title, result="NOT_CONFIRMED", reason=row.resultNote
                )
                for row in errors
            ],
            unsettledDue=[_judgment(row) for row in pending],
        ),
        nextWeekQuestions=[
            WeeklyQuestion(
                question=f"{top}能否连续保持相对收益与内部扩散",
                confirm="相对全A收益为正且上涨覆盖不收窄",
                invalidate="相对收益转负且内部中位同步转弱",
            )
            if top
            else None,
            WeeklyQuestion(
                question="广度改善能否获得量能与MA20趋势存量共同支持",
                confirm="上涨覆盖、成交与MA20上方比例至少两项改善",
                invalidate="指数维持但中位数和上涨覆盖同步回落",
            ),
            WeeklyQuestion(
                question="封板生态是否出现高位压缩与负反馈扩散",
                confirm="封板率、晋级梯队和跌停数量保持协调",
                invalidate="高度压缩、晋级率下降与跌停增加同时出现",
            ),
        ],
        dataAndMethodHealth=WeeklyDataHealth(
            sessions=sessions,
            missing=sorted(set(gaps)),
            directionCoverageDays=coverage,
            boundary="研究辅助，不构成投资建议。",
        ),
        markdown="",
    )
    return report.model_copy(update={"markdown": render_markdown(report)})


def summary(report: WeeklyReport) -> WeeklySummary:
    return WeeklySummary.model_validate(report.model_dump())


def render_markdown(report: WeeklyReport) -> str:
    verification = report.previousJudgmentVerification
    lines = [
        f"# {report.title}",
        "",
        report.sentence,
        "",
        "## 1. 上周判断验证",
        "",
        f"已结算{verification.settledCount}条：确认{verification.confirmedCount}、未确认{verification.notConfirmedCount}、证据不足{verification.inconclusiveCount}；到期未结算{verification.unsettledDueCount}。",
    ]
    lines.extend(f"- {item.title}：{item.result}。{item.resultNote}" for item in verification.items)
    lines.extend(["", "## 2. 真正改变结构的三件事", ""])
    lines.extend(
        f"- {item.name}：{item.judgment}（{item.change:+.2%}）。反证：{item.counter}"
        for item in report.threeStructuralChanges
    )
    lines.extend(
        [
            "",
            "## 3. 持续、反复与转弱",
            "",
            f"方向数据覆盖{report.lifecycle.directionCoverageDays}/5。",
        ]
    )
    lines.extend(
        f"- 持续居前：{item.name}，前3出现{item.top3Appearances}次。"
        for item in report.lifecycle.persistentDirections
    )
    lines.extend(
        f"- 反复方向：{item.name}，正负切换{item.signChanges}次，最新相对收益{item.latestRelative:+.2%}。"
        if item.latestRelative is not None
        else f"- 反复方向：{item.name}，正负切换{item.signChanges}次，最新数据未就绪。"
        for item in report.lifecycle.oscillatingDirections
    )
    lines.append(
        "最新弱势方向：" + "、".join(report.lifecycle.latestWeakDirections)
        if report.lifecycle.latestWeakDirections is not None
        else "最新方向数据未就绪。"
    )
    lines.extend(["", "## 4. Research Error", ""])
    lines.extend(f"- {item.title}：未确认。{item.reason}" for item in report.researchErrors.items)
    if not report.researchErrors.items:
        lines.append("本期没有未确认假设；证据不足单独统计。")
    lines.extend(
        f"- 到期未结算：{item.title}。{item.resultNote}"
        for item in report.researchErrors.unsettledDue
    )
    lines.extend(["", "## 5. 下周只验证三件事", ""])
    for question in report.nextWeekQuestions:
        if question is None:
            lines.append("- 方向数据未就绪，方向延续问题暂缺。")
        else:
            lines.extend(
                [
                    f"- {question.question}。",
                    f"  确认：{question.confirm}。",
                    f"  失效：{question.invalidate}。",
                ]
            )
    lines.extend(
        [
            "",
            "## 6. 数据说明",
            "",
            "使用交易日：" + "、".join(map(str, report.sessions)) + "。",
            "缺项：" + ("、".join(report.dataAndMethodHealth.missing) or "无") + "。",
            report.dataAndMethodHealth.boundary,
            "",
        ]
    )
    return "\n".join(lines)
