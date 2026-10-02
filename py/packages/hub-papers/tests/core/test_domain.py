"""合成坏稿覆盖每类校验；原样例验证公开派生，PDF只在本地读取。"""

import json
import os
import subprocess
import sys
from copy import deepcopy
from pathlib import Path
from typing import Any, cast

import pymupdf
import pytest

from hub_contracts import GraphData, Paper, PaperRelation, PapersCatalog
from hub_papers.check import check_draft, measurement_numbers, paragraphs
from hub_papers.derive import derive_documents
from hub_papers.excerpt import PageText, fill_source_excerpts, page_excerpt, pages_text
from hub_papers.ids import PaperIdentity, choose_identity, custom_identity, identify
from hub_papers.pdf import extract_pdf
from hub_papers.pdf.config import load_derivation_config, load_rules
from hub_papers.pdf.files import read_pages

ROOT = Path(__file__).resolve().parents[5]
PAGES = (
    PageText(1, ("The win rate is 84.1 percent.", "second line")),
    PageText(2, ("another page",)),
)


def draft_input() -> dict[str, Any]:
    return {
        "meta": {
            "title": "Synthetic research",
            "titleZh": "合成研究",
            "authors": ["测试作者"],
            "year": 2026,
            "venue": "测试期刊",
            "version": "v1",
            "paperType": "实证",
            "paperKind": "empirical",
            "studyDesign": "合成实验",
            "sourceUrl": "https://example.test/paper",
            "doi": None,
            "arxivId": None,
            "anthologyId": None,
        },
        "guide": {
            "oneSentence": "合成结论",
            "readingGoal": "合成目标",
            "article": "\n\n".join(
                f"## {heading}\n\n测试正文胜率84.1%。"
                for heading in load_rules()["articleHeadings"]
            ),
            "prerequisites": [],
            "bottomLine": {
                "supports": "测试支持",
                "doesNotSupport": "测试边界",
                "memorable": "测试记忆",
            },
            "limitations": [],
        },
        "evidence": {
            "readerCheck": dict.fromkeys(
                ("problem", "gap", "input", "mechanism", "output", "boundary", "openQuestion"),
                "合成答案",
            ),
            "claims": [
                {
                    "id": "c1",
                    "kind": "result",
                    "claim": "测试胜率",
                    "metric": "胜率84.1%",
                    "condition": "合成条件",
                    "anchor": "PDF p.1",
                    "pdfPage": 1,
                    "sourceLines": [1, 1],
                    "claimOrigin": "paper_supported",
                    "interpretationBoundary": "仅合成样例",
                    "quantities": [
                        {"text": "84.1%", "sourceText": "84.1", "meaning": "胜率百分数"}
                    ],
                }
            ],
            "articleBlocks": [
                {"claimOrigin": "paper_supported", "claimIds": ["c1"]} for _ in range(8)
            ],
        },
        "structure": {"pageCount": 2, "sections": [], "figures": [], "concepts": []},
        "resources": {
            "landingPage": "https://example.test/paper",
            "code": {"status": "unverified", "url": None, "note": "未核验", "checkedAt": None},
        },
    }


def test_valid_and_excerpt_exact_lines_no_mutation() -> None:
    value = draft_input()
    checked = check_draft(value, PAGES, load_rules())
    assert checked.valid
    assert checked.draft is not None
    result = fill_source_excerpts(checked.draft, PAGES)
    assert result.evidence.claims[0].sourceExcerpt == PAGES[0].lines[0]
    assert checked.draft.evidence.claims[0].sourceExcerpt is None
    assert result.evidence.legacyAnchors is False
    assert page_excerpt(PAGES, 1, [1, 2]) == "The win rate is 84.1 percent.\nsecond line"
    assert "L2: second line" in pages_text(PAGES, numbered=True)
    assert paragraphs("# 标题\n\n## 小标题\n正文\n\n下一段") == ("正文", "下一段")


