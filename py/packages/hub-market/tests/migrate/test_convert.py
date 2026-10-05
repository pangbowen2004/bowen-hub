"""老假设账本和事件日历转换：真实老数据（fixtures 里的只读副本）加合成边界；全部离线。"""

import json
from collections import Counter
from collections.abc import Callable
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

from hub_contracts import Hypothesis, MarketEvent
from hub_market.migrate.errors import MigrationError
from hub_market.migrate.events import (
    LegacyCalendar,
    convert_events,
    event_lines,
    parse_calendar,
    read_calendar,
)
from hub_market.migrate.ledger import (
    LegacyLedger,
    convert_ledger,
    ledger_lines,
    parse_ledger,
    read_ledger,
)

ROOT = Path(__file__).resolve().parents[5]
LEDGER = ROOT / "fixtures/market/hypotheses-ledger.json"
CALENDAR = ROOT / "fixtures/market/events-calendar.json"
LEDGER_SAMPLE = ROOT / "fixtures/samples/markets/Hypothesis.ledger.json"
EVENT_SAMPLE = ROOT / "fixtures/samples/markets/MarketEvent.calendar.json"


def raw_ledger() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(LEDGER.read_text(encoding="utf-8"))
    return data


def ledger_of(data: dict[str, Any]) -> LegacyLedger:
    return parse_ledger(data)


def one_record(**changes: Any) -> dict[str, Any]:
    """从真实账本里取一条带规则的已结算记录，再按需改字段。"""
    record = deepcopy(
        next(
            row
            for row in raw_ledger()["hypotheses"]
            if row.get("rule") and row["result"] == "CONFIRMED"
        )
    )
    record.update(changes)
    return record


def converted(*records: dict[str, Any]) -> list[Hypothesis]:
    data = raw_ledger()
    data["hypotheses"] = list(records)
    return convert_ledger(ledger_of(data)).hypotheses


def test_ledger_equals_independent_t01_sample() -> None:
    """T01 用另一份脚本转换过 61 条；逐条按 API 写入的序列化口径比对。"""
    plan = convert_ledger(read_ledger(LEDGER))
    sample = {row["id"]: row for row in json.loads(LEDGER_SAMPLE.read_text(encoding="utf-8"))}
    mine = {row.id: row.model_dump(mode="json", exclude_unset=True) for row in plan.hypotheses}
    assert mine.keys() == sample.keys()
    assert [key for key in mine if mine[key] != sample[key]] == []


def test_ledger_statistics_match_docs06() -> None:
    plan = convert_ledger(read_ledger(LEDGER))
    rows = plan.hypotheses
    assert len(rows) == 61
    assert {row.mode for row in rows} == {"realtime"}
    assert Counter(row.result for row in rows) == {
        "CONFIRMED": 15,
        "NOT_CONFIRMED": 14,
        "INCONCLUSIVE": 23,
        "PENDING": 9,
    }
    assert plan.source_results == {
        "CONFIRMED": 14,
        "DATA_PENDING": 9,
        "INCONCLUSIVE": 23,
        "NOT_CONFIRMED": 14,
        "SOURCE_CONFIRMED": 1,
    }
    assert Counter(row.scope for row in rows) == {
        "market": 26,
        "direction": 26,
        "theme": 5,
        "sector": 3,
        "index": 1,
    }
    assert sum(1 for row in rows if row.rule is None) == 11
    assert sum(1 for row in rows if row.engineVersion) == 50
    # 补跑到 08-11 结算 5 条（08-10 生成），到 08-31 结算 4 条（08-28 生成）。
    pending = Counter(str(row.dueOn) for row in rows if row.result == "PENDING")
    assert pending == {"2026-08-11": 5, "2026-08-31": 4}
    assert plan.discarded == {
        "evidenceIds": 61,
        "generation.sourceSnapshotSha256": 50,
        "generation.mode": 50,
        "settlement.engineVersion": 41,
        "settlement.sourceSnapshotSha256": 41,
        "顶层.schemaVersion": 1,
        "顶层.integrity": 1,
    }
    assert max(row.createdOn for row in rows).isoformat() == "2026-08-28"
    lines = "\n".join(ledger_lines(plan))
    assert "61条" in lines
    assert "DATA_PENDING 9" in lines


