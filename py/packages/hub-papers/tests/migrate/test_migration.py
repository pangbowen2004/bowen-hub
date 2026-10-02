"""真实两篇老数据转换；所有HTTP只用离线回放。"""

import json
import shutil
from datetime import date
from pathlib import Path

import httpx
import pytest
from pydantic import SecretStr
from typer.testing import CliRunner

from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_papers.migrate.commands import migrate
from hub_papers.migrate.convert import r1_evidence
from hub_papers.migrate.io import MigrationApi, read_plan
from hub_papers.pdf import extract_pdf

ROOT = Path(__file__).resolve().parents[5]


@pytest.fixture
def source(tmp_path: Path) -> tuple[Path, Path, Path]:
    archive = tmp_path / "archive"
    shutil.copytree(ROOT / "fixtures/papers", archive)
    baseline = tmp_path / "baseline.json"
    baseline.write_text(json.dumps({"paper_ids": ["arxiv-2505.07078"]}), encoding="utf-8")
    graph = tmp_path / "graph.yml"
    graph.write_text(
        json.dumps(
            {
                "spaces": [
                    {"id": "agent-systems", "paper_ids": ["arxiv-2505.07078"]},
                    {"id": "custom-agent-systems", "paper_ids": ["arxiv-2505.07078"]},
                ],
                "graph": {
                    "edges": [
                        {
                            "source": "arxiv-2505.07078",
                            "target": "acl-2021.acl-long.500",
                            "type_key": "explicit_link",
                            "label": "对照",
                            "evidence": "明确关系原文",
                        },
                        {
                            "source": "arxiv-2505.07078",
                            "target": "acl-2021.acl-long.500",
                            "type_key": "shared_concept",
                        },
                    ]
                },
            }
        ),
        encoding="utf-8",
    )
    return archive, baseline, graph


def test_real_fixtures_preserve_and_map(source: tuple[Path, Path, Path]) -> None:
    plan = read_plan(*source, today=date(2026, 10, 2))
    assert len(plan.items) == 2
    papers = {i.write.paper.id: i for i in plan.items}
    finsaber = papers["arxiv-2505.07078"]
    acl = papers["acl-2021.acl-long.500"]
    assert finsaber.write.paper.spaces == ["agent-systems"]
    assert acl.write.paper.spaces == ["general-research"]
    assert finsaber.write.paper.relations
    assert len(finsaber.write.paper.relations) == 1
    assert finsaber.write.paper.status.visibility == "public"
    assert acl.write.paper.status.visibility == "private"
    assert finsaber.write.paper.evidence
    assert finsaber.write.paper.evidence.legacyAnchors
    assert finsaber.write.paper.evidence.claims
    assert acl.write.paper.evidence
    assert acl.write.paper.evidence.claims
    assert acl.write.paper.evidence.claims[0].sourceExcerpt
    assert acl.write.paper.guide
    assert acl.write.paper.guide.problem
    assert acl.write.paper.guide.problem.setup
    assert finsaber.write.summary.hasCode
    assert finsaber.write.paper.resources
    assert finsaber.write.paper.resources.code
    assert finsaber.write.paper.resources.code.url == "https://github.com/waylonli/FINSABER"
    assert "论文复现分支" in (finsaber.write.paper.resources.code.note or "")
    assert acl.write.paper.structure
    assert acl.write.paper.structure.sections
    assert acl.write.paper.structure.sections[0].pages == "3"
    assert any(c.title == "迁移补充字段" for c in finsaber.private.legacyCards)
    assert "00-元数据.yml:integrity" in plan.scan.discarded
    assert "资源与出处.yml:quantml_articles[].packaged_markdown" in plan.scan.preserved
    assert plan.report()["keys"]["unhandled"] == []


def test_nested_unknown_and_raw_yaml(source: tuple[Path, Path, Path]) -> None:
    path = source[0] / "arxiv-2505.07078/11-读者导读.yml"
    original = path.read_text(encoding="utf-8")
    path.write_text(
        original.replace(
            "research_problem:\n", "research_problem:\n  future_field: 原文未知字段\n"
        ),
        encoding="utf-8",
    )
    plan = read_plan(*source, today=date(2026, 10, 2))
    item = next(i for i in plan.items if i.write.paper.id == "arxiv-2505.07078")
    assert "11-读者导读.yml:research_problem.future_field" in plan.scan.preserved
    card = next(c for c in item.private.legacyCards if c.title == "迁移补充字段")
    assert path.read_text(encoding="utf-8") in card.markdown


