"""薄IO编排：文件在本地完成抽取/写作；所有持久化只经过已登记API。"""

import asyncio
import json
import re
from collections.abc import Callable
from datetime import UTC, datetime
from pathlib import Path
from time import monotonic
from typing import Any
from urllib.parse import quote, urlparse
from uuid import uuid4

from pydantic import ValidationError

from hub_ai.checks import CheckRegistry
from hub_ai.gateway import GatewayAdapter
from hub_ai.registry import Registry
from hub_ai.runtime import Adapter, Runtime
from hub_contracts import (
    AiCall,
    Paper,
    PaperDraft,
    PaperPage,
    PaperRelation,
    PaperWrite,
    Run,
    Upload,
)
from hub_core.api import ApiClient
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_papers.ai import WrittenPaper
from hub_papers.derive import derive_documents, summarize
from hub_papers.ids import IdentityChoice, choose_identity, custom_identity, identify
from hub_papers.ingest.author import write_and_review
from hub_papers.ingest.checks import register_checks
from hub_papers.pdf import extract_pdf
from hub_papers.pdf.config import config_root, load_derivation_config, load_rules


class Deadline:
    """应用总期限独立于单次模型预算，失败收尾不受此检查拦截。"""

    def __init__(self, seconds: float, clock: Callable[[], float]) -> None:
        if seconds <= 0:
            raise ValueError("论文总运行期限必须为正数")
        self.clock = clock
        self.end = clock() + seconds

    def remaining(self) -> float:
        remaining = self.end - self.clock()
        if remaining <= 0:
            raise TimeoutError("论文处理超过总运行期限")
        return remaining

    def check(self) -> None:
        self.remaining()


class Store:
    def __init__(self, settings: Settings, http: HttpClient) -> None:
        self.api = ApiClient(settings, http)
        if settings.hub_service_token is None:
            raise ValueError("缺少API服务令牌")
        self.headers = {"Authorization": "Bearer " + settings.hub_service_token.get_secret_value()}
        self.settings = settings
        self.http = http

    def request(self, method: str, path: str, **kwargs: Any) -> None:
        self.http.request(
            method, self.api.base_url + path, source="hub-api", headers=self.headers, **kwargs
        )

    def patch_upload(self, upload_id: str | None, **values: Any) -> None:
        if upload_id:
            self.request(
                "PATCH", "/v1/internal/papers/uploads/" + quote(upload_id, safe=""), json=values
            )

    def read(self, path: str) -> bytes:
        return self.http.request(
            "GET", self.api.base_url + path, source="hub-api", headers=self.headers
        ).content

    def papers(self, check: Callable[[], None] = lambda: None) -> list[Paper]:
        result: list[Paper] = []
        path = "/v1/papers?limit=100"
        seen: set[str] = set()
        while True:
            check()
            page = self.api.get(path, PaperPage)
            check()
            for p in page.items:
                check()
                result.append(self.api.get("/v1/papers/" + quote(p.id, safe=""), Paper))
                check()
            if page.nextCursor is None:
                return result
            if page.nextCursor in seen:
                raise ValueError("API分页游标重复")
            seen.add(page.nextCursor)
            path = "/v1/papers?limit=100&cursor=" + quote(page.nextCursor, safe="")

    def files(
        self, paper_id: str, source: Path, work: Path, check: Callable[[], None] = lambda: None
    ) -> None:
        base = "/v1/internal/papers/" + quote(paper_id, safe="")
        for name, path, media in [
            ("source.pdf", source, "application/pdf"),
            ("pages.jsonl", work / "pages.jsonl", "application/x-ndjson"),
            ("pages.txt", work / "pages.txt", "text/plain"),
        ]:
            check()
            with path.open("rb") as body:
                self.http.request(
                    "PUT",
                    self.api.base_url + base + "/files/" + name,
                    source="hub-api",
                    headers={
                        **self.headers,
                        "Content-Type": media,
                        "Content-Length": str(path.stat().st_size),
                    },
                    content=body,
                    retry=False,
                )
            check()
        for path in sorted((work / "pages").glob("*.png"), key=lambda p: int(p.stem)):
            check()
            with path.open("rb") as body:
                self.http.request(
                    "PUT",
                    self.api.base_url + base + "/pages/" + path.stem,
                    source="hub-api",
                    headers={
                        **self.headers,
                        "Content-Type": "image/png",
                        "Content-Length": str(path.stat().st_size),
                    },
                    content=body,
                    retry=False,
                )
            check()

    def persist(
        self, paper: Paper, written: WrittenPaper, check: Callable[[], None] = lambda: None
    ) -> None:
        base = "/v1/internal/papers/" + quote(paper.id, safe="")
        check()
        self.api.put(base, PaperWrite(paper=paper, summary=summarize(paper)))
        check()
        for review in written.reviews:
            check()
            self.request(
                "POST", base + "/reviews", json=review.model_dump(mode="json"), retry=False
            )
            check()
        spaces, aliases = load_derivation_config()
        values = derive_documents(self.papers(check), spaces, aliases)
        check()
        for key, value in values.items():
            check()
            self.api.put("/v1/internal/documents/" + quote(key, safe=""), value)
            check()


