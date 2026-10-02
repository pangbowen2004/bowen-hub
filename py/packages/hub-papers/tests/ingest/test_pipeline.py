"""真实Runtime+合成PDF+API回放；修订、失败和隐私保留不联网。"""

import asyncio
import json
from copy import deepcopy
from pathlib import Path
from typing import Any, cast

import httpx
import pymupdf
import pytest
from pydantic import SecretStr
from typer.testing import CliRunner

from hub_ai.checks import CheckContext, CheckRegistry
from hub_ai.registry import Registry
from hub_ai.runtime import Request, Response, Runtime, Usage
from hub_contracts import Paper, PaperDraft
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_papers.ai import (
    numbered_pages,
    review_pages,
)
from hub_papers.excerpt import PageText, pages_text
from hub_papers.ingest import cli, commands
from hub_papers.ingest.author import write_and_review
from hub_papers.ingest.checks import paper_draft_check, register_checks
from hub_papers.ingest.pipeline import Store, arxiv_pdf, execute
from hub_papers.localtask import commands as local

ROOT = Path(__file__).resolve().parents[5]
PAGES = (
    PageText(1, ("The win rate is 84.1 percent.", "second line")),
    PageText(2, ("another page",)),
)


def draft() -> dict[str, Any]:
    return json.loads(Path(__file__).with_name("draft.json").read_text())


def review(decision: str = "pass", severity: str = "P1") -> dict[str, Any]:
    return {
        "decision": decision,
        "readerRestatement": "说明输入、机制、输出与边界。",
        "independentSourceCheck": {
            "pdfPage": 1,
            "sourceExcerpt": PAGES[0].lines[0],
            "minimumClaim": "仅合成观察",
            "counterexampleOrLimit": "不作泛化",
            "comparisonToArticle": "已对应",
        },
        "sampledClaimIds": ["c1"],
        "checks": {
            key: {"status": "pass", "evidence": "原文第一页核验"}
            for key in ("identity", "explanation", "method", "results", "boundaries", "sources")
        },
        "findings": []
        if decision == "pass"
        else [{"severity": severity, "location": "结论段", "fix": "补边界"}],
        "pagesChecked": [1, 2],
        "visualPagesChecked": [],
    }


class FakeAdapter:
    def __init__(self, outputs: list[Any]) -> None:
        self.outputs = iter(outputs)
        self.requests: list[Request] = []

    async def generate(self, request: Request) -> Response:
        self.requests.append(request)
        value = next(self.outputs)
        if isinstance(value, Exception):
            raise value
        return Response(deepcopy(value), Usage(50, 20))


def runtime(adapter: FakeAdapter) -> Runtime:
    checks = CheckRegistry()
    register_checks(checks)
    return Runtime(Registry(ROOT), adapter, checks=checks)


def pdf(path: Path) -> None:
    with pymupdf.open() as document:
        for page in PAGES:
            cast(Any, document.new_page()).insert_text((50, 50), "\n".join(page.lines))
        cast(Any, document).save(path)