def test_r1_table_escaped_pipe_and_questions() -> None:
    evidence, questions = r1_evidence(
        "## 3. 关键结果\n|结果|核心数字/方向|不确定性|证据位置|\n|---|---|---|---|\n|甲\\|乙|84%|边界|PDF p.7|\n## 8. 尚未理解或待核查\n- 待核查问题\n"
    )
    assert len(evidence["claims"]) == 1
    assert evidence["claims"][0]["pdfPage"] == 7
    assert evidence["claims"][0]["sourceExcerpt"] is None
    assert questions == ["待核查问题"]


def test_dry_run_never_connects(source: tuple[Path, Path, Path]) -> None:
    import typer

    app = typer.Typer()
    app.command()(migrate)
    result = CliRunner().invoke(
        app,
        [
            "--dry-run",
            "--source",
            str(source[0]),
            "--baseline",
            str(source[1]),
            "--graph",
            str(source[2]),
        ],
    )
    assert result.exit_code == 0, result.output
    assert '"papers": 2' in result.output


def test_missing_pdf_prevents_all_writes(source: tuple[Path, Path, Path]) -> None:
    plan = read_plan(*source, today=date(2026, 10, 2))
    calls: list[str] = []

    def handle(request: httpx.Request) -> httpx.Response:
        calls.append(request.method)
        return httpx.Response(204)

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        api = MigrationApi(
            Settings(hub_service_token=SecretStr("offline-only")), HttpClient(client=client)
        )
        with pytest.raises(ValueError, match="缺少原文PDF"):
            api.write(plan)
    assert calls == []


def tiny_pdf(width: int = 100) -> bytes:
    objects = [
        b"<< /Type /Catalog /Pages 2 0 R >>",
        b"<< /Type /Pages /Kids [3 0 R] /Count 1 >>",
        f"<< /Type /Page /Parent 2 0 R /MediaBox [0 0 {width} 100] /Resources << >> /Contents 4 0 R >>".encode(),
        b"<< /Length 0 >>\nstream\n\nendstream",
    ]
    data = b"%PDF-1.4\n"
    offsets: list[int] = [0]
    for n, obj in enumerate(objects, 1):
        offsets.append(len(data))
        data += f"{n} 0 obj\n".encode() + obj + b"\nendobj\n"
    start = len(data)
    data += b"xref\n0 5\n0000000000 65535 f \n"
    data += b"".join(f"{offset:010d} 00000 n \n".encode() for offset in offsets[1:])
    return data + f"trailer\n<< /Size 5 /Root 1 0 R >>\nstartxref\n{start}\n%%EOF\n".encode()


def test_pdf_location_and_ambiguous_failure(source: tuple[Path, Path, Path]) -> None:
    directory = source[0] / "arxiv-2505.07078"
    (directory / "paper.pdf").write_bytes(tiny_pdf())
    plan = read_plan(*source, today=date(2026, 10, 2))
    assert (
        next(i for i in plan.items if i.write.paper.id == directory.name).pdf
        == directory / "paper.pdf"
    )
    (directory / "other.pdf").write_bytes(tiny_pdf())
    with pytest.raises(ValueError, match="多个PDF"):
        read_plan(*source, today=date(2026, 10, 2))