def test_result_mapping_and_source_note_prefix() -> None:
    source = next(row for row in raw_ledger()["hypotheses"] if row["result"] == "SOURCE_CONFIRMED")
    pending = next(row for row in raw_ledger()["hypotheses"] if row["result"] == "DATA_PENDING")
    [confirmed, waiting] = converted(source, pending)
    assert confirmed.result == "CONFIRMED"
    assert confirmed.resultNote == "来源确认：" + source["resultNote"]
    assert confirmed.settledOn is not None
    assert waiting.result == "PENDING"
    assert waiting.settledOn is None
    assert waiting.actual is None
    assert waiting.resultNote == pending["resultNote"]
    assert waiting.mode == "realtime"


def test_engine_version_kept_when_present_and_never_invented() -> None:
    with_rule = one_record()
    assert converted(with_rule)[0].engineVersion == with_rule["generation"]["engineVersion"]
    handwritten = next(row for row in raw_ledger()["hypotheses"] if "rule" not in row)
    [row] = converted(handwritten)
    assert row.rule is None
    assert row.engineVersion is None
    # 可选字段没有就不写进请求正文。
    assert "engineVersion" not in row.model_dump(mode="json", exclude_unset=True)


def test_settlement_actual_becomes_actual_and_other_settlement_keys_are_dropped() -> None:
    record = one_record()
    [row] = converted(record)
    assert row.actual is not None
    assert row.actual.model_dump(mode="json", exclude_unset=True) == record["settlement"]["actual"]
    plan = convert_ledger(ledger_of({**raw_ledger(), "hypotheses": [record]}))
    assert plan.discarded["settlement.sourceSnapshotSha256"] == 1
    assert plan.discarded["settlement.engineVersion"] == 1


def add_record_key(row: dict[str, Any]) -> None:
    row["newKey"] = 1


def add_generation_key(row: dict[str, Any]) -> None:
    row["generation"]["newKey"] = 1


def add_settlement_key(row: dict[str, Any]) -> None:
    row["settlement"]["newKey"] = 1


@pytest.mark.parametrize("change", [add_record_key, add_generation_key, add_settlement_key])
def test_unregistered_keys_fail_instead_of_being_dropped(
    change: Callable[[dict[str, Any]], None],
) -> None:
    record = one_record()
    change(record)
    with pytest.raises(MigrationError, match="结构不符合预期") as caught:
        converted(record)
    assert "newKey" in str(caught.value)


def test_unregistered_top_level_key_fails() -> None:
    data = raw_ledger()
    data["extra"] = []
    with pytest.raises(MigrationError, match="结构不符合预期"):
        ledger_of(data)


def test_nested_rule_or_actual_fields_lost_by_contract_fail() -> None:
    record = one_record()
    record["rule"]["thresholds"]["surprise"] = 1.0
    with pytest.raises(MigrationError, match="规则字段没有被契约完整保留"):
        converted(record)
    record = one_record()
    record["settlement"]["actual"]["surprise"] = 1.0
    with pytest.raises(MigrationError, match="实际值字段没有被契约完整保留"):
        converted(record)


def test_contract_violations_name_the_record_and_field_not_the_content() -> None:
    record = one_record(scope="unknown-scope", title="含敏感正文的标题")
    with pytest.raises(MigrationError, match=record["id"]) as caught:
        converted(record)
    assert "scope" in str(caught.value)
    assert "敏感正文" not in str(caught.value)


def test_lifecycle_consistency_is_enforced() -> None:
    pending = next(row for row in raw_ledger()["hypotheses"] if row["result"] == "DATA_PENDING")
    with pytest.raises(MigrationError, match="仍待结算"):
        converted({**pending, "settledOn": "2026-08-31"})
    with pytest.raises(MigrationError, match="没有结算日"):
        converted(one_record(settledOn=None))


def test_duplicate_ids_unknown_results_and_empty_ledger_fail() -> None:
    record = one_record()
    with pytest.raises(MigrationError, match="ID重复"):
        converted(record, deepcopy(record))
    with pytest.raises(MigrationError, match="结果值未登记"):
        converted(one_record(result="MAYBE"))
    with pytest.raises(MigrationError, match="为空"):
        convert_ledger(ledger_of({**raw_ledger(), "hypotheses": []}))