class Replay:
    def __init__(self, existing: Paper | None = None, fail_path: str | None = None) -> None:
        self.papers = {} if existing is None else {existing.id: existing.model_dump(mode="json")}
        self.calls: list[tuple[str, str]] = []
        self.writes: dict[str, list[Any]] = {}
        self.fail_path = fail_path
        self.upload: dict[str, Any] = {
            "id": "upload",
            "filename": "source.pdf",
            "arxivUrl": None,
            "status": "queued",
            "error": None,
            "createdAt": "2026-10-02T00:00:00Z",
            "updatedAt": "2026-10-02T00:00:00Z",
            "paperId": None,
        }
        self.pdf_bytes = b""

    def handle(self, request: httpx.Request) -> httpx.Response:
        path = request.url.path
        self.calls.append((request.method, path))
        assert request.headers["Authorization"] == "Bearer OFFLINE_TEST"
        if path == self.fail_path:
            return httpx.Response(400)
        if request.method in {"POST", "PUT", "PATCH"}:
            try:
                value = json.loads(request.content)
            except ValueError, UnicodeDecodeError:
                value = request.content
            self.writes.setdefault(path, []).append(value)
            if (
                path.startswith("/v1/internal/papers/")
                and isinstance(value, dict)
                and "paper" in value
            ):
                self.papers[value["paper"]["id"]] = value["paper"]
            if request.method == "PATCH":
                self.upload.update(cast(dict[str, Any], value))
            return httpx.Response(204)
        if path == "/v1/papers":
            from hub_papers.derive import summarize

            return httpx.Response(
                200,
                json={
                    "items": [
                        summarize(Paper.model_validate(p)).model_dump(mode="json")
                        for p in self.papers.values()
                    ],
                    "nextCursor": None,
                },
            )
        if path.endswith(("/source.pdf", "/file")):
            return httpx.Response(200, content=self.pdf_bytes)
        if path == "/v1/internal/papers/uploads/upload":
            return httpx.Response(200, json=self.upload)
        if path.startswith("/v1/papers/"):
            return httpx.Response(200, json=self.papers[path.split("/")[3]])
        raise AssertionError((request.method, path))


def store(replay: Replay) -> Store:
    return Store(
        Settings(hub_service_token=SecretStr("OFFLINE_TEST"), hub_api_url="https://offline.test"),
        HttpClient(client=httpx.Client(transport=httpx.MockTransport(replay.handle)), retries=0),
    )


def test_input_context_no_cross_paper_state() -> None:
    text = pages_text(PAGES, numbered=True)
    assert numbered_pages(text) == PAGES
    assert not paper_draft_check(draft(), CheckContext({"pages": text}, {}, total_pages=2)).failed
    assert paper_draft_check(
        draft(), CheckContext({"pages": text.replace("84.1", "35.0")}, {}, total_pages=2)
    ).failed
    assert paper_draft_check(draft(), CheckContext({"pages": "bad"}, {})).failed
    assert paper_draft_check(draft(), CheckContext({"pages": text}, {}, total_pages=3)).failed


def test_runtime_repair_then_review_repair_and_full_pipeline(tmp_path: Path) -> None:
    source = tmp_path / "source.pdf"
    pdf(source)
    bad = draft()
    bad["evidence"]["claims"][0]["sourceLines"] = [999, 999]
    adapter = FakeAdapter([bad, draft(), review("revise"), draft(), review()])
    replay = Replay()
    replay.pdf_bytes = source.read_bytes()
    paper = execute(store(replay), upload_id="upload", work=tmp_path / "work", adapter=adapter)
    assert paper.id == "custom-synthetic-research"
    assert paper.status.visibility == "private"
    assert paper.status.review == "passed"
    assert paper.spaces == ["general-research"]
    assert paper.evidence is not None
    assert paper.evidence.claims is not None
    assert paper.evidence.claims[0].sourceExcerpt == PAGES[0].lines[0]
    assert paper.evidence.legacyAnchors is False
    assert len(adapter.requests) == 5
    assert "sourceLines" in adapter.requests[1].prompt["user"]
    assert paper.id in adapter.requests[2].prompt["user"]
    assert "补边界" in adapter.requests[3].prompt["user"]
    assert replay.upload["status"] == "ready"
    assert replay.upload["paperId"] == paper.id
    assert len(replay.writes[f"/v1/internal/papers/{paper.id}/reviews"]) == 2
    assert len(replay.writes["/v1/internal/ai-calls/batch"]) == 5
    assert len([p for p in replay.writes if p.startswith("/v1/internal/documents/")]) == 5
    runs = next(v for p, v in replay.writes.items() if "/runs/" in p)
    assert [r["status"] for r in runs] == ["running", "succeeded"]
    assert all(
        value["inputTokens"] == 50
        for batch in replay.writes["/v1/internal/ai-calls/batch"]
        for value in batch
    )