def test_put_verify_derive_readonly_and_text_corruption(source: tuple[Path, Path, Path]) -> None:
    for directory in source[0].iterdir():
        (directory / "original-custom.pdf").write_bytes(tiny_pdf())
    plan = read_plan(*source, today=date(2026, 10, 2))
    for item in plan.items:
        assert item.write.paper.structure
        item.write.paper.structure.pageCount = 1
    stored: dict[str, bytes] = {}
    writes: list[str] = []
    corrupt = False

    def handle(request: httpx.Request) -> httpx.Response:
        path = request.url.path
        if request.method == "PUT":
            writes.append(path)
            stored[path] = request.content
            return httpx.Response(204)
        if path == "/v1/papers":
            return httpx.Response(
                200,
                json={
                    "items": [i.write.summary.model_dump(mode="json") for i in plan.items],
                    "nextCursor": None,
                },
            )
        if path == "/v1/public/papers/catalog":
            return httpx.Response(
                200, content=stored["/v1/internal/documents/papers.catalog.public"]
            )
        for item in plan.items:
            base = "/v1/papers/" + item.write.paper.id
            if path == base:
                return httpx.Response(200, json=item.write.paper.model_dump(mode="json"))
            if path == base + "/private":
                return httpx.Response(
                    200, content=stored["/v1/internal/papers/" + item.write.paper.id + "/private"]
                )
            if path.startswith(base + "/pages/"):
                return httpx.Response(
                    200, content=stored[path.replace("/v1/papers/", "/v1/internal/papers/")]
                )
        if corrupt and path.endswith("/files/pages.txt"):
            return httpx.Response(200, content=b"corrupted")
        return httpx.Response(200, content=stored[path])

    with httpx.Client(transport=httpx.MockTransport(handle)) as client:
        api = MigrationApi(
            Settings(hub_service_token=SecretStr("offline-only")), HttpClient(client=client)
        )
        api.write(plan)
        assert len(writes) == 17
        initial = list(writes)
        api.verify(plan)
        assert writes == initial
        api.write(plan)
        assert writes == initial + initial
        corrupt = True
        with pytest.raises(ValueError, match="页文本"):
            api.verify(plan)
        corrupt = False
        image_key = "/v1/internal/papers/" + plan.items[0].write.paper.id + "/pages/1"
        original_image = stored[image_key]
        stored[image_key] = original_image[:12]
        with pytest.raises(ValueError, match="页图与同T30抽取结果不一致"):
            api.verify(plan)
        wrong_pdf = source[0].parent / "wrong-page.pdf"
        wrong_pdf.write_bytes(tiny_pdf(width=200))
        output = source[0].parent / "wrong-page-output"
        extract_pdf(wrong_pdf, output)
        stored[image_key] = (output / "pages/1.png").read_bytes()
        assert stored[image_key].startswith(b"\x89PNG\r\n\x1a\n")
        assert stored[image_key] != original_image
        with pytest.raises(ValueError, match="页图与同T30抽取结果不一致"):
            api.verify(plan)
        stored[image_key] = original_image
        api.verify(plan)


def test_waiting_fulltext_and_date_fallback(source: tuple[Path, Path, Path]) -> None:
    directory = source[0] / "custom-waiting"
    directory.mkdir()
    (directory / "00-元数据.yml").write_text(
        json.dumps(
            {"title": "Waiting", "reading": {"status": "等待全文", "completed_depth": "未开始"}}
        ),
        encoding="utf-8",
    )
    (directory / "07-看板状态.yml").write_text(
        json.dumps(
            {
                "updated_at": "2026-09-01T10:00:00+08:00",
                "knowledge_status": "confirmed",
                "user_note": "真实笔记",
            }
        ),
        encoding="utf-8",
    )
    plan = read_plan(*source, today=date(2026, 10, 2))
    item = next(i for i in plan.items if i.write.paper.id == directory.name)
    assert item.write.paper.status.updatedAt == date(2026, 9, 1)
    assert item.write.paper.status.readingDepth == "R0"
    assert item.write.paper.status.review == "draft"
    assert item.write.paper.evidence is None
    assert item.write.paper.guide is None
    assert item.pdf is None
    assert item.private.mastery == "confirmed"
    assert item.private.notes == "真实笔记"
    assert not (plan.scan.discarded & plan.scan.preserved)
    assert not (plan.scan.mapped & plan.scan.preserved)
    assert not (plan.scan.mapped & plan.scan.discarded)
    (directory / "07-看板状态.yml").write_text("{}", encoding="utf-8")
    item = next(
        i
        for i in read_plan(*source, today=date(2026, 10, 2)).items
        if i.write.paper.id == directory.name
    )
    assert item.write.paper.status.updatedAt == date(2026, 10, 2)


def test_explanations_and_unknown_private_fields(source: tuple[Path, Path, Path]) -> None:
    path = source[0] / "arxiv-2505.07078/09-解释记录.yml"
    explanation = {
        "id": "e1",
        "question": "问题",
        "answer": "解释",
        "pages": [1],
        "status": "pending",
        "created_at": "2026-09-01T10:00:00+08:00",
        "unknown_original": "原值保留",
    }
    path.write_text(
        json.dumps({"explanations": [explanation]}, ensure_ascii=False), encoding="utf-8"
    )
    item = next(
        i
        for i in read_plan(*source, today=date(2026, 10, 2)).items
        if i.write.paper.id == "arxiv-2505.07078"
    )
    assert item.private.explanations[0].answer == "解释"
    assert any("原值保留" in c.markdown for c in item.private.legacyCards)