def arxiv_pdf(url: str) -> str:
    parsed = urlparse(url)
    if (
        parsed.scheme != "https"
        or parsed.netloc != "arxiv.org"
        or parsed.query
        or parsed.fragment
        or not re.fullmatch(
            r"/(?:abs|pdf)/(?:\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?/\d{7})(?:v[1-9]\d*)?(?:\.pdf)?",
            parsed.path,
        )
    ):
        raise ValueError("仅支持arXiv论文链接")
    return "https://arxiv.org/pdf/" + re.sub(r"\.pdf$", "", parsed.path.split("/", 2)[2])


def paper_from_draft(
    paper_id: str,
    written: WrittenPaper,
    existing: Paper | None = None,
    version_of: str | None = None,
) -> Paper:
    today = datetime.now(UTC).date()
    fields = written.draft.model_dump(mode="json")
    if existing:
        value = existing.model_dump(mode="json")
        value.update(fields)
        value["status"].update(review=written.review_status, updatedAt=today.isoformat())
    else:
        value = {
            **fields,
            "schemaVersion": 1,
            "id": paper_id,
            "spaces": ["general-research"],
            "status": {
                "visibility": "private",
                "review": written.review_status,
                "readingDepth": "R0",
                "nextAction": "通读导读草稿，确认后公开",
                "updatedAt": today.isoformat(),
            },
        }
        if version_of:
            value["relations"] = [
                PaperRelation(target=version_of, type="version_of").model_dump(mode="json")
            ]
    return Paper.model_validate(value)


