"""空库首日只补算API确实缺失的历史摘要；不发布预热MarketDay。"""

import json
from collections.abc import Callable
from datetime import date, datetime
from pathlib import Path
from typing import Any

from hub_contracts import MarketDaySummary
from hub_market.compute.day import compute, day_summary
from hub_providers.tushare.collection import Collection

from .inputs import compute_input


def summary(
    root: Path,
    directory: Path,
    on: date,
    previous: date,
    collector: Callable[[date], Collection],
    templates: dict[str, Any],
    *,
    now: datetime,
    source_version: str,
) -> tuple[MarketDaySummary, dict[str, Any]]:
    path = directory / f"{on}.json"
    if path.exists():
        try:
            raw = json.loads(path.read_text())
            cached = MarketDaySummary.model_validate(raw["summary"])
            if (
                raw["cacheType"] == "t20-t21-summary-v1"
                and raw["date"] == str(on)
                and raw["previousDate"] == str(previous)
                and cached.date == on
                and raw["sourceVersion"] == source_version
                and raw["source"] == "T20 collect → T21 compute/day_summary"
                and date.fromisoformat(raw["membershipAsOf"])
                and datetime.fromisoformat(raw["generatedAt"]).tzinfo is not None
            ):
                return cached, {
                    "date": str(on),
                    "cached": True,
                    "membershipAsOf": raw["membershipAsOf"],
                    "sourceVersion": raw["sourceVersion"],
                }
        except ValueError, KeyError, TypeError, OSError:
            pass
    value = collector(on)
    if value.day != on or not value.core_ready:
        raise ValueError("历史预热核心数据未就绪")
    computed = compute(compute_input(root, value, previous), templates)
    result = day_summary(computed)
    metadata = {
        "cacheType": "t20-t21-summary-v1",
        "date": str(on),
        "previousDate": str(previous),
        "source": "T20 collect → T21 compute/day_summary",
        "sourceVersion": source_version,
        "generatedAt": now.isoformat(),
        "membershipAsOf": str(value.membership_as_of),
        "missing": value.missing,
        "requests": [
            {
                "key": key,
                "endpoint": request.endpoint,
                "params": request.params,
                "rows": value.tables[key].height if key in value.tables else None,
            }
            for key, request in sorted(value.requests.items())
        ],
        "summary": result.model_dump(mode="json"),
    }
    path.parent.mkdir(parents=True, exist_ok=True)
    path.write_text(json.dumps(metadata, ensure_ascii=False, indent=2) + "\n")
    return result, {
        "date": str(on),
        "cached": False,
        "membershipAsOf": str(value.membership_as_of),
        "sourceVersion": source_version,
    }