@pytest.mark.parametrize(
    ("decision", "severity", "expected", "count"),
    [("escalate", "P1", "revise", 2), ("revise", "P2", "revise", 2), ("pass", "P1", "passed", 2)],
)
def test_review_status_without_unnecessary_rewrite(
    decision: str, severity: str, expected: str, count: int
) -> None:
    adapter = FakeAdapter([draft(), review(decision, severity)])
    written = asyncio.run(write_and_review(runtime(adapter), "paper", PAGES, run_id="offline"))
    assert written.review_status == expected
    assert len(adapter.requests) == count


def test_review_failure_keeps_valid_draft() -> None:
    adapter = FakeAdapter([draft(), ValueError("PRIVATE_SUPPLIER_DETAIL")])
    written = asyncio.run(write_and_review(runtime(adapter), "paper", PAGES, run_id="offline"))
    assert written.review_status == "draft"
    assert not written.reviews


def test_repair_exhaustion_fails_without_persisting(tmp_path: Path) -> None:
    source = tmp_path / "source.pdf"
    pdf(source)
    bad = draft()
    bad["evidence"]["claims"][0]["sourceLines"] = [999, 999]
    replay = Replay()
    with pytest.raises(ValueError, match="草稿校验修订已耗尽"):
        execute(
            store(replay),
            source=source,
            work=tmp_path / "work",
            adapter=FakeAdapter([bad, bad, bad]),
        )
    assert not replay.papers
    runs = next(v for p, v in replay.writes.items() if "/runs/" in p)
    assert runs[-1]["status"] == "failed"
    assert len(replay.writes["/v1/internal/ai-calls/batch"]) == 3


def test_revise_preserves_public_fields_and_never_reads_private(tmp_path: Path) -> None:
    original = Paper.model_validate_json(
        next((ROOT / "fixtures/samples/papers").glob("Paper.*.json")).read_text()
    )
    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay(original)
    replay.pdf_bytes = source.read_bytes()
    paper = execute(
        store(replay),
        paper_id=original.id,
        instructions="补边界",
        work=tmp_path / "work",
        adapter=FakeAdapter([draft(), review()]),
    )
    for key in original.model_dump().keys() - PaperDraft.model_fields.keys() - {"status"}:
        assert getattr(paper, key) == getattr(original, key)
    assert paper.status.visibility == original.status.visibility
    assert paper.status.readingDepth == original.status.readingDepth
    assert paper.status.nextAction == original.status.nextAction
    assert all("/private" not in path for _, path in replay.calls)


def test_image_order_and_text_only_review(tmp_path: Path) -> None:
    value = draft()
    value["evidence"]["claims"][0]["anchor"] = "Table 1"
    d = PaperDraft.model_validate(value)
    assert review_pages(d, 8) == [1]
    adapter = FakeAdapter([review()])
    asyncio.run(write_and_review(runtime(adapter), "paper", PAGES, run_id="offline", supplied=d))
    assert not adapter.requests[0].images
    (tmp_path / "1.png").write_bytes(b"actual-png")
    adapter = FakeAdapter([review()])
    asyncio.run(
        write_and_review(
            runtime(adapter), "paper", PAGES, run_id="offline", supplied=d, image_directory=tmp_path
        )
    )
    assert adapter.requests[0].images == [b"actual-png"]


@pytest.mark.parametrize(
    "url",
    [
        "http://arxiv.org/abs/2505.07078",
        "https://evil.test/abs/2505.07078",
        "https://arxiv.org/abs/2505.07078?key=bad",
        "https://arxiv.org@evil.test/pdf/2505.07078",
    ],
)
def test_arxiv_rejects_other_sources(url: str) -> None:
    with pytest.raises(ValueError, match="仅支持arXiv论文链接"):
        arxiv_pdf(url)


