"""写入、核对与命令：真实 API 客户端经 HTTP 回放（假 API 复刻服务端的覆盖规则），全部离线。"""

import json
from collections.abc import Sequence
from contextlib import AbstractContextManager, nullcontext
from datetime import date, datetime, time, timedelta
from pathlib import Path
from typing import Any
from urllib.parse import unquote
from zoneinfo import ZoneInfo

import httpx
import pytest
import typer
from pydantic import SecretStr
from typer.testing import CliRunner

from hub_contracts import Hypothesis, MarketDaySummary, MarketEvent, WeeklyReport
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_market.eod.repository import MarketApi, Repository
from hub_market.migrate import commands
from hub_market.migrate.events import EventPlan, convert_events, read_calendar
from hub_market.migrate.history import verify_history
from hub_market.migrate.ledger import LedgerPlan, convert_ledger, read_ledger
from hub_market.migrate.transfer import (
    verify_events,
    verify_ledger,
    write_events,
    write_ledger,
)
from hub_market.weekly import build, summary

ROOT = Path(__file__).resolve().parents[5]
LEDGER = ROOT / "fixtures/market/hypotheses-ledger.json"
CALENDAR = ROOT / "fixtures/market/events-calendar.json"
DAY_SAMPLE = ROOT / "fixtures/samples/markets/MarketDaySummary.2026-08-28.json"
SHANGHAI = ZoneInfo("Asia/Shanghai")
TOKEN = "offline-token"
SETTLED = {"CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE"}


