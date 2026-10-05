"""真实五日T20/T21回放与注入API/派发，外部HTTP禁止。"""

import json
from dataclasses import replace
from datetime import UTC, date, datetime, time
from pathlib import Path
from typing import Any

import pytest

from hub_contracts import (
    Hypothesis,
    IndexBar,
    MarketDay,
    MarketDaySummary,
    MarketDayWrite,
    MarketReference,
    Run,
    WeeklyReport,
)
from hub_core.config import load_config
from hub_market.compute.day import Computed, compute, day_summary
from hub_market.eod.inputs import compute_input
from hub_market.eod.service import Eod, MarketJobError
from hub_providers.tushare import SseCalendar, collect
from hub_providers.tushare.collection import Collection
from hub_providers.tushare.replay import RecordedTushareSource

ROOT = Path(__file__).resolve().parents[5]


class Store:
    def __init__(self, summaries: list[MarketDaySummary], ledger: list[Hypothesis]) -> None:
        self.history = summaries
        self.hypotheses_saved = {row.id: row for row in ledger}
        self.days: dict[date, MarketDay] = {}
        self.events: list[str] = []
        self.runs: list[Run] = []
        self.weeklies: list[WeeklyReport] = []
        self.fail: str | None = None
        self.last_document: MarketDayWrite | None = None

    def check(self, event: str) -> None:
        self.events.append(event)
        if self.fail == event:
            raise RuntimeError("不允许传播的供应商密钥正文")

    def day(self, on: date) -> MarketDay | None:
        self.events.append(f"read:{on}")
        return self.days.get(on)

    def summaries(self, before: date, oldest: date) -> list[MarketDaySummary]:
        return [row for row in self.history if oldest <= row.date < before]

    def ledger(self) -> list[Hypothesis]:
        return list(self.hypotheses_saved.values())

    def hypotheses(self, values: Any) -> None:
        self.check("hypotheses")
        for row in values:
            old = self.hypotheses_saved.get(row.id)
            if old is None or old.result == "PENDING":
                self.hypotheses_saved[row.id] = row.model_copy(deep=True)

    def bars(self, code: str, values: Any) -> None:
        self.check("bars:" + code)
        assert values
        assert all(isinstance(row, IndexBar) for row in values)

    def write_day(self, value: MarketDayWrite) -> None:
        self.check("day")
        self.days[value.day.date] = value.day.model_copy(deep=True)
        self.history = [row for row in self.history if row.date != value.summary.date] + [
            value.summary
        ]
        self.last_document = value

    def weekly(self, value: WeeklyReport) -> None:
        self.check("weekly")
        self.weeklies.append(value)

    def reference(self, value: MarketReference) -> None:
        self.check("reference")
        assert len(value.indices) == 6
        assert value.disclaimer

    def run(self, value: Run) -> None:
        self.runs.append(value.model_copy(deep=True))


class Collector:
    def __init__(self, records: dict[date, Collection]) -> None:
        self.records = records
        self.calls: list[date] = []

    def collect(self, on: date) -> Collection:
        self.calls.append(on)
        return self.records[on]


class Notice:
    def __init__(self) -> None:
        self.calls: list[str] = []

    def notify_failure(self, job: str, business_date: date, summary: str, actions_url: str) -> bool:
        self.calls.append(summary)
        return True


@pytest.fixture(scope="session")
def actual() -> tuple[dict[date, Collection], list[Computed]]:
    records: dict[date, Collection] = {}
    computed: list[Computed] = []
    for n in (24, 25, 26, 27, 28):
        on = date(2026, 8, n)
        source = RecordedTushareSource(ROOT / "fixtures/tushare" / str(on))
        try:
            value = collect(source, ROOT / "config", on)
            assert value.core_ready
            records[on] = value
            computed.append(
                compute(
                    compute_input(ROOT, value, SseCalendar(source).previous_session(on)),
                    load_config(ROOT / "config/market_summary.yaml"),
                )
            )
        finally:
            source.close()
    return records, computed


def setup(
    actual: tuple[dict[date, Collection], list[Computed]], tmp_path: Path
) -> tuple[Eod, Store, Collector, Notice, RecordedTushareSource]:
    records, computed = actual
    store = Store(
        [day_summary(row) for row in computed[:-1]],
        [
            Hypothesis.model_validate(row)
            for row in json.loads(
                (ROOT / "fixtures/samples/markets/Hypothesis.ledger.json").read_text()
            )
        ],
    )
    collector = Collector(records.copy())
    source = RecordedTushareSource(ROOT / "fixtures/tushare/2026-08-28")
    notice = Notice()
    service = Eod(
        ROOT,
        store,
        collector,
        SseCalendar(source),
        lambda on: store.check("dispatch:" + str(on)),
        notice,
        clock=lambda: datetime(2026, 8, 28, 10, 5, tzinfo=UTC),
        warmup_cache=tmp_path,
    )
    return service, store, collector, notice, source