@pytest.mark.parametrize(
    "case",
    [
        "structure",
        "blank",
        "headings",
        "order",
        "paragraphs",
        "claim_missing",
        "claim_empty",
        "inferred",
        "page",
        "lines",
        "line_pair",
        "numeric_source",
        "metric_number",
        "reader",
        "verified_url",
        "page_count",
        "null_page",
    ],
)
def test_every_bad_draft_class_is_reported_in_chinese(case: str) -> None:
    value = deepcopy(draft_input())
    claim = value["evidence"]["claims"][0]
    if case == "structure":
        del value["meta"]["title"]
    elif case == "blank":
        value["guide"]["oneSentence"] = "  "
    elif case == "headings":
        value["guide"]["article"] += "\n\n## 多余标题"
    elif case == "order":
        value["guide"]["article"] = value["guide"]["article"].replace("先说结论", "错误次序")
    elif case == "paragraphs":
        value["evidence"]["articleBlocks"].pop()
    elif case == "claim_missing":
        value["evidence"]["articleBlocks"][0]["claimIds"] = ["missing"]
    elif case == "claim_empty":
        value["evidence"]["articleBlocks"][0]["claimIds"] = []
    elif case == "inferred":
        value["evidence"]["articleBlocks"][0]["claimOrigin"] = "llm_inferred"
    elif case == "page":
        claim["pdfPage"] = 3
    elif case == "lines":
        claim["sourceLines"] = [1, 3]
    elif case == "line_pair":
        claim["sourceLines"] = [1]
    elif case == "numeric_source":
        claim["quantities"][0]["sourceText"] = "92.4"
    elif case == "metric_number":
        claim["metric"] = "胜率84.1%，另一个数10"
    elif case == "reader":
        value["evidence"]["readerCheck"]["input"] = ""
    elif case == "verified_url":
        value["resources"]["code"]["status"] = "verified"
    elif case == "page_count":
        value["structure"]["pageCount"] = 15
    elif case == "null_page":
        claim["pdfPage"] = None
    result = check_draft(value, PAGES, load_rules())
    assert not result.valid
    assert result.errors
    assert all(any("\u4e00" <= char <= "\u9fff" for char in error) for error in result.errors)


def test_inferred_paragraph_explicit_marker() -> None:
    value = draft_input()
    value["evidence"]["articleBlocks"][0] = {"claimOrigin": "llm_inferred", "claimIds": []}
    value["guide"]["article"] = value["guide"]["article"].replace(
        "测试正文", "我的推断：测试正文", 1
    )
    assert check_draft(value, PAGES, load_rules()).valid


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("arXiv:2505.07078v6 doi:10.1145/test", PaperIdentity("arxiv-2505.07078", "v6")),
        (
            "https://aclanthology.org/2021.acl-long.500/ DOI:10.1234/ABC",
            PaperIdentity("acl-2021.acl-long.500"),
        ),
        (
            "https://doi.org/10.1016/J.JFINECO.2011.11.003",
            PaperIdentity("doi-10.1016-j.jfineco.2011.11.003"),
        ),
        ("https://ssrn.com/abstract=4115411", PaperIdentity("ssrn-4115411")),
    ],
)
def test_identity_priority(text: str, expected: PaperIdentity) -> None:
    assert identify([PageText(1, (text,))]) == expected
    assert identify([PageText(1, ("none",)), PageText(2, ("none",)), PageText(3, (text,))]) is None


def test_custom_and_version_retry() -> None:
    rules = load_rules()
    identity = custom_identity(
        "The An Example of Research on Very Long Scientific Financial Strategies and Methods",
        rules["customStopWords"],
    )
    assert identity.base_id.startswith("custom-example-research-very-long-scientific")
    assert len(identity.base_id.removeprefix("custom-")) <= 40
    paper = Paper.model_validate_json(
        (ROOT / "fixtures/samples/papers/Paper.arxiv-2505.07078.json").read_text()
    )
    assert choose_identity(PaperIdentity(paper.id, "v7"), [paper]).id == paper.id + "-v2"
    with pytest.raises(ValueError, match="已存在"):
        choose_identity(PaperIdentity(paper.id, "v6"), [paper])
    with pytest.raises(ValueError, match="版本未知"):
        choose_identity(PaperIdentity(paper.id), [paper])
    assert (
        choose_identity(PaperIdentity(paper.id, "v7"), [paper], retry_id=paper.id + "-v2").id
        == paper.id + "-v2"
    )


def sample_papers() -> list[Paper]:
    return [
        Paper.model_validate_json(path.read_text())
        for path in sorted((ROOT / "fixtures/samples/papers").glob("Paper.*.json"))
    ]


def test_derive_public_private_and_explicit_edges() -> None:
    papers = sample_papers()
    public = next(p for p in papers if p.status.visibility == "public")
    private = next(p for p in papers if p.status.visibility == "private")
    public.relations = [
        PaperRelation(target=private.id, type="extends", note="私有秘密关系")
    ]  # 后续用契约重新解析
    public = Paper.model_validate(public.model_dump())
    spaces, aliases = load_derivation_config()
    result = derive_documents([public, private], spaces, aliases)
    for key, value in result.items():
        if key.endswith("public"):
            text = value.model_dump_json()
            assert private.id not in text
            assert "私有秘密关系" not in text
            assert all(
                word not in text
                for word in ("legacyCards", "explanations", "mastery", "notes", "source.pdf")
            )
    graph = result["papers.graph.all"]
    assert isinstance(graph, GraphData)
    assert len([e for e in graph.edges if e.type == "relation"]) == 1
    assert all(e.type in {"relation", "belongs_to", "discusses"} for e in graph.edges)
    public_catalog = result["papers.catalog.public"]
    all_catalog = result["papers.catalog.all"]
    assert isinstance(public_catalog, PapersCatalog)
    assert isinstance(all_catalog, PapersCatalog)
    assert public_catalog.stats.paperCount == 1
    assert all_catalog.stats.paperCount == 2


