"""前两页编号优先级与无编号英文标题短名；版本选择是纯计算。"""

import re
from collections.abc import Sequence
from dataclasses import dataclass

from hub_contracts import Paper
from hub_papers.excerpt import PageText


@dataclass(frozen=True)
class PaperIdentity:
    base_id: str
    version: str | None = None


@dataclass(frozen=True)
class IdentityChoice:
    id: str
    version_of: str | None = None


def identify(pages: Sequence[PageText]) -> PaperIdentity | None:
    text = "\n".join(line for page in pages[:2] for line in page.lines)
    arxiv = re.search(
        r"(?:arxiv\s*:\s*|arxiv\.org/(?:abs|pdf)/)(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?/\d{7})(v\d+)?",
        text,
        re.IGNORECASE,
    )
    if arxiv:
        return PaperIdentity(
            "arxiv-" + arxiv[1].lower().replace("/", "-"), arxiv[2].lower() if arxiv[2] else None
        )
    acl = re.search(
        r"(?:aclanthology\.org/|anthology\s*:\s*)(\d{4}\.[a-z][a-z0-9_.-]*\.\d+|[A-Z]\d{2}-\d{4})",
        text,
        re.IGNORECASE,
    )
    if acl:
        return PaperIdentity("acl-" + acl[1].lower())
    doi = re.search(r"\b(10\.\d{4,9}/[-._;()/:A-Z0-9]+)", text, re.IGNORECASE)
    if doi:
        return PaperIdentity("doi-" + doi[1].rstrip(".,;)").lower().replace("/", "-"))
    ssrn = re.search(
        r"(?:ssrn(?:\s*(?:id|number|abstract))?\s*[:=]?\s*|ssrn\.com/(?:abstract=|sol3/papers\.cfm\?abstract_id=))(\d{4,})",
        text,
        re.IGNORECASE,
    )
    if ssrn:
        return PaperIdentity("ssrn-" + ssrn[1])
    return None


def custom_identity(
    title: str, stop_words: Sequence[str], *, words: int = 6, max_length: int = 40
) -> PaperIdentity:
    parts = [
        word.lower()
        for word in re.findall(r"[A-Za-z0-9]+", title)
        if word.lower() not in set(stop_words)
    ]
    short = "-".join(parts[:words])[:max_length].rstrip("-")
    if not short:
        raise ValueError("无公开编号时需要能生成短名的英文标题")
    return PaperIdentity("custom-" + short)


def choose_identity(
    identity: PaperIdentity, existing: Sequence[Paper], *, retry_id: str | None = None
) -> IdentityChoice:
    if retry_id:
        return IdentityChoice(retry_id)
    matches = [
        p
        for p in existing
        if p.id == identity.base_id or re.fullmatch(re.escape(identity.base_id) + r"-v\d+", p.id)
    ]
    if not matches:
        return IdentityChoice(identity.base_id)

    def version(value: str | None) -> str | None:
        match = re.search(r"\bv\d+\b", value or "", re.IGNORECASE)
        return match[0].lower() if match else value

    candidate_version = version(identity.version)
    if any(version(p.meta.version) == candidate_version for p in matches):
        raise ValueError("相同编号与版本已存在")
    # 未知版本不能证明新版本，交调用方补元数据后重试。
    if candidate_version is None or any(version(p.meta.version) is None for p in matches):
        raise ValueError("编号已存在且版本未知，不能擅自新增版本")
    number = 2
    occupied = {p.id for p in existing}
    while f"{identity.base_id}-v{number}" in occupied:
        number += 1
    target = (
        identity.base_id if identity.base_id in occupied else min(matches, key=lambda p: p.id).id
    )
    return IdentityChoice(f"{identity.base_id}-v{number}", target)
