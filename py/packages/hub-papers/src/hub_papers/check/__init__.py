"""只查结构和可核对的证据；返回中文错误，不制造发布门禁。"""

import re
from collections.abc import Mapping, Sequence
from dataclasses import dataclass
from typing import Any, cast

from pydantic import BaseModel, ValidationError

from hub_contracts import PaperDraft
from hub_papers.excerpt import PageText, page_excerpt


@dataclass(frozen=True)
class DraftCheck:
    draft: PaperDraft | None
    errors: tuple[str, ...]

    @property
    def valid(self) -> bool:
        return self.draft is not None and not self.errors


def measurement_numbers(text: str) -> tuple[str, ...]:
    """模型名称、URL和图表编号不是测量数量；中文相邻数字仍须核对。"""
    text = re.sub(r"https?://[^\s<>()\u4e00-\u9fff，。；、！？：]+", " ", text)
    text = re.sub(r"(?<![A-Za-z0-9_])(Selected|Random)(?=\d)", r"\1 ", text, flags=re.IGNORECASE)
    text = re.sub(
        r"(?<![A-Za-z0-9_.])(?:Table|Tab\.?|Figure|Fig\.?)\s+\d+(?![A-Za-z0-9_.])",
        " ",
        text,
        flags=re.IGNORECASE,
    )
    text = re.sub(r"(?<![A-Za-z0-9_.])[A-Za-z_][A-Za-z0-9_]*(?:-[A-Za-z0-9_]+)*", " ", text)
    pattern = r"(?<![\d.])[-+]?\d+(?:,\d{3})*(?:\.\d+)?(?:[eE][-+]?\d+)?"
    return tuple(number.replace(",", "") for number in re.findall(pattern, text))


def _markdown_lines(article: str) -> list[tuple[str, bool]]:
    result: list[tuple[str, bool]] = []
    fence: str | None = None
    for line in article.splitlines():
        marker = re.match(r"^\s{0,3}(`{3,}|~{3,})", line)
        if marker:
            if fence is None:
                fence = marker[1]
            elif marker[1][0] == fence[0] and len(marker[1]) >= len(fence):
                fence = None
            result.append((line, False))
        else:
            result.append((line, fence is None))
    return result


def paragraphs(article: str) -> tuple[str, ...]:
    # 空行划段；只剔除真正标题，代码块中的##不能当标题。
    body = "\n".join(
        line
        for line, outside in _markdown_lines(article)
        if not (outside and re.match(r"^\s{0,3}#{1,6}\s+", line))
    )
    return tuple(block.strip() for block in re.split(r"\n\s*\n", body.strip()) if block.strip())


def _empty_required(model: BaseModel, path: str, errors: list[str]) -> None:
    for name, info in type(model).model_fields.items():
        value = getattr(model, name)
        location = f"{path}.{name}" if path else name
        if info.is_required() and isinstance(value, str) and not value.strip():
            errors.append(f"{location}：必填文字不能为空")
        if isinstance(value, BaseModel):
            _empty_required(value, location, errors)
        elif isinstance(value, list):
            for index, item in enumerate(cast(list[Any], value)):
                if isinstance(item, BaseModel):
                    _empty_required(item, f"{location}[{index}]", errors)
                elif isinstance(item, str) and not item.strip():
                    errors.append(f"{location}[{index}]：文字条目不能为空")


def check_draft(value: Any, pages: Sequence[PageText], rules: Mapping[str, Any]) -> DraftCheck:
    try:
        draft = PaperDraft.model_validate(value)
    except ValidationError as error:
        return DraftCheck(
            None,
            tuple(
                f"{'.'.join(map(str, e['loc']))}：字段缺失、类型或结构不符合论文草稿契约"
                for e in error.errors(include_input=False)
            ),
        )
    errors: list[str] = []
    _empty_required(draft, "", errors)
    headings = [
        match[1]
        for line, outside in _markdown_lines(draft.guide.article)
        if outside and (match := re.match(r"^\s{0,3}##\s+(.+?)\s*#*\s*$", line))
    ]
    if headings != rules["articleHeadings"]:
        errors.append("导读标题：必须恰好包含规定的8个二级标题，且顺序一致")
    blocks = paragraphs(draft.guide.article)
    if len(blocks) != len(draft.evidence.articleBlocks):
        errors.append("段落对应：articleBlocks数量必须等于正文段落数（纯标题行不计）")
    claim_ids = {claim.id for claim in draft.evidence.claims}
    if len(claim_ids) != len(draft.evidence.claims):
        errors.append("引用覆盖：claims的id不能重复")
    for index, block in enumerate(draft.evidence.articleBlocks):
        if block.claimOrigin == "paper_supported" and (
            not block.claimIds or any(key not in claim_ids for key in block.claimIds)
        ):
            errors.append(f"段落{index + 1}：原文支持段落至少引用1个存在的claim")
        elif any(key not in claim_ids for key in block.claimIds):
            errors.append(f"段落{index + 1}：claimIds引用了不存在的主张")
        if (
            block.claimOrigin == "llm_inferred"
            and index < len(blocks)
            and not any(marker in blocks[index] for marker in rules["inferredMarkers"])
        ):
            errors.append(f"段落{index + 1}：推断必须明确写出解释性例子、核查建议或我的推断")
    if draft.structure.pageCount != len(pages):
        errors.append("页数：structure.pageCount必须与实际PDF页数一致")
    for claim in draft.evidence.claims:
        label = f"主张{claim.id}"
        excerpt = ""
        if claim.pdfPage is None or claim.pdfPage.root is None:
            if claim.claimOrigin == "paper_supported" or claim.sourceLines or claim.quantities:
                errors.append(f"{label}：引用原文必须有合法PDF页码和行号")
        else:
            try:
                excerpt = page_excerpt(pages, claim.pdfPage.root, claim.sourceLines)
            except ValueError as error:
                errors.append(f"{label}：{error}")
        for quantity in claim.quantities:
            if not quantity.sourceText.strip() or quantity.sourceText not in excerpt:
                errors.append(f"{label}：数字原文sourceText未出现在对应原文行中")
        available = {number for q in claim.quantities for number in measurement_numbers(q.text)}
        if any(number not in available for number in measurement_numbers(claim.metric)):
            errors.append(f"{label}：metric里的数字必须全部列入quantities")
    if draft.resources.code.status == "verified" and not (draft.resources.code.url or "").strip():
        errors.append("代码链接：verified状态必须提供url")
    return DraftCheck(draft, tuple(errors))
