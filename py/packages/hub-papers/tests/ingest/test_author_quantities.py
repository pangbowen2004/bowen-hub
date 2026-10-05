"""真实作者首轮遗漏设置数量的回归；原始失败保留，不替代模型评测。"""

import json
from copy import deepcopy
from pathlib import Path
from typing import Any

import pytest

from hub_papers.check import check_draft, measurement_numbers
from hub_papers.excerpt import PageText
from hub_papers.pdf.config import load_rules


@pytest.mark.parametrize("mode", ["original", "complete", "wrong_source"])
def test_real_author_result_and_setting_quantities(mode: str) -> None:
    directory = Path(__file__).parent
    recorded: dict[str, Any] = json.loads(
        (directory / "author-quantity-regression.json").read_text()
    )
    value: dict[str, Any] = json.loads((directory / "draft.json").read_text())
    claim = deepcopy(recorded["claim"])
    assert measurement_numbers(claim["metric"]) == ("5", "3.0e-6", "7.7e-4")
    if mode != "original":
        claim["quantities"].append(
            {
                "text": "5",
                "sourceText": "5" if mode == "complete" else "未报告的数量",
                "meaning": "随机选股设置中的标的个数",
            }
        )
    value["evidence"]["claims"].append(claim)
    value["structure"]["pageCount"] = 7
    pages = (
        PageText(1, ("The win rate is 84.1 percent.", "second line")),
        *(PageText(number, ("无关页",)) for number in range(2, 7)),
        PageText(7, tuple(recorded["page"]["lines"])),
    )
    result = check_draft(value, pages, load_rules())
    if mode == "complete":
        assert result.valid
    elif mode == "original":
        assert result.errors == ("主张c16：metric里的数字必须全部列入quantities",)
    else:
        assert result.errors == ("主张c16：数字原文sourceText未出现在对应原文行中",)
