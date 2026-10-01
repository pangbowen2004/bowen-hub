"""本地页文本的薄IO边界。"""

from pathlib import Path

from hub_papers.excerpt import PageText, parse_pages


def read_pages(path: Path) -> tuple[PageText, ...]:
    return parse_pages(path.read_text(encoding="utf-8"))