def test_pdf_extract_lines_images_and_bad_pdf(tmp_path: Path) -> None:
    source = tmp_path / "test.pdf"
    with cast(Any, pymupdf.open()) as doc:
        for i in range(2):
            doc.new_page().insert_text((72, 72), f"page {i + 1}\n\nline two")
        doc.save(source)
    result = extract_pdf(source, tmp_path / "result", image_dpi=72)
    assert len(result) == 2
    assert result[0].lines == ("page 1", "line two")
    assert read_pages(tmp_path / "result/pages.jsonl") == result
    assert len(list((tmp_path / "result/pages").glob("*.png"))) == 2
    source.write_bytes(b"not pdf")
    with pytest.raises(ValueError, match="PDF无法打开"):
        extract_pdf(source, tmp_path / "bad")


def test_real_arxiv_pdf_page_count(tmp_path: Path) -> None:
    source = os.environ.get("T30_REAL_PDF")
    if source is None:
        pytest.skip("真实公开PDF单独本地验收，CI不联网")
    with cast(Any, pymupdf.open(source)) as doc:
        actual = doc.page_count
    pages = extract_pdf(Path(source), tmp_path / "real", image_dpi=72)
    assert len(pages) == actual == 15
    assert identify(pages) == PaperIdentity("arxiv-2505.07078", "v6")


@pytest.mark.parametrize("valid", [True, False])
def test_actual_check_cli_exit(tmp_path: Path, valid: bool) -> None:
    value = draft_input()
    if not valid:
        value["evidence"]["readerCheck"]["input"] = ""
    draft = tmp_path / "draft.json"
    draft.write_text(json.dumps(value, ensure_ascii=False))
    (tmp_path / "pages.jsonl").write_text(
        "\n".join(json.dumps({"page": p.page, "lines": p.lines}) for p in PAGES)
    )
    result = subprocess.run(
        [str(Path(sys.executable).with_name("hub")), "papers", "check", str(draft)],
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert result.returncode == (0 if valid else 1), result.stdout + result.stderr
    assert "Traceback" not in result.stderr
    assert any("\u4e00" <= char <= "\u9fff" for char in result.stdout + result.stderr)


@pytest.mark.parametrize("valid", [True, False])
def test_actual_derive_cli_exit(tmp_path: Path, valid: bool) -> None:
    source = tmp_path / "papers.json"
    source.write_text(
        json.dumps([p.model_dump(mode="json") for p in sample_papers()]) if valid else "{}"
    )
    result = subprocess.run(
        [
            str(Path(sys.executable).with_name("hub")),
            "papers",
            "derive",
            "--input",
            str(source),
            "--output",
            str(tmp_path / "derived"),
        ],
        capture_output=True,
        text=True,
        check=False,
        timeout=30,
    )
    assert result.returncode == (0 if valid else 1), result.stdout + result.stderr
    assert "Traceback" not in result.stderr
    assert any("\u4e00" <= char <= "\u9fff" for char in result.stdout + result.stderr)
    assert len(list((tmp_path / "derived").glob("*.json"))) == (5 if valid else 0)


@pytest.mark.parametrize(
    "row",
    [
        [],
        {"page": 0, "lines": []},
        {"page": True, "lines": []},
        {"page": 1, "lines": [""]},
        {"page": 1, "lines": [2]},
    ],
)
def test_page_jsonl_invalid_row(tmp_path: Path, row: Any) -> None:
    path = tmp_path / "pages.jsonl"
    path.write_text(json.dumps(row))
    with pytest.raises(ValueError, match="页文本"):
        read_pages(path)


def test_alias_merge_cooccurrence_and_no_shared_paper_edge() -> None:
    first = sample_papers()[0].model_copy(deep=True)
    second = first.model_copy(deep=True)
    second.id = "custom-other"
    first.status.visibility = second.status.visibility = "public"
    first.spaces = ["custom-agent-systems"]
    second.spaces = ["agent-systems"]
    from hub_contracts import PaperConcept

    first.structure = (
        first.structure.model_copy(
            update={
                "concepts": [
                    PaperConcept(id="a", name="Sharpe ratio"),
                    PaperConcept(id="b", name="risk"),
                ]
            }
        )
        if first.structure
        else None
    )
    second.structure = (
        second.structure.model_copy(
            update={
                "concepts": [
                    PaperConcept(id="a", name="Sharpe"),
                    PaperConcept(id="b", name="R I S K"),
                ]
            }
        )
        if second.structure
        else None
    )
    first.relations = second.relations = []
    spaces, _ = load_derivation_config()
    result = derive_documents([first, second], spaces, {"夏普比率": ["Sharpe", "Sharpe ratio"]})
    graph = result["papers.graph.public"]
    assert isinstance(graph, GraphData)
    assert len([node for node in graph.nodes if node.kind == "concept"]) == 2
    assert len(graph.cooccurrence) == 1
    assert graph.cooccurrence[0].count == 2
    assert not any(edge.type == "relation" for edge in graph.edges)


def test_markdown_code_headings_are_not_article_headings() -> None:
    value = draft_input()
    value["guide"]["article"] += "\n```python\n## this is a code comment\n```"
    assert check_draft(value, PAGES, load_rules()).valid


def test_version_unknown_and_explicit_existing_target() -> None:
    paper = sample_papers()[-1].model_copy(deep=True)
    with pytest.raises(ValueError, match="已存在"):
        choose_identity(PaperIdentity(paper.id, "V6"), [paper])
    base = paper.id
    paper.id = base + "-v1"
    assert choose_identity(PaperIdentity(base, "v7"), [paper]).version_of == paper.id
    paper.meta.version = None
    with pytest.raises(ValueError, match="版本未知"):
        choose_identity(PaperIdentity(base, "v7"), [paper])


@pytest.mark.parametrize(
    "text",
    [
        "ConvS2S",
        "F1",
        "GPT-2",
        "newstest2013",
        "P100",
        "https://example.test/tensor2tensor",
        "Table 2",
        "Table 3",
        "Fig. 10",
    ],
)
def test_identifiers_and_reference_numbers_are_not_measurements(text: str) -> None:
    assert measurement_numbers(text) == ()


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("胜率28.4%与41.29", ("28.4", "41.29")),
        ("Selected 4、Random 5", ("4", "5")),
        ("2-year versus 1-year", ("2", "1")),
        ("学习率1e-3，样本1,234，收益-0.28", ("1e-3", "1234", "-0.28")),
        ("Table 2：BLEU 28.4", ("28.4",)),
    ],
)
def test_real_measurements_remain_required(text: str, expected: tuple[str, ...]) -> None:
    assert measurement_numbers(text) == expected


