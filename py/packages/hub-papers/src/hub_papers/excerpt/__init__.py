"""页内行号统一从1开始；原文摘录只来自指定连续行。"""

import json
from collections.abc import Sequence
from dataclasses import dataclass
from typing import Any, cast

from hub_contracts import PaperDraft


@dataclass(frozen=True)
class PageText:
    page: int
    lines: tuple[str, ...]


def parse_pages(text: str) -> tuple[PageText, ...]:
    pages: list[PageText] = []
    for row in text.splitlines():
        value = json.loads(row)
        if not isinstance(value, dict):
            raise ValueError("页文本每行必须是对象")
        record = cast(dict[str, Any], value)
        page, lines = record.get("page"), record.get("lines")
        if type(page) is not int or page != len(pages) + 1:
            raise ValueError("页文本页码必须从1连续排列")
        if not isinstance(lines, list) or any(
            not isinstance(line, str) or not line.strip() for line in cast(list[Any], lines)
        ):
            raise ValueError("页文本lines必须是非空行字符串数组")
        pages.append(PageText(page, tuple(cast(list[str], lines))))
    if not pages:
        raise ValueError("页文本不能为空")
    return tuple(pages)


def page_excerpt(pages: Sequence[PageText], page: int, lines: Sequence[int]) -> str:
    if not 1 <= page <= len(pages):
        raise ValueError("PDF页码超出范围")
    if len(lines) != 2 or any(type(n) is not int for n in lines):
        raise ValueError("sourceLines必须是两个整数起止行号")
    start, end = lines
    if not 1 <= start <= end <= len(pages[page - 1].lines):
        raise ValueError("sourceLines起止行号超出该页范围")
    return "\n".join(pages[page - 1].lines[start - 1 : end])


def pages_text(pages: Sequence[PageText], *, numbered: bool = False) -> str:
    return "\n\n".join(
        f"=== p.{page.page} ===\n"
        + "\n".join(f"L{n}: {line}" if numbered else line for n, line in enumerate(page.lines, 1))
        for page in pages
    )


def fill_source_excerpts(draft: PaperDraft, pages: Sequence[PageText]) -> PaperDraft:
    """调用方先校验；返回副本，不修改原草稿或伪造无页码推断的出处。"""
    result = draft.model_copy(deep=True)
    for claim in result.evidence.claims:
        if claim.pdfPage is not None and claim.pdfPage.root is not None:
            claim.sourceExcerpt = page_excerpt(pages, claim.pdfPage.root, claim.sourceLines)
        else:
            claim.sourceExcerpt = None
    result.evidence.legacyAnchors = False
    return result
