"""PyMuPDF的薄IO层：页文本与PNG落到调用方本地目录。"""

import json
from pathlib import Path
from types import TracebackType
from typing import Protocol, cast

import pymupdf

from hub_papers.excerpt import PageText, pages_text
from hub_papers.pdf.config import load_rules


class _Pixmap(Protocol):
    def save(self, filename: Path) -> None: ...


class _Page(Protocol):
    def get_text(self, option: str, *, sort: bool) -> str: ...
    def get_pixmap(self, *, dpi: int, alpha: bool) -> _Pixmap: ...


class _Document(Protocol):
    page_count: int
    needs_pass: bool

    def load_page(self, index: int) -> _Page: ...
    def __enter__(self) -> _Document: ...
    def __exit__(
        self,
        kind: type[BaseException] | None,
        value: BaseException | None,
        traceback: TracebackType | None,
    ) -> None: ...


def extract_pdf(
    source: Path, output: Path, *, image_dpi: int | None = None
) -> tuple[PageText, ...]:
    if image_dpi is None:
        image_dpi = int(load_rules()["pageImageDpi"])
    if image_dpi < 1:
        raise ValueError("页图分辨率必须为正整数")
    try:
        document = cast(_Document, pymupdf.open(source))
    except Exception as error:
        raise ValueError("PDF无法打开或格式损坏") from error
    with document:
        if document.needs_pass or document.page_count < 1:
            raise ValueError("PDF被加密或没有页面")
        output.mkdir(parents=True, exist_ok=True)
        images = output / "pages"
        images.mkdir(exist_ok=True)
        pages: list[PageText] = []
        for index in range(document.page_count):
            page = document.load_page(index)
            text = page.get_text("text", sort=True)
            lines = tuple(line.strip() for line in text.splitlines() if line.strip())
            pages.append(PageText(index + 1, lines))
            page.get_pixmap(dpi=image_dpi, alpha=False).save(images / f"{index + 1}.png")
        for existing in images.glob("*.png"):
            if existing.stem.isdecimal() and int(existing.stem) > len(pages):
                existing.unlink()
        (output / "pages.jsonl").write_text(
            "\n".join(
                json.dumps({"page": p.page, "lines": p.lines}, ensure_ascii=False) for p in pages
            )
            + "\n",
            encoding="utf-8",
        )
        (output / "pages.txt").write_text(pages_text(pages), encoding="utf-8")
    return tuple(pages)