def test_real_five_days_full_order_partial_repeat_force_and_weekly(
    actual: Any, tmp_path: Path
) -> None:
    job, store, collector, _, source = setup(actual, tmp_path)
    try:
        result = job.run(date(2026, 8, 28))
        assert result.document
        assert result.published
        assert result.weekly
        assert [row.date for row in result.document.day.evolution.rows] == [
            date(2026, 8, n) for n in (24, 25, 26, 27, 28)
        ]
        assert [row.temperature for row in result.document.day.evolution.rows] == [
            41.8,
            62.5,
            65.4,
            77.3,
            51.9,
        ]
        writes = [event for event in store.events if not event.startswith("read:")]
        assert writes[0] == "hypotheses"
        assert len([row for row in writes if row.startswith("bars:")]) == 6
        assert writes[-4:] == ["day", "weekly", "reference", "dispatch:2026-08-28"]
        assert result.document.day.directions
        assert result.document.day.directions.membershipAsOf == date(2026, 10, 2)
        assert job.run(date(2026, 8, 28)).status == "已经完成"
        assert len(collector.calls) == 1
        job.run(date(2026, 8, 28), force=True)
        assert len(collector.calls) == 2
        assert all(row.result != "PENDING" for row in result.weekly.researchErrors.items)
    finally:
        source.close()


@pytest.mark.parametrize(("hour", "fails"), [(13, False), (14, True), (15, True)])
def test_core_deadline_before_at_after(actual: Any, tmp_path: Path, hour: int, fails: bool) -> None:
    job, store, collector, notice, source = setup(actual, tmp_path)
    collector.records[date(2026, 8, 28)] = replace(
        collector.records[date(2026, 8, 28)], core_ready=False, missing={"daily/20260828": "未就绪"}
    )
    job.clock = lambda: datetime(2026, 8, 28, hour, tzinfo=UTC)
    try:
        if fails:
            with pytest.raises(MarketJobError, match="核心数据"):
                job.run(date(2026, 8, 28), deadline=time(22))
            assert store.runs[-1].status == "failed"
            assert notice.calls
        else:
            assert job.run(date(2026, 8, 28)).status == "数据未就绪"
            assert store.runs[-1].status == "succeeded"
            assert not notice.calls
        assert not any(event in store.events for event in ("day", "hypotheses", "reference"))
    finally:
        source.close()


def test_dry_run_no_any_write_dispatch_or_notice(actual: Any, tmp_path: Path) -> None:
    job, store, _, notice, source = setup(actual, tmp_path / "warmup")
    try:
        output = tmp_path / "out.json"
        result = job.run(date(2026, 8, 28), dry_run=output)
        assert result.document
        raw = json.loads(output.read_text())
        assert MarketDayWrite.model_validate(raw).day == result.document.day
        assert raw["weekly"]
        assert not store.runs
        assert all(event.startswith("read:") for event in store.events)
        assert not notice.calls
    finally:
        source.close()


@pytest.mark.parametrize(
    "stage", ["hypotheses", "bars:000001.SH", "day", "weekly", "reference", "dispatch:2026-08-28"]
)
def test_failure_safe_records_and_recovery_force(actual: Any, tmp_path: Path, stage: str) -> None:
    job, store, _, notice, source = setup(actual, tmp_path)
    store.fail = stage
    try:
        with pytest.raises(MarketJobError) as caught:
            job.run(date(2026, 8, 28))
        assert "密钥" not in str(caught.value)
        assert store.runs[-1].status == "failed"
        assert notice.calls
        store.fail = None
        assert job.run(date(2026, 8, 28), force=True).published
    finally:
        source.close()


def test_non_trading_day_no_collect(actual: Any, tmp_path: Path) -> None:
    job, store, collector, _, source = setup(actual, tmp_path)
    try:
        assert job.run(date(2026, 8, 29)).status == "非交易日"
        assert not collector.calls
        assert not store.days
    finally:
        source.close()