@pytest.mark.parametrize(
    ("metric", "valid"),
    [("ConvS2S、F1、Table 3：胜率84.1%", True), ("Selected 4、胜率84.1%", False)],
)
def test_identifier_fix_does_not_excuse_missing_sample_quantity(metric: str, valid: bool) -> None:
    value = draft_input()
    value["evidence"]["claims"][0]["metric"] = metric
    assert check_draft(value, PAGES, load_rules()).valid is valid


def test_quantity_on_other_line_of_same_page_still_fails() -> None:
    value = draft_input()
    value["evidence"]["claims"][0]["sourceLines"] = [2, 2]
    assert not check_draft(value, PAGES, load_rules()).valid


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("https://example.test/tensor2tensor；胜率84.1%", ("84.1",)),
        ("代码https://example.test/x。样本1,234", ("1234",)),
        ("https://example.test/x样本28.4", ("28.4",)),
        ("Table 2与胜率28.4%", ("28.4",)),
        ("Selected4、Random5", ("4", "5")),
    ],
)
def test_url_and_identifier_boundaries_preserve_adjacent_quantities(
    text: str, expected: tuple[str, ...]
) -> None:
    assert measurement_numbers(text) == expected


@pytest.mark.parametrize(
    ("text", "expected"),
    [
        ("§6.1 文字为 41.0 BLEU", ("41.0",)),
        ("Table 2 为41.8；§6.1 为41.0", ("41.8", "41.0")),
        ("WSJ 23 F1：Transformer 91.3；Dyer 91.7", ("91.3", "91.7")),
        ("WSJ 23", ()),
        ("WSJ 23条样本，F1为91.3", ("23", "91.3")),
        ("WSJ 24条样本", ("24",)),
        ("WSJ 23测试样本，F1为91.3", ("23", "91.3")),
        ("WSJ23条样本，F1为91.3", ("23", "91.3")),
        ("WSJ24条样本", ("24",)),
        ("WSJ23测试样本，F1为91.3", ("23", "91.3")),
        ("第6.1年增长23%", ("6.1", "23")),
    ],
)
def test_explicit_section_and_dataset_labels_preserve_measurements(
    text: str, expected: tuple[str, ...]
) -> None:
    assert measurement_numbers(text) == expected
