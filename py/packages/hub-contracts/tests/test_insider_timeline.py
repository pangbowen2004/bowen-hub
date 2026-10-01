"""个股时间线保留内部人每笔交易的自然键，不改变旧变体。"""

import json
from pathlib import Path

import pytest
from pydantic import ValidationError

from hub_contracts.generated.models import NewsFullTimelineItem, NewsTimelineItem


def test_insider_transaction_round_trip() -> None:
    trade = {
        "accession": "0000000000-26-000001",
        "transactionIndex": 2,
        "ticker": "NVDA",
        "insider": "测试姓名",
        "role": "董事",
        "code": "P",
        "shares": 123,
        "priceUsd": None,
        "valueUsd": None,
        "filedAt": "2026-10-01T12:00:00Z",
        "url": "https://www.sec.gov/example",
    }
    payload = {"kind": "insider", "at": trade["filedAt"], "insiderTrade": trade}
    parsed = NewsFullTimelineItem.model_validate(payload)
    assert parsed.model_dump(mode="json") == payload
    assert parsed.root.kind == "insider"
    assert parsed.root.insiderTrade.transactionIndex == 2
    with pytest.raises(ValidationError):
        NewsTimelineItem.model_validate({**payload, "kind": "article"})
    with pytest.raises(ValidationError):
        NewsTimelineItem.model_validate(payload)


def test_old_timeline_variants_remain_compatible() -> None:
    root = Path(__file__).resolve().parents[4]
    for name in ["ArticleTimelineItem", "FilingTimelineItem", "EarningsTimelineItem"]:
        payload = json.loads(
            (root / "fixtures" / "samples" / "news" / f"{name}.synthetic.json").read_text()
        )
        assert NewsFullTimelineItem.model_validate(payload).model_dump(
            mode="json"
        ) == NewsTimelineItem.model_validate(payload).model_dump(mode="json")