def test_missing_api_history_actual_warmup_then_cache_and_priority(
    actual: Any, tmp_path: Path
) -> None:
    job, store, collector, _, source = setup(actual, tmp_path)
    store.history = []
    try:
        job.run(date(2026, 8, 28))
        assert collector.calls == [date(2026, 8, n) for n in (28, 24, 25, 26, 27)]
        assert store.runs[-1].stats["apiMissingSummaries"] == [
            str(date(2026, 8, n)) for n in (24, 25, 26, 27)
        ]
        metadata = json.loads((tmp_path / "2026-08-24.json").read_text())
        assert metadata["membershipAsOf"] == "2026-10-02"
        assert metadata["sourceVersion"]
        assert metadata["requests"]
        assert set(store.days) == {date(2026, 8, 28)}
        collector.calls = []
        job.run(date(2026, 8, 28), force=True)
        assert collector.calls == [date(2026, 8, 28)]
        assert all(row["cached"] for row in store.runs[-1].stats["warmup"])
        store.history = [day_summary(row) for row in actual[1][:-1]]
        job.run(date(2026, 8, 28), force=True)
        assert store.runs[-1].stats["warmup"] == []
    finally:
        source.close()


def test_missing_history_cannot_use_later_summary_or_publish_fake_day(
    actual: Any, tmp_path: Path
) -> None:
    job, store, collector, _, source = setup(actual, tmp_path)
    store.history = [day_summary(actual[1][-1])]
    collector.records[date(2026, 8, 24)] = replace(
        collector.records[date(2026, 8, 24)], core_ready=False
    )
    try:
        with pytest.raises(MarketJobError):
            job.run(date(2026, 8, 28))
        assert not store.days
    finally:
        source.close()


@pytest.mark.parametrize(
    ("endpoint", "missing"),
    [
        ("moneyflow_dc", "moneyflow"),
        ("moneyflow_mkt_dc", "moneyflow"),
        ("limit_list_d", "limitDetail"),
        ("fund_basic", "etfGroups"),
        ("fund_daily", "etfGroups"),
        ("fund_share", "etfShares"),
        ("ths_member", "directions"),
        ("ths_daily", "directions"),
    ],
)
def test_non_core_missing_keeps_publish_explicit_nulls(
    actual: Any, tmp_path: Path, endpoint: str, missing: str
) -> None:
    job, _store, collector, _, source = setup(actual, tmp_path)
    target = date(2026, 8, 28)
    value = collector.records[target]
    collector.records[target] = replace(
        value, missing=value.missing | {endpoint + "/offline": "回放来源失败"}
    )
    try:
        result = job.run(target)
        assert result.published
        assert result.document
        assert not result.document.day.dataStatus.complete
        assert missing in result.document.day.dataStatus.missing
        if endpoint == "moneyflow_dc":
            assert result.document.day.moneyflow
            assert result.document.day.moneyflow.stockCoverageCount is None
            assert result.document.day.directions
            assert all(
                row.moneyflowProxyCny is None and row.moneyflowCoverage is None
                for row in result.document.day.directions.items
            )
        if endpoint == "moneyflow_mkt_dc":
            assert result.document.day.moneyflow is None
        if endpoint in {"ths_member", "ths_daily"}:
            assert result.document.day.directions is None
        if endpoint in {"fund_basic", "fund_daily"}:
            assert result.document.day.etfGroups is None
        # partial 后续触发必须重新采集，不能因day存在就跳过。
        collector.records[target] = value
        assert job.run(target).published
        assert len(collector.calls) == 2
    finally:
        source.close()


def test_m5_delete_only_temporary_cache_and_replay_moneyflow_failure(
    actual: Any, tmp_path: Path
) -> None:
    import httpx

    from hub_providers.tushare import TushareSource

    recorded = RecordedTushareSource(ROOT / "fixtures/tushare/2026-08-28")
    failed = False

    def response(req: httpx.Request) -> httpx.Response:
        body = json.loads(req.content)
        endpoint = body["api_name"]
        if endpoint == "moneyflow_dc" and failed:
            return httpx.Response(503, request=req)
        params = dict(body["params"])
        limit = int(params.pop("limit"))
        offset = int(params.pop("offset"))
        rows = recorded.query(endpoint, **params)[offset : offset + limit]
        fields = list(rows[0]) if rows else []
        return httpx.Response(
            200,
            json={
                "code": 0,
                "data": {"fields": fields, "items": [[row[key] for key in fields] for row in rows]},
            },
            request=req,
        )

    with httpx.Client(transport=httpx.MockTransport(response)) as client:
        adapter = TushareSource(
            "offline",
            cache_dir=tmp_path / "cache",
            client=client,
            retries=0,
            now=lambda: datetime(2026, 10, 2, tzinfo=UTC),
        )
        try:
            first = collect(adapter, ROOT / "config", date(2026, 8, 28))
            assert first.core_ready
            cached = list((tmp_path / "cache/moneyflow_dc").glob("*.parquet"))
            assert cached
            for path in cached:
                path.unlink()
                path.with_suffix(".json").unlink()
            failed = True
            job, store, _, _, source = setup(actual, tmp_path / "warmup")

            class RealCollector:
                def collect(self, on: date) -> Collection:
                    return collect(adapter, ROOT / "config", on)

            job.collector = RealCollector()
            try:
                result = job.run(date(2026, 8, 28))
                assert result.document
                assert result.published
                assert "moneyflow" in result.document.day.dataStatus.missing
                assert result.document.day.moneyflow
                assert result.document.day.moneyflow.stockCoverageCount is None
                assert store.runs[-1].status == "succeeded"
            finally:
                source.close()
        finally:
            recorded.close()


