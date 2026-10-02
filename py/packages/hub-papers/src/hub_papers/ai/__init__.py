"""作者/审核统一经Runtime；每次校验从本次输入恢复真实页行，不共享论文状态。"""

import re
from collections.abc import Mapping
from dataclasses import dataclass
from typing import Any

from hub_ai.checks import CheckContext, CheckReport
from hub_contracts import PaperDraft, Review
from hub_papers.check import check_draft
from hub_papers.excerpt import PageText


def numbered_pages(text: str) -> tuple[PageText, ...]:
    """严格还原T30带L行号页文本，拒绝跳页、重复行或未经编号的正文。"""
    pages: list[PageText] = []
    lines: list[str] | None = None
    for row in text.splitlines():
        if not row.strip():
            continue
        header = re.fullmatch(r"=== p\.(\d+) ===", row)
        if header:
            if lines is not None:
                pages.append(PageText(len(pages) + 1, tuple(lines)))
            if int(header[1]) != len(pages) + 1:
                raise ValueError("原文页码必须连续")
            lines = []
        else:
            line = re.fullmatch(r"L(\d+): (.+)", row)
            if lines is None or line is None or int(line[1]) != len(lines) + 1:
                raise ValueError("原文行号必须连续")
            lines.append(line[2])
    if lines is not None:
        pages.append(PageText(len(pages) + 1, tuple(lines)))
    if not pages:
        raise ValueError("原文页文本缺失")
    return tuple(pages)


def paper_draft_check(
    output: dict[str, Any], context: CheckContext, rules: Mapping[str, Any]
) -> CheckReport:
    text = context.inputs.get("pages")
    if not isinstance(text, str):
        return CheckReport("paper_draft", ["原文页文本缺失"], True)
    try:
        pages = numbered_pages(text)
    except ValueError:
        return CheckReport("paper_draft", ["原文页行格式无效"], True)
    if context.total_pages is not None and context.total_pages != len(pages):
        return CheckReport("paper_draft", ["真实页数与页文本不一致"], True)
    result = check_draft(output, pages, rules)
    return CheckReport("paper_draft", list(result.errors), not result.valid)


@dataclass
class WrittenPaper:
    draft: PaperDraft
    reviews: list[Review]
    review_status: str


def review_pages(draft: PaperDraft, maximum: int) -> list[int]:
    return list(
        dict.fromkeys(
            claim.pdfPage.root
            for claim in draft.evidence.claims
            if claim.pdfPage is not None
            and claim.pdfPage.root is not None
            and re.search(r"Table|Tab\.|Figure|Fig\.|表|图", claim.anchor, re.I)
        )
    )[:maximum]