def execute(
    store: Store,
    *,
    upload_id: str | None = None,
    source: Path | None = None,
    arxiv: str | None = None,
    paper_id: str | None = None,
    instructions: str | None = None,
    supplied: PaperDraft | None = None,
    work: Path,
    adapter: Adapter | None = None,
    total_timeout: float = 45 * 60,
    clock: Callable[[], float] = monotonic,
) -> Paper:
    deadline = Deadline(total_timeout, clock)
    started = datetime.now(UTC)
    run_id = "papers-" + ("revise" if paper_id else "ingest") + "-" + str(uuid4())
    run = Run(
        id=run_id,
        job="papers-revise" if paper_id else "papers-ingest",
        date=started.date(),
        status="running",
        startedAt=started,
        finishedAt=None,
        stats={},
        error=None,
    )
    store.api.write_run(run)
    calls: list[AiCall] = []

    async def record(call: AiCall) -> None:
        deadline.check()
        calls.append(call)
        store.api.write_ai_calls([call])
        deadline.check()

    def phase(status: str) -> None:
        deadline.check()
        store.patch_upload(upload_id, status=status)
        deadline.check()

    try:
        deadline.check()
        registry = Registry(config_root().parent)
        checks = CheckRegistry()
        register_checks(checks)
        runtime = Runtime(
            registry,
            adapter or GatewayAdapter(registry, store.settings),
            checks=checks,
            record=record,
        )
        work.mkdir(parents=True, exist_ok=True)
        existing = (
            store.api.get("/v1/papers/" + quote(paper_id, safe=""), Paper) if paper_id else None
        )
        deadline.check()
        upload = (
            store.api.get("/v1/internal/papers/uploads/" + quote(upload_id, safe=""), Upload)
            if upload_id
            else None
        )
        deadline.check()
        store.patch_upload(upload_id, status="extracting", error=None)
        deadline.check()
        if paper_id:
            source = work / "source.pdf"
            source.write_bytes(store.read("/v1/papers/" + quote(paper_id, safe="") + "/source.pdf"))
        elif upload:
            arxiv = upload.arxivUrl
            if upload.filename:
                source = work / "source.pdf"
                source.write_bytes(
                    store.read("/v1/internal/papers/uploads/" + quote(upload.id, safe="") + "/file")
                )
        if arxiv:
            deadline.check()
            source = work / "source.pdf"
            source.write_bytes(store.http.request("GET", arxiv_pdf(arxiv), source="arxiv").content)
        if source is None:
            raise ValueError("缺少PDF输入")
        deadline.check()
        pages = extract_pdf(source, work)
        deadline.check()
        choice = None
        identifier = paper_id
        if not identifier:
            identity = identify(pages)
            if identity:
                papers = store.papers(deadline.check)
                retry_id = upload.paperId if upload else None
                existing = next((p for p in papers if p.id == retry_id), None) if retry_id else None
                if retry_id and existing is None:
                    # 首次已定ID但尚未写Paper：恢复同编号的版本关系，不能再分配新ID。
                    recovered = choose_identity(identity, papers)
                    choice = IdentityChoice(retry_id, recovered.version_of)
                else:
                    choice = choose_identity(identity, papers, retry_id=retry_id)
                identifier = choice.id
                store.patch_upload(upload_id, paperId=identifier)
            elif upload and upload.paperId:
                identifier = upload.paperId
        if existing is None and upload and upload.paperId:
            existing = next((p for p in store.papers(deadline.check) if p.id == identifier), None)
        previous = None
        if existing and supplied is None:
            try:
                previous = PaperDraft.model_validate(existing.model_dump())
            except ValidationError:
                # 迁移旧稿仅作背景，不把旧锚点当作新稿的有效证据。
                background = {
                    k: existing.model_dump(mode="json")[k]
                    for k in ("meta", "guide", "evidence", "structure", "resources")
                }
                instructions = (
                    (instructions or "")
                    + "\n旧公共草稿背景（须按真实原文重建，旧证据不是有效出处）：\n"
                    + json.dumps(background, ensure_ascii=False)
                )

        def resolve_id(draft: PaperDraft) -> str:
            nonlocal identifier, choice
            deadline.check()
            if identifier is None:
                rules = load_rules()
                identity = custom_identity(
                    draft.meta.title,
                    rules["customStopWords"],
                    words=rules["customWords"],
                    max_length=rules["customMaxLength"],
                )
                choice = choose_identity(identity, store.papers(deadline.check))
                identifier = choice.id
                store.patch_upload(upload_id, paperId=identifier)
            return identifier

        async def generate() -> WrittenPaper:
            remaining = deadline.remaining()
            return await asyncio.wait_for(
                write_and_review(
                    runtime,
                    identifier or "待定",
                    pages,
                    run_id=run_id,
                    known_meta=existing.meta if existing else None,
                    previous=previous,
                    instructions=instructions,
                    supplied=supplied,
                    image_directory=work / "pages",
                    phase=phase,
                    resolve_id=resolve_id,
                ),
                timeout=remaining,
            )

        written = asyncio.run(generate())
        deadline.check()
        assert identifier is not None
        paper = paper_from_draft(
            identifier, written, existing, choice.version_of if choice else None
        )
        store.files(identifier, source, work, deadline.check)
        store.persist(paper, written, deadline.check)
        deadline.check()
        store.patch_upload(upload_id, status="ready", error=None)
        run.status = "succeeded"
        run.stats = {
            "paperId": identifier,
            "review": written.review_status,
            "aiCalls": len(calls),
            "costUsd": sum(call.costUsd for call in calls),
        }
        return paper
    except Exception as error:
        run.status = "failed"
        known_errors = {
            "相同编号与版本已存在",
            "编号已存在且版本未知，不能擅自新增版本",
            "缺少PDF输入",
            "PDF无法打开或格式损坏",
            "PDF被加密或没有页面",
            "作者能力失败",
            "草稿校验修订已耗尽",
            "提交草稿校验失败",
            "仅支持arXiv论文链接",
        }
        run.error = (
            "论文处理超过总运行期限，请重试"
            if isinstance(error, TimeoutError)
            else (
                str(error)
                if isinstance(error, ValueError) and str(error) in known_errors
                else "论文处理失败，请检查运行记录或重试"
            )
        )
        store.patch_upload(upload_id, status="failed", error=run.error)
        raise
    finally:
        run.stats.update(aiCalls=len(calls), costUsd=sum(call.costUsd for call in calls))
        run.finishedAt = datetime.now(UTC)
        store.api.write_run(run)