def test_generation_start_and_backfill_mode_preserve_settled(actual: Any, tmp_path: Path) -> None:
    job, store, _, _, source = setup(actual, tmp_path)
    try:
        before = dict(store.hypotheses_saved)
        result = job.run(date(2026, 8, 28), mode="backfill")
        # 08/31以前不新建ID，但旧PENDING仍按保存规则结算，不能将结算误判为新生成。
        assert set(store.hypotheses_saved) == set(before)
        assert all(row.id in before for row in result.hypotheses)
        assert all(
            store.hypotheses_saved[key] == row
            for key, row in before.items()
            if row.result != "PENDING"
        )
        # 显式测试配置边界与mode接线，未修改生产配置/阈值。
        job.config["hypotheses"]["startDate"] = "2026-08-28"
        result = job.run(date(2026, 8, 28), mode="backfill", force=True)
        generated = [row for row in result.hypotheses if row.createdOn == date(2026, 8, 28)]
        assert generated
        assert all(row.mode == "backfill" and row.dueOn == date(2026, 8, 31) for row in generated)
        assert all(
            store.hypotheses_saved[key] == row
            for key, row in before.items()
            if row.result != "PENDING"
        )
    finally:
        source.close()


def test_backfill_true_calendar_sequential_only_final_dispatch(
    actual: Any, tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from hub_market.eod.service import Result

    job, store, _, _, source = setup(actual, tmp_path)
    calls: list[tuple[date, str, bool]] = []

    def run(on: date, *, mode: str, dispatch: bool, force: bool = False) -> Result:
        assert force is False
        calls.append((on, mode, dispatch))
        return Result(
            "已经完成" if on == date(2026, 8, 27) else "已发布", published=on != date(2026, 8, 27)
        )

    monkeypatch.setattr(job, "run", run)
    try:
        results = job.backfill(date(2026, 8, 27), date(2026, 8, 31))
        assert len(results) == 3
        assert calls == [(date(2026, 8, n), "backfill", False) for n in (27, 28, 31)]
        assert store.events == ["dispatch:2026-08-31"]
        assert store.runs[-1].job == "market-backfill"
        assert store.runs[-1].status == "succeeded"
        store.fail = "dispatch:2026-08-31"
        with pytest.raises(MarketJobError):
            job.backfill(date(2026, 8, 27), date(2026, 8, 31))
        assert store.runs[-1].status == "failed"
    finally:
        source.close()


def test_collection_crossing_deadline_uses_completion_clock(actual: Any, tmp_path: Path) -> None:
    job, store, collector, notice, source = setup(actual, tmp_path)
    collector.records[date(2026, 8, 28)] = replace(
        collector.records[date(2026, 8, 28)],
        core_ready=False,
        missing={"daily/20260828": "未就绪"},
    )
    clocks = iter(
        [
            datetime(2026, 8, 28, 13, 59, tzinfo=UTC),
            datetime(2026, 8, 28, 14, 1, tzinfo=UTC),
            datetime(2026, 8, 28, 14, 1, tzinfo=UTC),
        ]
    )
    job.clock = lambda: next(clocks)
    try:
        with pytest.raises(MarketJobError, match="核心数据"):
            job.run(date(2026, 8, 28), deadline=time(22))
        assert store.runs[-1].status == "failed"
        assert len(notice.calls) == 1
        assert not any(event in store.events for event in ("day", "hypotheses", "reference"))
    finally:
        source.close()


def test_force_backfill_rebuilds_complete_day_and_embedded_summary(
    actual: Any, tmp_path: Path
) -> None:
    job, store, collector, _, source = setup(actual, tmp_path)
    on = date(2026, 8, 28)
    try:
        job.run(on, dispatch=False)
        existing = store.days[on]
        expected = existing.evolution.rows[0].model_copy(deep=True)
        existing.evolution.rows[0].directionsRelative = None
        existing.evolution.rows[0].complete = False
        collector.calls.clear()
        skipped = job.backfill(on, on)
        assert not skipped[0].published
        assert collector.calls == []
        assert store.days[on].evolution.rows[0].directionsRelative is None
        rebuilt = job.backfill(on, on, force=True)
        assert rebuilt[0].published
        assert collector.calls == [on]
        assert store.days[on].evolution.rows[0] == expected
    finally:
        source.close()