def test_cli_mutual_exclusion_and_safe_failure(monkeypatch: pytest.MonkeyPatch) -> None:
    import typer

    app = typer.Typer()
    app.command()(commands.ingest)
    assert CliRunner().invoke(app, []).exit_code != 0
    assert CliRunner().invoke(app, ["id", "--file", "x.pdf"]).exit_code != 0

    def fail(*args: Any, **kwargs: Any) -> Any:
        raise ValueError("SECRET_BODY")

    def fake_store(*args: Any) -> None:
        return None

    monkeypatch.setattr(cli, "execute", fail)
    monkeypatch.setattr(cli, "Store", fake_store)
    result = CliRunner().invoke(app, ["id"])
    assert result.exit_code == 1
    assert "SECRET_BODY" not in result.output


def test_local_task_no_api_and_submit_bypasses_only_author(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    source = tmp_path / "source.pdf"
    pdf(source)
    monkeypatch.chdir(tmp_path)
    local.task(None, source)
    text = next((tmp_path / ".work").glob("*/TASK.md")).read_text()
    assert "L1: The win rate is 84.1 percent." in text
    assert "paper_author" in text
    supplied = tmp_path / "draft.json"
    supplied.write_text(json.dumps(draft()))
    recorded: list[dict[str, Any]] = []

    def record(**kwargs: Any) -> None:
        recorded.append(kwargs)

    monkeypatch.setattr(local, "run_pipeline", record)
    local.submit(str(supplied), None, source)
    assert isinstance(recorded[0]["supplied"], PaperDraft)
    assert recorded[0]["paper_id"] is None


@pytest.mark.parametrize("mutation", ["visual", "page", "excerpt", "sample", "false_pass"])
def test_review_invalid_record_never_marks_passed(mutation: str) -> None:
    output = review()
    if mutation == "visual":
        output["visualPagesChecked"] = [1]
    elif mutation == "page":
        output["pagesChecked"] = [3]
    elif mutation == "excerpt":
        output["independentSourceCheck"]["pdfPage"] = 2
    elif mutation == "sample":
        output["sampledClaimIds"] = ["invented"]
    else:
        output["findings"] = [{"severity": "P1", "location": "结论", "fix": "纠错"}]
    adapter = FakeAdapter([draft(), output])
    written = asyncio.run(write_and_review(runtime(adapter), "paper", PAGES, run_id="offline"))
    assert written.review_status == "draft"
    assert not written.reviews


def test_image_disabled_and_selection_unique_cap(tmp_path: Path) -> None:
    value = draft()
    claim = value["evidence"]["claims"][0]
    value["evidence"]["claims"] = [
        {**claim, "id": f"c{i}", "pdfPage": i, "anchor": "Figure"}
        for i in [2, 1, 2, 3, 4, 5, 6, 7, 8, 9]
    ]
    assert review_pages(PaperDraft.model_validate(value), 8) == [2, 1, 3, 4, 5, 6, 7, 8]
    value = draft()
    value["evidence"]["claims"][0]["anchor"] = "Table 1"
    adapter = FakeAdapter([review()])
    asyncio.run(
        write_and_review(
            runtime(adapter),
            "paper",
            PAGES,
            run_id="offline",
            supplied=PaperDraft.model_validate(value),
            image_directory=tmp_path,
            supports_images=False,
        )
    )
    assert not adapter.requests[0].images


def test_review_repair_has_one_round_limit() -> None:
    adapter = FakeAdapter([draft(), review("revise"), draft(), review("revise")])
    written = asyncio.run(write_and_review(runtime(adapter), "paper", PAGES, run_id="offline"))
    assert written.review_status == "revise"
    assert len(written.reviews) == 2
    assert len(adapter.requests) == 4


@pytest.mark.parametrize(
    "path",
    [
        "/v1/internal/papers/custom-synthetic-research/files/pages.txt",
        "/v1/internal/papers/custom-synthetic-research",
        "/v1/internal/papers/custom-synthetic-research/reviews",
        "/v1/internal/documents/papers.catalog.all",
    ],
)
def test_stage_http_failure_marks_failed_without_false_ready(path: str, tmp_path: Path) -> None:
    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay(fail_path=path)
    replay.pdf_bytes = source.read_bytes()
    from hub_core.http import SourceRequestError

    with pytest.raises(SourceRequestError, match="HTTP 400"):
        execute(
            store(replay),
            upload_id="upload",
            work=tmp_path / "work",
            adapter=FakeAdapter([draft(), review()]),
        )
    assert replay.upload["status"] == "failed"
    assert replay.upload["paperId"] == "custom-synthetic-research"
    runs = next(v for p, v in replay.writes.items() if "/runs/" in p)
    assert runs[-1]["status"] == "failed"


def test_submit_runtime_never_calls_author(tmp_path: Path) -> None:
    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay()
    adapter = FakeAdapter([review()])
    execute(
        store(replay),
        source=source,
        supplied=PaperDraft.model_validate(draft()),
        work=tmp_path / "work",
        adapter=adapter,
    )
    assert [r.output_model.__name__ for r in adapter.requests] == ["PaperReviewOutput"]
    assert len(replay.writes["/v1/internal/ai-calls/batch"]) == 1


def test_api_identity_retry_does_not_append_version(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from hub_papers.ids import PaperIdentity
    from hub_papers.ingest import pipeline

    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay()
    replay.upload["paperId"] = "arxiv-2505.07078-v2"
    replay.pdf_bytes = source.read_bytes()

    def identity(pages: Any) -> PaperIdentity:
        return PaperIdentity("arxiv-2505.07078", "v6")

    monkeypatch.setattr(pipeline, "identify", identity)
    paper = execute(
        store(replay),
        upload_id="upload",
        work=tmp_path / "work",
        adapter=FakeAdapter([draft(), review()]),
    )
    assert paper.id == "arxiv-2505.07078-v2"


def test_duplicate_known_version_records_safe_reason(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from hub_papers.ids import PaperIdentity
    from hub_papers.ingest import pipeline

    existing = Paper.model_validate_json(
        (ROOT / "fixtures/samples/papers/Paper.arxiv-2505.07078.json").read_text()
    )
    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay(existing)
    replay.pdf_bytes = source.read_bytes()

    def identity(pages: Any) -> PaperIdentity:
        return PaperIdentity("arxiv-2505.07078", "v6")

    monkeypatch.setattr(pipeline, "identify", identity)
    adapter = FakeAdapter([])
    with pytest.raises(ValueError, match="相同编号与版本已存在"):
        execute(store(replay), upload_id="upload", work=tmp_path / "work", adapter=adapter)
    assert replay.upload["error"] == "相同编号与版本已存在"
    assert not adapter.requests


def test_cli_success_executes_offline_pipeline(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    import typer

    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay()
    adapter = FakeAdapter([draft(), review()])
    actual = execute

    def run(store: Store, **kwargs: Any) -> Paper:
        return actual(store, adapter=adapter, **kwargs)

    def client() -> HttpClient:
        return store(replay).http

    def settings() -> Settings:
        return Settings(
            hub_service_token=SecretStr("OFFLINE_TEST"), hub_api_url="https://offline.test"
        )

    monkeypatch.setattr(cli, "execute", run)
    monkeypatch.setattr(cli, "HttpClient", client)
    monkeypatch.setattr(cli, "Settings", settings)
    monkeypatch.chdir(tmp_path)
    app = typer.Typer()
    app.command()(commands.ingest)
    result = CliRunner().invoke(app, ["--file", str(source)])
    assert result.exit_code == 0, result.output
    assert "custom-synthetic-research" in result.output
    assert replay.papers["custom-synthetic-research"]["status"]["visibility"] == "private"


def test_formal_eval_entrypoint_uses_same_real_input_check() -> None:
    checks = CheckRegistry()
    checks.load_plugins()
    assert "paper_draft" in checks.checks
    adapter = FakeAdapter([draft()])
    result = asyncio.run(
        Runtime(Registry(ROOT), adapter, checks=checks).run(
            "papers.author",
            {
                "paperId": "paper",
                "knownMeta": None,
                "pages": pages_text(PAGES, numbered=True),
                "previousDraft": None,
                "problems": [],
                "instructions": None,
            },
            total_pages=2,
        )
    )
    assert result.ok
    assert result.output is not None
    assert result.output["generatedBy"]["capability"] == "papers.author"


def test_local_existing_task_uses_api_real_pages(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    original = Paper.model_validate_json(
        (ROOT / "fixtures/samples/papers/Paper.arxiv-2505.07078.json").read_text()
    )
    replay = Replay(original)
    replay.pdf_bytes = b"original-pdf"
    handler = replay.handle

    def reply(request: httpx.Request) -> httpx.Response:
        if request.url.path.endswith("/pages.jsonl"):
            return httpx.Response(
                200,
                content="\n".join(
                    json.dumps({"page": p.page, "lines": p.lines}) for p in PAGES
                ).encode(),
            )
        return handler(request)

    def client() -> HttpClient:
        return HttpClient(client=httpx.Client(transport=httpx.MockTransport(reply)))

    def settings() -> Settings:
        return Settings(
            hub_service_token=SecretStr("OFFLINE_TEST"), hub_api_url="https://offline.test"
        )

    monkeypatch.setattr(local, "HttpClient", client)
    monkeypatch.setattr(local, "Settings", settings)
    monkeypatch.chdir(tmp_path)
    local.task(original.id, None)
    text = (tmp_path / ".work" / original.id / "TASK.md").read_text()
    assert "L1: The win rate is 84.1 percent." in text
    assert original.meta.title in text
    assert (tmp_path / ".work" / original.id / "source.pdf").read_bytes() == b"original-pdf"
    assert not replay.writes


def test_new_version_has_relation_and_safe_initial_status(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from hub_papers.ids import PaperIdentity
    from hub_papers.ingest import pipeline

    existing = Paper.model_validate_json(
        (ROOT / "fixtures/samples/papers/Paper.arxiv-2505.07078.json").read_text()
    )
    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay(existing)
    replay.pdf_bytes = source.read_bytes()

    def identity(pages: Any) -> PaperIdentity:
        return PaperIdentity("arxiv-2505.07078", "v7")

    monkeypatch.setattr(pipeline, "identify", identity)
    paper = execute(
        store(replay),
        upload_id="upload",
        work=tmp_path / "work",
        adapter=FakeAdapter([draft(), review()]),
    )
    assert paper.id == "arxiv-2505.07078-v2"
    assert paper.relations is not None
    assert [(r.type, r.target) for r in paper.relations] == [("version_of", existing.id)]
    assert paper.status.visibility == "private"


def test_new_version_retry_after_author_failure_preserves_relation(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    from hub_papers.ids import PaperIdentity
    from hub_papers.ingest import pipeline

    existing = Paper.model_validate_json(
        (ROOT / "fixtures/samples/papers/Paper.arxiv-2505.07078.json").read_text()
    )
    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay(existing)
    replay.pdf_bytes = source.read_bytes()

    def identity(pages: Any) -> PaperIdentity:
        return PaperIdentity(existing.id, "v7")

    monkeypatch.setattr(pipeline, "identify", identity)
    with pytest.raises(ValueError, match="作者能力失败"):
        execute(
            store(replay),
            upload_id="upload",
            work=tmp_path / "first",
            adapter=FakeAdapter([ValueError("离线作者失败")]),
        )
    assigned = replay.upload["paperId"]
    assert assigned == existing.id + "-v2"
    assert assigned not in replay.papers
    assert replay.upload["status"] == "failed"
    paper = execute(
        store(replay),
        upload_id="upload",
        work=tmp_path / "retry",
        adapter=FakeAdapter([draft(), review()]),
    )
    assert paper.id == assigned
    assert paper.relations is not None
    assert [(r.type, r.target) for r in paper.relations] == [("version_of", existing.id)]


def test_total_deadline_cancels_model_and_records_retryable_failure(tmp_path: Path) -> None:
    class WaitingAdapter:
        cancelled = False

        async def generate(self, request: Request) -> Response:
            try:
                await asyncio.sleep(10)
            except asyncio.CancelledError:
                self.cancelled = True
                raise
            raise AssertionError("模型等待必须由总期限取消")

    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay()
    replay.pdf_bytes = source.read_bytes()
    adapter = WaitingAdapter()
    with pytest.raises(TimeoutError):
        execute(
            store(replay),
            upload_id="upload",
            work=tmp_path / "work",
            adapter=adapter,
            total_timeout=0.1,
        )
    assert adapter.cancelled
    assert replay.upload["status"] == "failed"
    assert "总运行期限" in replay.upload["error"]
    runs = next(v for p, v in replay.writes.items() if "/runs/" in p)
    assert runs[-1]["status"] == "failed"
    assert runs[-1]["finishedAt"] is not None
    assert not replay.papers


@pytest.mark.parametrize("stage", ["/file", "/files/source.pdf", "/documents/papers.catalog.all"])
def test_total_deadline_checks_source_files_and_derived_writes(stage: str, tmp_path: Path) -> None:
    source = tmp_path / "source.pdf"
    pdf(source)
    replay = Replay()
    replay.pdf_bytes = source.read_bytes()
    elapsed = [0.0]

    def handle(request: httpx.Request) -> httpx.Response:
        response = replay.handle(request)
        if request.url.path.endswith(stage):
            elapsed[0] = 46 * 60
        return response

    test_store = store(replay)
    test_store.http.client.close()
    test_store.http.client = httpx.Client(transport=httpx.MockTransport(handle))
    with pytest.raises(TimeoutError):
        execute(
            test_store,
            upload_id="upload",
            work=tmp_path / "work",
            adapter=FakeAdapter([draft(), review()]),
            clock=lambda: elapsed[0],
        )
    assert replay.upload["status"] == "failed"
    assert not any(
        v.get("status") == "ready" for v in replay.writes["/v1/internal/papers/uploads/upload"]
    )
    runs = next(v for p, v in replay.writes.items() if "/runs/" in p)
    assert runs[-1]["status"] == "failed"
    # 超期后不能继续写下个文件或派生文档，失败状态写入仍允许。
    if stage == "/files/source.pdf":
        assert not any(p.endswith("/files/pages.jsonl") for p in replay.writes)
    if stage == "/documents/papers.catalog.all":
        derived = [p for p in replay.writes if "/documents/" in p]
        assert derived[-1].endswith("papers.catalog.all")
        assert len(derived) < 5


def test_workflow_has_cleanup_room_beyond_application_deadline() -> None:
    import yaml

    value = yaml.load(
        (ROOT / ".github/workflows/papers-ingest.yml").read_text(), Loader=yaml.BaseLoader
    )
    assert value["jobs"]["process"]["timeout-minutes"] == "90"


def test_review_quote_normalization_stays_on_named_page() -> None:
    output = review()
    output["independentSourceCheck"]["sourceExcerpt"] = "The win rate is 84.1 percent. second line"
    adapter = FakeAdapter([draft(), output])
    written = asyncio.run(write_and_review(runtime(adapter), "paper", PAGES, run_id="offline"))
    assert written.review_status == "passed"


def test_local_submit_cannot_claim_author_runtime_provenance() -> None:
    authored = asyncio.run(
        write_and_review(
            runtime(FakeAdapter([draft(), review()])), "paper", PAGES, run_id="offline"
        )
    ).draft
    assert authored.generatedBy is not None
    supplied = asyncio.run(
        write_and_review(
            runtime(FakeAdapter([review()])), "paper", PAGES, run_id="offline", supplied=authored
        )
    )
    assert supplied.draft.generatedBy is None
    assert supplied.reviews[0].generatedBy.capability == "papers.review"