@pytest.mark.parametrize("content", ["not json", "[]", '{"schemaVersion": "2.0.0"}'])
def test_read_ledger_errors_do_not_echo_content(tmp_path: Path, content: str) -> None:
    path = tmp_path / "ledger.json"
    path.write_text(content, encoding="utf-8")
    with pytest.raises(MigrationError) as caught:
        read_ledger(path)
    assert content not in str(caught.value)
    with pytest.raises(MigrationError, match="读不到旧账本"):
        read_ledger(tmp_path / "missing.json")


def test_events_equal_independent_t01_sample() -> None:
    plan = convert_events(read_calendar(CALENDAR))
    sample = {row["id"]: row for row in json.loads(EVENT_SAMPLE.read_text(encoding="utf-8"))}
    mine = {row.id: row.model_dump(mode="json") for row in plan.events}
    assert mine.keys() == sample.keys()
    assert [key for key in mine if mine[key] != sample[key]] == []


def test_event_statistics_match_docs06() -> None:
    plan = convert_events(read_calendar(CALENDAR))
    assert len(plan.events) == 79
    assert Counter(row.status for row in plan.events) == {"confirmed": 74, "pending": 5}
    assert plan.source_statuses == {"OFFICIAL_CONFIRMED": 74, "PENDING_OFFICIAL_CONFIRMATION": 5}
    assert sum(1 for row in plan.events if row.sourceUrl is None) == 1
    assert plan.discarded == {
        "事件.discovery": 78,
        "顶层.schemaVersion": 1,
        "顶层.updatedAt": 1,
        "顶层.boundary": 1,
        "顶层.discovery": 1,
    }
    assert "79条" in "\n".join(event_lines(plan))


def raw_calendar() -> dict[str, Any]:
    data: dict[str, Any] = json.loads(CALENDAR.read_text(encoding="utf-8"))
    return data


def calendar_of(*events: dict[str, Any]) -> LegacyCalendar:
    data = raw_calendar()
    data["events"] = list(events)
    return parse_calendar(data)


def test_event_fields_are_copied_and_discovery_is_dropped() -> None:
    source = raw_calendar()["events"][0]
    [event] = convert_events(calendar_of(source)).events
    assert isinstance(event, MarketEvent)
    expected = {key: value for key, value in source.items() if key not in {"discovery", "status"}}
    assert event.model_dump(mode="json", exclude={"status"}) == expected
    assert event.status == "confirmed"
    assert "discovery" not in event.model_dump()


def test_event_invalid_inputs_fail() -> None:
    source = raw_calendar()["events"][0]
    with pytest.raises(MigrationError, match="ID重复"):
        convert_events(calendar_of(source, deepcopy(source)))
    with pytest.raises(MigrationError, match="状态值未登记"):
        convert_events(calendar_of({**source, "status": "MAYBE"}))
    with pytest.raises(MigrationError, match="开始日期晚于结束日期"):
        convert_events(calendar_of({**source, "startDate": "2026-12-01", "endDate": "2026-11-30"}))
    with pytest.raises(MigrationError, match="结构不符合预期"):
        calendar_of({**source, "newKey": 1})
    with pytest.raises(MigrationError, match="为空"):
        convert_events(calendar_of())


def test_event_without_source_url_keeps_null_not_invented() -> None:
    source = next(row for row in raw_calendar()["events"] if not row.get("sourceUrl"))
    [event] = convert_events(calendar_of({**source, "sourceUrl": ""})).events
    assert event.sourceUrl is None


def test_read_calendar_errors_do_not_echo_content(tmp_path: Path) -> None:
    path = tmp_path / "calendar.json"
    path.write_text('{"events": "含敏感正文"}', encoding="utf-8")
    with pytest.raises(MigrationError) as caught:
        read_calendar(path)
    assert "敏感正文" not in str(caught.value)
    with pytest.raises(MigrationError, match="读不到旧事件日历"):
        read_calendar(tmp_path / "missing.json")