def test_explicit_material_pdf_wins_without_guess(source: tuple[Path, Path, Path]) -> None:
    directory = source[0] / "arxiv-2505.07078"
    meta = directory / "00-元数据.yml"
    original = meta.read_text(encoding="utf-8")
    meta.write_text(
        original.replace("main_text: 已有（15 页 PDF）", "main_text: chosen.pdf"), encoding="utf-8"
    )
    (directory / "chosen.pdf").write_bytes(tiny_pdf())
    (directory / "other.pdf").write_bytes(tiny_pdf())
    item = next(
        i
        for i in read_plan(*source, today=date(2026, 10, 2)).items
        if i.write.paper.id == directory.name
    )
    assert item.pdf == directory / "chosen.pdf"


def test_problem_claim_maps_definition_and_preserves_original(
    source: tuple[Path, Path, Path],
) -> None:
    path = source[0] / "acl-2021.acl-long.500/evidence-audit.json"
    original = json.loads(path.read_text(encoding="utf-8"))
    original["claims"][0]["kind"] = "problem"
    raw = json.dumps(original, ensure_ascii=False)
    path.write_text(raw, encoding="utf-8")
    plan = read_plan(*source, today=date(2026, 10, 2))
    item = next(i for i in plan.items if i.write.paper.id == "acl-2021.acl-long.500")
    assert item.write.paper.evidence
    assert item.write.paper.evidence.claims
    assert item.write.paper.evidence.claims[0].kind == "definition"
    assert any(raw in card.markdown for card in item.private.legacyCards)
    assert "evidence-audit.json:claims[].kind" in plan.scan.preserved
    assert (
        "acl-2021.acl-long.500:evidence.claims.kind:problem→definition"
        in plan.report()["transformations"]
    )


def test_string_sections_keep_role_without_invented_pages(source: tuple[Path, Path, Path]) -> None:
    path = source[0] / "acl-2021.acl-long.500/10-阅读导航包.yml"
    original = json.loads(path.read_text(encoding="utf-8"))
    original["document_map"]["sections"] = ["章节原文描述"]
    raw = json.dumps(original, ensure_ascii=False)
    path.write_text(raw, encoding="utf-8")
    plan = read_plan(*source, today=date(2026, 10, 2))
    item = next(i for i in plan.items if i.write.paper.id == "acl-2021.acl-long.500")
    assert item.write.paper.structure
    assert item.write.paper.structure.sections
    assert item.write.paper.structure.sections[0].role == "章节原文描述"
    assert item.write.paper.structure.sections[0].pages == ""
    assert any(raw in card.markdown for card in item.private.legacyCards)
    assert any("string→role" in change for change in plan.scan.transformations)


