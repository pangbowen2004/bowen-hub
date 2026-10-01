"""完整成员证据可选、保留、类型受约束；旧快照不伪造证据。"""

import json
from pathlib import Path
from typing import Any

import pytest
from pydantic import BaseModel, ValidationError

from hub_contracts import DirectionPersistenceActual, DirectionPersistenceBaseline, MarketDirection

ROOT = Path(__file__).resolve().parents[4]
DAY = json.loads((ROOT / "fixtures/samples/markets/MarketDay.2026-08-28.json").read_text())
DIRECTION: dict[str, Any] = DAY["directions"]["items"][0]
BASELINE: dict[str, Any] = {
    "membershipAsOf": DAY["directions"]["membershipAsOf"],
    "return1d": DIRECTION["return1d"],
    "advanceShare": DIRECTION["advanceShare"],
    "amountShare": DIRECTION["amountShare"],
}
ACTUAL: dict[str, Any] = {
    "membershipAsOf": BASELINE["membershipAsOf"],
    "relativeVsAllA": DIRECTION["relativeVsAllA"],
    "advanceShare": DIRECTION["advanceShare"],
    "medianReturn1d": DIRECTION["medianReturn1d"],
    "amountShare": DIRECTION["amountShare"],
}


@pytest.mark.parametrize(
    "model,payload",
    [
        (MarketDirection, DIRECTION),
        (DirectionPersistenceBaseline, BASELINE),
        (DirectionPersistenceActual, ACTUAL),
    ],
)
def test_members_are_optional_and_roundtrip(
    model: type[BaseModel], payload: dict[str, Any]
) -> None:
    old = model.model_validate(payload)
    assert "memberCodes" not in old.model_dump(mode="json", exclude_unset=True)
    codes = ["000001.SZ", "600000.SH"]
    new = model.model_validate({**payload, "memberCodes": codes})
    dumped = new.model_dump(mode="json", exclude_unset=True)
    assert dumped["memberCodes"] == codes
    assert model.model_validate_json(new.model_dump_json()).model_dump()["memberCodes"] == codes
    # 数量相同而成员不同必须保留差异，供结算纯函数比较集合。
    changed = model.model_validate({**payload, "memberCodes": ["000002.SZ", "600000.SH"]})
    assert changed.model_dump()["memberCodes"] != new.model_dump()["memberCodes"]
    with pytest.raises(ValidationError):
        model.model_validate({**payload, "memberCodes": [42]})