class FakeApi:
    """复刻 API 的行为：假设只覆盖 PENDING；列表分页；事件按日期窗口取。"""

    def __init__(self) -> None:
        self.hypotheses: dict[str, Hypothesis] = {}
        self.events: dict[str, MarketEvent] = {}
        self.days: dict[date, MarketDaySummary] = {}
        self.weeklies: dict[date, WeeklyReport] = {}
        self.embedded: dict[date, list[MarketDaySummary]] = {}
        self.writes: list[tuple[str, int]] = []
        self.repeat_cursor = False
        self.fail_writes_with: int | None = None

    def handle(self, request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == f"Bearer {TOKEN}"
        path = request.url.path
        if request.method == "POST":
            return self.write(request, path)
        assert request.method == "GET"
        params = request.url.params
        if path == "/v1/public/markets/hypotheses":
            rows = sorted(self.hypotheses.values(), key=lambda row: (row.createdOn, row.id))
            return self.page(request, [row.model_dump(mode="json") for row in reversed(rows)])
        if path == "/v1/public/markets/days":
            before = date.fromisoformat(params["before"]) if "before" in params else date.max
            rows = [self.days[day] for day in sorted(self.days, reverse=True) if day < before]
            return self.page(request, [row.model_dump(mode="json") for row in rows])
        if path.startswith("/v1/public/markets/days/"):
            day = date.fromisoformat(unquote(path.rsplit("/", 1)[1]))
            payload = json.loads(
                (ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text()
            )
            index = SESSIONS.index(day)
            rows = self.embedded.get(
                day,
                [
                    self.days.get(value, summary_of(value))
                    for value in SESSIONS[index - 4 : index + 1]
                ],
            )
            payload["date"] = day.isoformat()
            payload["evolution"]["rows"] = [row.model_dump(mode="json") for row in rows]
            return httpx.Response(200, json=payload)
        if path == "/v1/public/markets/events":
            start, end = date.fromisoformat(params["from"]), date.fromisoformat(params["to"])
            rows = [
                row for row in self.events.values() if row.endDate >= start and row.startDate <= end
            ]
            rows.sort(key=lambda row: (row.startDate, row.id))
            return httpx.Response(200, json=[row.model_dump(mode="json") for row in rows])
        if path == "/v1/public/markets/weeklies":
            rows = [summary(self.weeklies[day]) for day in sorted(self.weeklies, reverse=True)]
            return httpx.Response(200, json=[row.model_dump(mode="json") for row in rows])
        if path.startswith("/v1/public/markets/weeklies/"):
            day = date.fromisoformat(unquote(path.rsplit("/", 1)[1]))
            return httpx.Response(200, json=self.weeklies[day].model_dump(mode="json"))
        raise AssertionError(f"未登记读路径：{path}")

    def write(self, request: httpx.Request, path: str) -> httpx.Response:
        if self.fail_writes_with is not None:
            return httpx.Response(self.fail_writes_with, text="上游正文含敏感内容", request=request)
        rows: list[dict[str, Any]] = json.loads(request.content)
        self.writes.append((path, len(rows)))
        if path == "/v1/internal/markets/hypotheses/batch":
            for raw in rows:
                item = Hypothesis.model_validate(raw)
                current = self.hypotheses.get(item.id)
                if current is None or current.result == "PENDING":
                    self.hypotheses[item.id] = item
        elif path == "/v1/internal/markets/events/batch":
            for raw in rows:
                event = MarketEvent.model_validate(raw)
                self.events[event.id] = event
        else:
            raise AssertionError(f"未登记写路径：{path}")
        return httpx.Response(204, request=request)

    def page(self, request: httpx.Request, rows: Sequence[dict[str, Any]]) -> httpx.Response:
        limit = int(request.url.params.get("limit", "20"))
        start = int(request.url.params.get("cursor", "0"))
        chosen = list(rows[start : start + limit])
        more = start + limit < len(rows)
        cursor = "0" if self.repeat_cursor else str(start + limit) if more else None
        return httpx.Response(200, json={"items": chosen, "nextCursor": cursor})


def http_for(api: FakeApi) -> HttpClient:
    return HttpClient(client=httpx.Client(transport=httpx.MockTransport(api.handle)), retries=0)


def store_for(api: FakeApi) -> Repository:
    settings = Settings.model_construct(
        hub_api_url="https://api.test", hub_service_token=SecretStr(TOKEN)
    )
    return Repository(MarketApi(settings, http_for(api)))


def ledger_plan() -> LedgerPlan:
    return convert_ledger(read_ledger(LEDGER))


def event_plan() -> EventPlan:
    return convert_events(read_calendar(CALENDAR))


def settle(row: Hypothesis, result: str = "NOT_CONFIRMED", on: date | None = None) -> Hypothesis:
    """像补跑结算那样，只改 result、settledOn、actual、resultNote。"""
    return Hypothesis.model_validate(
        {
            **row.model_dump(),
            "result": result,
            "settledOn": on or row.dueOn,
            "actual": None,
            "resultNote": f"补跑结算为{result}",
        }
    )


def settle_all_pending(api: FakeApi) -> list[str]:
    ids = [key for key, row in api.hypotheses.items() if row.result == "PENDING"]
    for key in ids:
        api.hypotheses[key] = settle(api.hypotheses[key])
    return ids


# ───────────── 账本写入与核对 ─────────────


def test_write_ledger_in_batches_of_40_and_rewrite_is_harmless() -> None:
    api = FakeApi()
    store = store_for(api)
    plan = ledger_plan()
    assert write_ledger(store, plan) == 61
    assert [count for _, count in api.writes] == [40, 21]
    assert len(api.hypotheses) == 61
    write_ledger(store, plan)
    assert len(api.hypotheses) == 61
    check = verify_ledger(store, plan)
    assert check.differences == []
    assert any("老账本61条" in line and "共61条" in line for line in check.lines)
    assert any("待结算9条" in line and "仍待结算9条" in line for line in check.lines)


def test_rewrite_after_backfill_keeps_the_settled_results() -> None:
    """补跑结算了 9 条之后重新跑迁移：API 只覆盖 PENDING，已结算的结果不被改回去。"""
    api = FakeApi()
    store = store_for(api)
    plan = ledger_plan()
    write_ledger(store, plan)
    ids = settle_all_pending(api)
    assert len(ids) == 9
    write_ledger(store, plan)
    assert all(api.hypotheses[key].result == "NOT_CONFIRMED" for key in ids)
    check = verify_ledger(store, plan)
    assert check.differences == []
    assert any("补跑已结算9条，仍待结算0条" in line for line in check.lines)


def test_verify_ledger_reports_every_kind_of_difference() -> None:
    api = FakeApi()
    store = store_for(api)
    plan = ledger_plan()
    write_ledger(store, plan)
    settled = [key for key, row in api.hypotheses.items() if row.result == "CONFIRMED"]
    pending = [key for key, row in api.hypotheses.items() if row.result == "PENDING"]

    # 内容被改、已结算结果被改、缺一条、多一条（早于截止日、mode=realtime）。
    api.hypotheses[settled[0]] = api.hypotheses[settled[0]].model_copy(update={"title": "被改过"})
    api.hypotheses[settled[1]] = settle(api.hypotheses[settled[1]], "INCONCLUSIVE")
    del api.hypotheses[settled[2]]
    extra = api.hypotheses[settled[3]].model_copy(update={"id": "HYP-20260801-EXTRA"})
    api.hypotheses[extra.id] = extra
    # 待结算的那几条：结算时改了别的字段、结算日早于到期日、仍待结算但被改。
    api.hypotheses[pending[0]] = settle(api.hypotheses[pending[0]]).model_copy(
        update={"title": "结算时误改标题"}
    )
    api.hypotheses[pending[1]] = settle(api.hypotheses[pending[1]], on=date(2026, 8, 1))
    api.hypotheses[pending[2]] = api.hypotheses[pending[2]].model_copy(update={"risk": "被改过"})

    text = "\n".join(verify_ledger(store, plan).differences)
    assert f"假设内容不一致：{settled[0]}（title）" in text
    assert f"假设内容不一致：{settled[1]}（" in text
    assert f"缺假设：{settled[2]}" in text
    assert "多余假设（createdOn≤2026-08-28）：HYP-20260801-EXTRA" in text
    assert f"假设内容不一致：{pending[0]}（title" in text
    assert f"假设内容不一致：{pending[1]}" in text
    assert f"假设内容不一致：{pending[2]}（risk）" in text
    assert "的假设有" not in text  # 少一条又多一条，导入批的总数仍是 61


def test_backfill_mode_records_after_cutoff_do_not_count_as_imported() -> None:
    api = FakeApi()
    store = store_for(api)
    plan = ledger_plan()
    write_ledger(store, plan)
    later = api.hypotheses[next(iter(api.hypotheses))].model_copy(
        update={
            "id": "HYP-20260831-MARKET-PERSISTENCE",
            "createdOn": date(2026, 8, 31),
            "mode": "backfill",
        }
    )
    api.hypotheses[later.id] = later
    assert verify_ledger(store, plan).differences == []
    # 把一条老记录的 mode 改成 backfill：既不算导入的 61 条，内容也不一致。
    first = plan.hypotheses[0].id
    api.hypotheses[first] = api.hypotheses[first].model_copy(update={"mode": "backfill"})
    text = "\n".join(verify_ledger(store, plan).differences)
    assert "有60条，应为61条" in text
    assert f"假设内容不一致：{first}（mode）" in text


def test_ledger_listing_stops_on_a_repeating_cursor() -> None:
    api = FakeApi()
    store = store_for(api)
    plan = ledger_plan()
    write_ledger(store, plan)
    api.repeat_cursor = True
    with pytest.raises(ValueError, match="游标重复"):
        verify_ledger(store, plan)


# ───────────── 事件写入与核对 ─────────────


def test_write_and_verify_events_and_each_kind_of_difference() -> None:
    api = FakeApi()
    plan = event_plan()
    client = store_for(api).api
    assert write_events(client, plan) == 79
    assert [count for _, count in api.writes] == [40, 39]
    write_events(client, plan)
    assert len(api.events) == 79
    check = verify_events(client, plan)
    assert check.differences == []
    assert any("老日历79条" in line and "confirmed 74" in line for line in check.lines)
    first, second, third = list(api.events)[:3]
    api.events[first] = api.events[first].model_copy(update={"title": "被改过"})
    del api.events[second]
    api.events["EVT-EXTRA"] = api.events[third].model_copy(update={"id": "EVT-EXTRA"})
    text = "\n".join(verify_events(client, plan).differences)
    assert f"事件内容不一致：{first}（title）" in text
    assert f"缺事件：{second}" in text
    assert "多余事件：EVT-EXTRA" in text


# ───────────── 补跑后的历史核对 ─────────────


def weekdays(start: date, end: date) -> list[date]:
    return [
        start + timedelta(days=offset)
        for offset in range((end - start).days + 1)
        if (start + timedelta(days=offset)).weekday() < 5
    ]


class FakeCalendar:
    def __init__(self, values: list[date]) -> None:
        self.values = sorted(values)

    def is_session(self, day: date) -> bool:
        return day in self.values

    def previous_session(self, day: date) -> date:
        return max(value for value in self.values if value < day)

    def next_session(self, day: date) -> date:
        return min(value for value in self.values if value > day)

    def sessions(self, start: date, end: date) -> list[date]:
        return [value for value in self.values if start <= value <= end]

    def open_at(self, day: date) -> datetime:
        return datetime.combine(day, time(9, 30), SHANGHAI)

    def close_at(self, day: date) -> datetime:
        return datetime.combine(day, time(15), SHANGHAI)


def summary_of(day: date, *, complete: bool = True) -> MarketDaySummary:
    payload = json.loads(DAY_SAMPLE.read_text(encoding="utf-8"))
    return MarketDaySummary.model_validate(
        {**payload, "date": day.isoformat(), "complete": complete}
    )


START = date(2026, 7, 1)
THROUGH = date(2026, 7, 10)
SESSIONS = weekdays(date(2026, 6, 25), date(2026, 7, 24))


def weekly_of(day: date, ledger: list[Hypothesis]) -> WeeklyReport:
    index = SESSIONS.index(day)
    return build([summary_of(value) for value in SESSIONS[index - 4 : index + 1]], ledger)


def finished_api() -> tuple[FakeApi, Repository, FakeCalendar]:
    """补跑完成后的状态：老账本 61 条（待结算的 9 条已结算），7/1 至 7/10 每个交易日有 MarketDay，
    周内最后一个交易日（7/3、7/10）有周报。"""
    api = FakeApi()
    store = store_for(api)
    write_ledger(store, ledger_plan())
    settle_all_pending(api)
    for day in weekdays(START, THROUGH):
        api.days[day] = summary_of(day)
    ledger = list(api.hypotheses.values())
    for day in (date(2026, 7, 3), date(2026, 7, 10)):
        api.weeklies[day] = weekly_of(day, ledger)
    return api, store, FakeCalendar(SESSIONS)


def test_history_passes_when_every_session_day_and_week_is_present() -> None:
    api, store, calendar = finished_api()
    check = verify_history(store, calendar, start=START, through=THROUGH)
    assert check.differences == []
    text = "\n".join(check.lines)
    assert "交易日8个；MarketDay 8个（缺0、多0）" in text
    assert "周报：应有2份（2026-07-03、2026-07-10）" in text
    assert "到期日早于2026-07-10仍是PENDING：0条" in text
    assert len(api.days) == 8


def test_history_reports_missing_and_extra_days_and_lists_incomplete_ones() -> None:
    api, store, calendar = finished_api()
    del api.days[date(2026, 7, 8)]
    api.days[date(2026, 7, 4)] = summary_of(date(2026, 7, 4))
    api.days[date(2026, 7, 6)] = summary_of(date(2026, 7, 6), complete=False)
    check = verify_history(store, calendar, start=START, through=THROUGH)
    assert "缺 MarketDay：2026-07-08" in check.differences
    assert "非交易日却有 MarketDay：2026-07-04" in check.differences
    # 数据不完整只是提示，不算差异。
    assert len(check.differences) == 2
    assert any("complete=false 的交易日：1个（2026-07-06）" in line for line in check.lines)


def test_history_requires_weekly_for_the_last_session_of_each_week() -> None:
    api, store, calendar = finished_api()
    del api.weeklies[date(2026, 7, 10)]
    api.weeklies[date(2026, 7, 8)] = weekly_of(date(2026, 7, 8), list(api.hypotheses.values()))
    check = verify_history(store, calendar, start=START, through=THROUGH)
    assert "缺周报：2026-07-10" in check.differences
    assert "多余周报（不是周内最后一个交易日）：2026-07-08" in check.differences


def test_history_week_ending_before_a_holiday_gap_counts_as_week_end() -> None:
    """下一交易日已在下一周，即使不是周五也要有周报（如国庆前最后一个交易日）。"""
    api, store, _ = finished_api()
    holiday = FakeCalendar([*weekdays(date(2026, 6, 29), date(2026, 7, 8)), date(2026, 7, 14)])
    check = verify_history(store, holiday, start=START, through=date(2026, 7, 8))
    # 7/8 的下一交易日是 7/14（下一周），所以 7/8 也是周内最后一个交易日。
    assert "缺周报：2026-07-08" in check.differences
    assert api.days  # 日已齐，只缺这一份周报
    assert not any("MarketDay" in message for message in check.differences)


def test_history_flags_pending_hypotheses_due_before_the_latest_session() -> None:
    api, store, calendar = finished_api()
    template = next(iter(api.hypotheses.values()))
    stale = template.model_copy(
        update={
            "id": "HYP-STALE",
            "result": "PENDING",
            "settledOn": None,
            "actual": None,
            "dueOn": date(2026, 7, 3),
        }
    )
    due_today = stale.model_copy(update={"id": "HYP-TODAY", "dueOn": THROUGH})
    api.hypotheses[stale.id] = stale
    api.hypotheses[due_today.id] = due_today
    check = verify_history(store, calendar, start=START, through=THROUGH)
    assert any("HYP-STALE" in message and "仍是PENDING" in message for message in check.differences)
    assert not any("HYP-TODAY" in message for message in check.differences)
    assert any("恰为2026-07-10仍是PENDING：1条" in line for line in check.lines)


def test_history_checks_weekly_research_errors_against_the_ledger() -> None:
    api, store, calendar = finished_api()
    template = next(iter(api.hypotheses.values()))
    rows = [
        template.model_copy(
            update={"id": f"HYP-W-{result}", "result": result, "settledOn": date(2026, 7, 2)}
        )
        for result in ("CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE")
    ]
    for row in rows:
        api.hypotheses[row.id] = row
    ledger = list(api.hypotheses.values())
    api.weeklies[date(2026, 7, 3)] = weekly_of(date(2026, 7, 3), ledger)
    api.weeklies[date(2026, 7, 10)] = weekly_of(date(2026, 7, 10), ledger)
    good = verify_history(store, calendar, start=START, through=THROUGH)
    assert good.differences == []
    assert any("2026-07-03（结算3/未确认1/证据不足1）" in line for line in good.lines)

    report = api.weeklies[date(2026, 7, 3)]
    wrong_item = report.researchErrors.items[0].model_copy(update={"id": "HYP-W-CONFIRMED"})
    api.weeklies[date(2026, 7, 3)] = report.model_copy(
        update={
            "researchErrors": report.researchErrors.model_copy(update={"items": [wrong_item]}),
            "researchErrorCount": 2,
            "inconclusiveCount": 0,
            "settledCount": 2,
        }
    )
    text = "\n".join(verify_history(store, calendar, start=START, through=THROUGH).differences)
    assert "周报2026-07-03：Research Error 与账本里窗口内的未确认假设不一致" in text
    assert "周报2026-07-03：Research Error 计数不等于未确认条数" in text
    assert "周报2026-07-03：证据不足计数不一致" in text
    assert "周报2026-07-03：结算条数与账本不一致" in text


def test_history_without_any_session_is_a_difference() -> None:
    api, store, _ = finished_api()
    check = verify_history(store, FakeCalendar([]), start=START, through=THROUGH)
    assert check.differences == ["2026-07-01 至 2026-07-10 之间没有交易日，无法核对"]
    assert api.days


# ───────────── 命令 ─────────────


def app() -> typer.Typer:
    value = typer.Typer()
    group = typer.Typer()
    value.add_typer(group, name="migrate")
    commands.register({"migrate": group})
    return value


def invoke(monkeypatch: pytest.MonkeyPatch, api: FakeApi | None, *args: str) -> Any:
    monkeypatch.setenv("HUB_SERVICE_TOKEN", TOKEN)
    monkeypatch.setenv("HUB_API_URL", "https://api.test")
    if api is not None:
        http = http_for(api)
        monkeypatch.setattr(commands, "HttpClient", lambda: http)
    return CliRunner().invoke(app(), ["migrate", *args])


def source_args(name: str) -> list[str]:
    return ["--source", str(LEDGER if name == "market-ledger" else CALENDAR)]


@pytest.mark.parametrize("name", ["market-ledger", "market-events"])
def test_dry_run_prints_statistics_and_never_touches_the_network(
    monkeypatch: pytest.MonkeyPatch, name: str
) -> None:
    def forbidden() -> HttpClient:
        raise AssertionError("dry-run 不能发 API 请求")

    monkeypatch.setattr(commands, "HttpClient", forbidden)
    monkeypatch.delenv("HUB_SERVICE_TOKEN", raising=False)
    result = CliRunner().invoke(app(), ["migrate", name, "--dry-run", *source_args(name)])
    assert result.exit_code == 0, result.output
    assert "试运行通过" in result.output
    assert "丢弃的键" in result.output
    assert ("61条" if name == "market-ledger" else "79条") in result.output


@pytest.mark.parametrize("name", ["market-ledger", "market-events"])
def test_dry_run_and_verify_are_mutually_exclusive(
    monkeypatch: pytest.MonkeyPatch, name: str
) -> None:
    result = invoke(monkeypatch, None, name, "--dry-run", "--verify")
    assert result.exit_code == 1
    assert "不能同时使用" in result.output


def test_source_defaults_to_legacy_market_dir(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    (tmp_path / "data/hypotheses").mkdir(parents=True)
    (tmp_path / "data/events").mkdir(parents=True)
    (tmp_path / "data/hypotheses/ledger.json").write_text(LEDGER.read_text(encoding="utf-8"))
    (tmp_path / "data/events/calendar.json").write_text(CALENDAR.read_text(encoding="utf-8"))
    monkeypatch.setenv("LEGACY_MARKET_DIR", str(tmp_path))
    for name in ("market-ledger", "market-events"):
        result = CliRunner().invoke(app(), ["migrate", name, "--dry-run"])
        assert result.exit_code == 0, result.output
    monkeypatch.delenv("LEGACY_MARKET_DIR")
    result = CliRunner().invoke(app(), ["migrate", "market-ledger", "--dry-run"])
    assert result.exit_code == 1
    assert "缺少 LEGACY_MARKET_DIR" in result.output


def test_wrong_source_count_stops_before_any_write(
    monkeypatch: pytest.MonkeyPatch, tmp_path: Path
) -> None:
    data = json.loads(LEDGER.read_text(encoding="utf-8"))
    data["hypotheses"] = data["hypotheses"][:60]
    short = tmp_path / "ledger.json"
    short.write_text(json.dumps(data, ensure_ascii=False), encoding="utf-8")
    api = FakeApi()
    result = invoke(monkeypatch, api, "market-ledger", "--source", str(short))
    assert result.exit_code == 1
    assert "应为61条，实际60条" in result.output
    assert api.writes == []


def test_write_then_verify_both_commands_and_rewrite(monkeypatch: pytest.MonkeyPatch) -> None:
    api = FakeApi()
    for _ in range(2):
        ledger = invoke(monkeypatch, api, "market-ledger", *source_args("market-ledger"))
        events = invoke(monkeypatch, api, "market-events", *source_args("market-events"))
        assert ledger.exit_code == 0, ledger.output
        assert "账本已写入 API：61条" in ledger.output
        assert events.exit_code == 0, events.output
        assert "事件已写入 API：79条" in events.output
    assert len(api.hypotheses) == 61
    assert len(api.events) == 79
    writes = list(api.writes)
    verified = invoke(
        monkeypatch, api, "market-ledger", "--verify", "--no-history", *source_args("market-ledger")
    )
    assert verified.exit_code == 0, verified.output
    assert "核对差异：0项" in verified.output
    events_verified = invoke(
        monkeypatch, api, "market-events", "--verify", *source_args("market-events")
    )
    assert events_verified.exit_code == 0, events_verified.output
    assert "核对差异：0项" in events_verified.output
    assert api.writes == writes  # 核对只读
    assert TOKEN not in verified.output + events_verified.output


def test_verify_failure_exits_one_and_lists_differences(monkeypatch: pytest.MonkeyPatch) -> None:
    api = FakeApi()
    invoke(monkeypatch, api, "market-events", *source_args("market-events"))
    del api.events[next(iter(api.events))]
    result = invoke(monkeypatch, api, "market-events", "--verify", *source_args("market-events"))
    assert result.exit_code == 1
    assert "缺事件" in result.output
    assert "核对差异：1项" in result.output
    empty = invoke(
        monkeypatch,
        FakeApi(),
        "market-ledger",
        "--verify",
        "--no-history",
        *source_args("market-ledger"),
    )
    assert empty.exit_code == 1
    assert "缺假设" in empty.output


def test_verify_with_history_uses_calendar_and_through(monkeypatch: pytest.MonkeyPatch) -> None:
    api, _, calendar = finished_api()

    def calendar_for(settings: Settings, root: Path) -> AbstractContextManager[FakeCalendar]:
        return nullcontext(calendar)

    monkeypatch.setattr(commands, "calendar_for", calendar_for)
    monkeypatch.setattr(commands, "clock", lambda: datetime(2026, 7, 11, 12, tzinfo=SHANGHAI))
    args = ["market-ledger", "--verify", *source_args("market-ledger")]
    # 默认截止日：周六 → 最近一个交易日 7/10。
    result = invoke(monkeypatch, api, *args)
    assert result.exit_code == 0, result.output
    assert "历史核对：2026-07-01 至 2026-07-10" in result.output
    assert "核对差异：0项" in result.output
    # 明确指定更晚的截止日：7/13 到 7/17 还没补跑，应当报缺口。
    later = invoke(monkeypatch, api, *args, "--through", "2026-07-17")
    assert later.exit_code == 1
    assert "缺 MarketDay：2026-07-13" in later.output
    bad = invoke(monkeypatch, api, *args, "--through", "not-a-date")
    assert bad.exit_code == 1
    assert "YYYY-MM-DD" in bad.output


def test_latest_closed_session_waits_for_the_publish_deadline() -> None:
    calendar = FakeCalendar(SESSIONS)
    deadline = time(22)

    def at(day: date, hour: int) -> datetime:
        return datetime.combine(day, time(hour), SHANGHAI)

    friday = date(2026, 7, 10)
    assert commands.latest_closed_session(calendar, START, at(friday, 15), deadline) == date(
        2026, 7, 9
    )
    assert commands.latest_closed_session(calendar, START, at(friday, 23), deadline) == friday
    assert commands.latest_closed_session(calendar, START, at(date(2026, 7, 11), 9), deadline) == (
        friday
    )
    with pytest.raises(ValueError, match="还没有可核对的交易日"):
        commands.latest_closed_session(calendar, START, at(date(2026, 6, 30), 23), deadline)


def test_history_needs_a_tushare_token(monkeypatch: pytest.MonkeyPatch) -> None:
    api = FakeApi()
    invoke(monkeypatch, api, "market-ledger", *source_args("market-ledger"))
    monkeypatch.delenv("TUSHARE_TOKEN", raising=False)
    result = invoke(monkeypatch, api, "market-ledger", "--verify", *source_args("market-ledger"))
    assert result.exit_code == 1
    assert "缺少 TUSHARE_TOKEN" in result.output
    assert "--no-history" in result.output


def test_missing_service_token_is_reported_without_a_traceback(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    monkeypatch.delenv("HUB_SERVICE_TOKEN", raising=False)
    result = CliRunner().invoke(
        app(), ["migrate", "market-events", "--verify", *source_args("market-events")]
    )
    assert result.exit_code == 1
    assert "缺少 HUB_SERVICE_TOKEN" in result.output


def test_failures_do_not_print_upstream_bodies_urls_or_exception_text(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    api = FakeApi()
    api.fail_writes_with = 500
    result = invoke(monkeypatch, api, "market-events", *source_args("market-events"))
    assert result.exit_code == 1
    assert "HTTP 500" in result.output
    assert "敏感内容" not in result.output
    assert "api.test" not in result.output

    def boom() -> HttpClient:
        raise RuntimeError("upstream-sensitive-do-not-print")

    monkeypatch.setattr(commands, "HttpClient", boom)
    crashed = CliRunner().invoke(
        app(), ["migrate", "market-events", "--verify", *source_args("market-events")]
    )
    assert crashed.exit_code == 1
    assert "RuntimeError" in crashed.output
    assert "upstream-sensitive-do-not-print" not in crashed.output


def test_history_rejects_stale_embedded_summary_even_when_every_date_exists() -> None:
    api, store, calendar = finished_api()
    on = date(2026, 7, 7)
    index = SESSIONS.index(on)
    rows = [
        api.days.get(value, summary_of(value)).model_copy(deep=True)
        for value in SESSIONS[index - 4 : index + 1]
    ]
    rows[0].directionsRelative = None
    rows[0].complete = False
    api.embedded[on] = rows
    text = "\n".join(verify_history(store, calendar, start=START, through=THROUGH).differences)
    assert "演化摘要 2026-07-01 与正式摘要不一致" in text
    assert "directionsRelative" in text
    assert "complete" in text