def test_legacy_navigation_and_explanation_shapes(source: tuple[Path, Path, Path]) -> None:
    directory = source[0] / "acl-2021.acl-long.500"
    navigation = directory / "10-阅读导航包.yml"
    original = json.loads(navigation.read_text(encoding="utf-8"))
    original["document_map"]["sections"] = [
        {"pages": 4, "role": "方法"},
        {"role": "无页码的原文描述"},
    ]
    original["critical_appraisal"]["dimensions"] = [
        "原判断描述",
        {"id": "dimension-1", "evidence": "原证据说明", "status": "pending"},
    ]
    original["negative_and_null"] = [
        {"finding": "原负结果", "interpretation": "原解读", "anchor": "PDF p.4"}
    ]
    original["citation_navigation"] = {
        "backward": [{"work": "原引文", "reason": "原关系解释", "status": "unverified"}],
        "forward": [{"task": "原后续任务", "reason": "原推荐理由"}],
    }
    navigation.write_text(json.dumps(original, ensure_ascii=False), encoding="utf-8")
    explanation = {
        "id": "e1",
        "question": "原问题",
        "answer": "原回答",
        "citations": ["Section 7", "PDF p.4", "PDF p.0", "PDF p.4", "Eq. 3"],
        "knowledge_status": "confirmed",
        "created_at": "2026-09-01T10:00:00+08:00",
    }
    raw_explanations = json.dumps({"explanations": [explanation]}, ensure_ascii=False)
    (directory / "09-解释记录.yml").write_text(raw_explanations, encoding="utf-8")
    plan = read_plan(*source, today=date(2026, 10, 2))
    item = next(i for i in plan.items if i.write.paper.id == directory.name)
    assert item.write.paper.structure
    assert item.write.paper.structure.sections
    assert item.write.paper.structure.sections[0].pages == "4"
    assert item.write.paper.structure.sections[1].pages == ""
    assert item.write.paper.structure.appraisal
    assert item.write.paper.structure.appraisal.dimensions
    assert item.write.paper.structure.appraisal.dimensions[0].name == "原判断描述"
    assert item.write.paper.structure.appraisal.dimensions[0].judgment is None
    assert item.write.paper.structure.appraisal.dimensions[1].name == "dimension-1"
    assert item.write.paper.structure.appraisal.dimensions[1].note == "原证据说明"
    assert item.write.paper.structure.negativeResults
    assert "原负结果" in item.write.paper.structure.negativeResults[0]
    assert item.write.paper.citations
    assert item.write.paper.citations.backward
    assert item.write.paper.citations.backward[0].title == "原引文"
    assert item.write.paper.citations.backward[0].why == "原关系解释"
    assert item.private.explanations[0].pages == [4]
    assert item.private.explanations[0].status == "confirmed"
    assert any(raw_explanations in c.markdown for c in item.private.legacyCards)
    assert any("string→name" in change for change in plan.scan.transformations)


def test_unknown_section_status_omitted_without_guess_and_reported(
    source: tuple[Path, Path, Path],
) -> None:
    directory = source[0] / "acl-2021.acl-long.500"
    path = directory / "10-阅读导航包.yml"
    original = json.loads(path.read_text(encoding="utf-8"))
    original["document_map"]["sections"] = [
        {"pages": "4", "status": "complete"},
        {"pages": "5", "status": "partial"},
        {"pages": "6", "status": "scanned"},
        {"pages": "7", "status": "read"},
    ]
    raw = json.dumps(original, ensure_ascii=False)
    path.write_text(raw, encoding="utf-8")
    plan = read_plan(*source, today=date(2026, 10, 2))
    item = next(i for i in plan.items if i.write.paper.id == directory.name)
    assert item.write.paper.structure
    assert item.write.paper.structure.sections
    assert [s.status for s in item.write.paper.structure.sections] == [None, None, None, "read"]
    assert any(raw in card.markdown for card in item.private.legacyCards)
    assert sum("省略可选字段" in change for change in plan.scan.transformations) == 3


def test_graph_paper_namespace_maps_all_explicit_edges(source: tuple[Path, Path, Path]) -> None:
    graph = json.loads(source[2].read_text(encoding="utf-8"))
    edge = graph["graph"]["edges"][0]
    edge["source"] = "paper:" + edge["source"]
    edge["target"] = "paper:" + edge["target"]
    source[2].write_text(json.dumps(graph, ensure_ascii=False), encoding="utf-8")
    plan = read_plan(*source, today=date(2026, 10, 2))
    item = next(i for i in plan.items if i.write.paper.id == "arxiv-2505.07078")
    assert item.write.paper.relations
    assert len(item.write.paper.relations) == 1
    assert item.write.paper.relations[0].target == "acl-2021.acl-long.500"
    assert item.write.paper.relations[0].type == "对照"
    assert item.write.paper.relations[0].note == "明确关系原文"
    assert any("paper命名空间→论文id" in change for change in plan.scan.transformations)


@pytest.mark.parametrize("selected", ["missing.pdf", "../outside.pdf"])
def test_declared_material_pdf_never_falls_back(
    source: tuple[Path, Path, Path], selected: str
) -> None:
    directory = source[0] / "arxiv-2505.07078"
    metadata = directory / "00-元数据.yml"
    text = metadata.read_text(encoding="utf-8")
    metadata.write_text(
        text.replace("main_text: 已有（15 页 PDF）", "main_text: " + selected), encoding="utf-8"
    )
    (directory / "only-local.pdf").write_bytes(tiny_pdf())
    (source[0] / "outside.pdf").write_bytes(tiny_pdf())
    with pytest.raises(ValueError, match="材料明确指定的PDF"):
        read_plan(*source, today=date(2026, 10, 2))
