"""只读来源目录，API写入与核对留在薄IO层。"""

from collections import Counter
from dataclasses import dataclass
from datetime import date
from pathlib import Path
from tempfile import TemporaryDirectory
from typing import Any, cast
from urllib.parse import quote

from hub_contracts import Paper, PaperLegacyCard, PaperPage, PaperPrivate, PapersCatalog, PaperWrite
from hub_core.api import ApiClient
from hub_core.config import load_config
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_papers.derive import derive_documents
from hub_papers.pdf import extract_pdf
from hub_papers.pdf.config import load_derivation_config

from .convert import Json, LegacyFile, Scan, convert_paper, keys

DISCARDED: dict[str, tuple[str, ...]] = {
    "00-元数据.yml": (
        "materials",
        "integrity",
        "publication_status",
        "retrieved_at",
        "reading.recommended_depth",
        "reading.project_relevance",
        "reading.strategic_role",
    ),
    "11-读者导读.yml": (
        "section_titles",
        "source_figures",
        "comprehension_check",
        "project_connection.harness_connection",
    ),
    "08-理解学习包.yml": ("key_quotes", "mechanism_steps[].number"),
    "10-阅读导航包.yml": ("reading_route.passes", "export", "coverage.dimensions[].id"),
    "资源与出处.yml": ("notes", "retrieved_at", "quantml_articles[].archive_source"),
    "evidence-audit.json": (
        "source_sha256",
        "correction_provenance",
        "excerpt_scope",
        "claims[].excerpt_scope",
        "article_blocks[].sha256",
    ),
}
IGNORED = {"13-金融研究资产.yml", "15-研究种子导出.yml", "全文获取状态.yml"}


@dataclass
class MigrationItem:
    write: PaperWrite
    private: PaperPrivate
    pdf: Path | None


@dataclass
class MigrationPlan:
    items: list[MigrationItem]
    scan: Scan
    files: Counter[str]

    def report(self) -> Json:
        return {
            "papers": len(self.items),
            "public": sum(i.write.paper.status.visibility == "public" for i in self.items),
            "evidence": sum(
                bool(i.write.paper.evidence and i.write.paper.evidence.claims) for i in self.items
            ),
            "pdf": sum(i.pdf is not None for i in self.items),
            "article": sum(
                bool(i.write.paper.guide and i.write.paper.guide.article) for i in self.items
            ),
            "files": dict(sorted(self.files.items())),
            "relations": sum(len(i.write.paper.relations or []) for i in self.items),
            "explanations": sum(len(i.private.explanations) for i in self.items),
            "review": dict(Counter(i.write.paper.status.review for i in self.items)),
            "generalResearch": sum(
                "general-research" in (i.write.paper.spaces or []) for i in self.items
            ),
            "transformations": sorted(self.scan.transformations),
            "keys": {
                "mapped": sorted(self.scan.mapped),
                "discarded": sorted(self.scan.discarded),
                "preserved": sorted(self.scan.preserved),
                "unhandled": [],
            },
        }


def read_plan(source: Path, baseline: Path, graph: Path, *, today: date) -> MigrationPlan:
    root = source / "论文阅读" if (source / "论文阅读").is_dir() else source
    archive = root / "03-论文档案" if (root / "03-论文档案").is_dir() else root
    public_list = load_config(baseline).get("paper_ids")
    if not isinstance(public_list, list) or not all(
        isinstance(v, str) for v in cast(list[Any], public_list)
    ):
        raise ValueError("公开基线必须包含paper_ids字符串列表")
    public = set(cast(list[str], public_list))
    if len(public) != len(cast(list[Any], public_list)):
        raise ValueError("公开基线存在重复论文")
    graph_data = load_config(graph)
    spaces: dict[str, list[str]] = {}
    for space in graph_data.get("spaces", []):
        name = space["id"]
        name = "agent-systems" if name == "custom-agent-systems" else name
        for paper_id in space.get("paper_ids", []):
            if name not in spaces.setdefault(paper_id, []):
                spaces[paper_id].append(name)
    relations: dict[str, list[Json]] = {}
    relation_transforms: set[str] = set()
    for edge in graph_data.get("graph", {}).get("edges", []):
        if edge.get("type_key") == "explicit_link":
            source_id = str(edge["source"]).removeprefix("paper:")
            target_id = str(edge["target"]).removeprefix("paper:")
            relations.setdefault(source_id, []).append(
                {"target": target_id, "type": edge["label"], "note": edge.get("evidence")}
            )
            if source_id != edge["source"] or target_id != edge["target"]:
                relation_transforms.add(
                    source_id + ":graph.explicit_link:paper命名空间→论文id:" + target_id
                )
    scan = Scan()
    scan.transformations.update(relation_transforms)
    counts: Counter[str] = Counter()
    items: list[MigrationItem] = []
    directories = sorted(p.parent for p in archive.glob("*/00-元数据.yml"))
    if not directories:
        raise ValueError("没有找到论文档案")
    paper_ids = {p.name for p in directories}
    if public - paper_ids:
        raise ValueError("公开基线包含来源不存在的论文")
    for directory in directories:
        files: dict[str, LegacyFile] = {}
        markdown: dict[str, str] = {}
        for path in sorted(directory.iterdir()):
            if not path.is_file() or path.suffix not in {".yml", ".yaml", ".json", ".md"}:
                continue
            counts[path.name] += 1
            if path.suffix == ".md":
                markdown[path.name] = path.read_text(encoding="utf-8")
                continue
            data = load_config(path)
            file = LegacyFile(path.name, data, path.read_text(encoding="utf-8"), scan)
            if path.name in IGNORED:
                scan.discarded.update(path.name + ":" + key for key in keys(data))
                continue
            files[path.name] = file
            for discarded in DISCARDED.get(path.name, ()):
                file.discard(discarded)
        meta = files["00-元数据.yml"]
        if meta.data.get("paper_id", directory.name) != directory.name:
            raise ValueError("目录与元数据论文ID不一致")
        write, private = convert_paper(
            directory.name,
            files,
            markdown,
            public=public,
            spaces=spaces.get(directory.name, ["general-research"]),
            relations=relations.get(directory.name, []),
            today=today,
        )
        # 未识别Markdown也保留私人原文，不静默丢掉额外阅读材料。
        known_markdown = {
            "01-R0初筛卡.md",
            "02-R1结构阅读卡.md",
            "12-论文导读文章.md",
            "QuantML导读.md",
        }
        for name in markdown.keys() - known_markdown:
            private.legacyCards.append(PaperLegacyCard(title=name, markdown=markdown[name]))
            scan.preserved.add(name)
        materials = meta.data.get("materials", {})
        explicit: list[Path] = []
        if isinstance(materials, dict):
            for key in ("main_text", "original_pdf", "source_pdf", "pdf"):
                value = cast(Json, materials).get(key)
                declared_path = isinstance(value, dict) and "path" in value
                if isinstance(value, dict):
                    value = cast(Json, value).get("path")
                if declared_path or (isinstance(value, str) and value.lower().endswith(".pdf")):
                    if not isinstance(value, str) or not value:
                        raise ValueError("材料明确指定的PDF路径无效")
                    selected = directory / value
                    if Path(value).is_absolute() or not selected.resolve().is_relative_to(
                        directory.resolve()
                    ):
                        raise ValueError("材料明确指定的PDF路径不在本篇目录内")
                    if not selected.is_file():
                        raise ValueError("材料明确指定的PDF不存在，不能回退选择其他PDF")
                    explicit.append(selected)
        candidates = sorted(directory.rglob("*.pdf"))
        choices = list(dict.fromkeys(explicit)) or candidates
        pdf: Path | None = choices[0] if len(choices) == 1 else None
        if len(choices) > 1:
            raise ValueError("单篇存在多个PDF，需要先明确原文来源，不能猜测")
        if pdf is not None:
            counts["PDF"] += 1
        items.append(MigrationItem(write, private, pdf if pdf and pdf.is_file() else None))
    return MigrationPlan(items, scan, counts)


class MigrationApi:
    def __init__(self, settings: Settings, http: HttpClient) -> None:
        self.api = ApiClient(settings, http)
        self.http = http
        self.base = settings.hub_api_url.rstrip("/")
        token = settings.hub_service_token
        if token is None:
            raise ValueError("缺少服务令牌")
        self.headers = {"Authorization": "Bearer " + token.get_secret_value()}

    def binary(
        self, method: str, path: str, data: bytes | None = None, media: str | None = None
    ) -> bytes:
        headers = dict(self.headers)
        if media:
            headers["Content-Type"] = media
        response = self.http.request(
            method, self.base + path, source="hub-api", headers=headers, content=data
        )
        return response.content

    def write(self, plan: MigrationPlan) -> None:
        for item in plan.items:
            if item.pdf is None and item.write.paper.guide and item.write.paper.guide.article:
                raise ValueError("有导读的论文缺少原文PDF，未开始写入")
        # 全部PDF在临时目录预处理成功后才开始API写入。
        with TemporaryDirectory(prefix="hub-paper-migrate-") as temp:
            outputs: dict[str, Path] = {}
            for item in plan.items:
                if item.pdf:
                    output = Path(temp) / item.write.paper.id
                    pages = extract_pdf(item.pdf, output)
                    expected = (
                        item.write.paper.structure.pageCount if item.write.paper.structure else None
                    )
                    if expected is not None and expected != len(pages):
                        raise ValueError("PDF物理页数与档案不一致")
                    outputs[item.write.paper.id] = output
            for item in plan.items:
                base = "/v1/internal/papers/" + quote(item.write.paper.id, safe="")
                if item.pdf:
                    output = outputs[item.write.paper.id]
                    for name, path, media in (
                        ("source.pdf", item.pdf, "application/pdf"),
                        ("pages.jsonl", output / "pages.jsonl", "application/x-ndjson"),
                        ("pages.txt", output / "pages.txt", "text/plain; charset=utf-8"),
                    ):
                        self.binary("PUT", base + "/files/" + name, path.read_bytes(), media)
                    for image in sorted(
                        (output / "pages").glob("*.png"), key=lambda p: int(p.stem)
                    ):
                        self.binary(
                            "PUT", base + "/pages/" + image.stem, image.read_bytes(), "image/png"
                        )
                self.api.put(base, item.write)
                self.api.put(base + "/private", item.private)
        papers = self.read_all()
        spaces, aliases = load_derivation_config()
        for key, document in derive_documents(papers, spaces, aliases).items():
            self.api.put("/v1/internal/documents/" + quote(key, safe=""), document)

    def read_all(self) -> list[Paper]:
        papers: list[Paper] = []
        path = "/v1/papers?limit=100"
        seen: set[str] = set()
        while True:
            page = self.api.get(path, PaperPage)
            papers.extend(
                self.api.get("/v1/papers/" + quote(s.id, safe=""), Paper) for s in page.items
            )
            if page.nextCursor is None:
                break
            if page.nextCursor in seen:
                raise ValueError("API分页游标重复")
            seen.add(page.nextCursor)
            path = "/v1/papers?limit=100&cursor=" + quote(page.nextCursor, safe="")
        if len({p.id for p in papers}) != len(papers):
            raise ValueError("API论文分页重复")
        return papers

    def verify(self, plan: MigrationPlan) -> None:
        actual = {p.id: p for p in self.read_all()}
        if actual.keys() != {i.write.paper.id for i in plan.items}:
            raise ValueError("API论文集合与迁移源不一致")
        for item in plan.items:
            paper = item.write.paper
            if actual[paper.id] != paper:
                raise ValueError("API论文内容与迁移源不一致")
            base = "/v1/papers/" + quote(paper.id, safe="")
            if self.api.get(base + "/private", PaperPrivate) != item.private:
                raise ValueError("API私人内容与迁移源不一致")
            if item.pdf:
                internal = "/v1/internal/papers/" + quote(paper.id, safe="") + "/files/"
                if self.binary("GET", internal + "source.pdf") != item.pdf.read_bytes():
                    raise ValueError("API原文PDF与迁移源不一致")
                with TemporaryDirectory(prefix="hub-paper-verify-") as temp:
                    output = Path(temp)
                    pages = extract_pdf(item.pdf, output)
                    for name in ("pages.jsonl", "pages.txt"):
                        if self.binary("GET", internal + name) != (output / name).read_bytes():
                            raise ValueError("API页文本与同T30抽取结果不一致")
                    for n in range(1, len(pages) + 1):
                        if (
                            self.binary("GET", base + f"/pages/{n}")
                            != (output / "pages" / f"{n}.png").read_bytes()
                        ):
                            raise ValueError("API页图与同T30抽取结果不一致")
        catalog = self.api.get("/v1/public/papers/catalog", PapersCatalog)
        expected = {
            i.write.paper.id for i in plan.items if i.write.paper.status.visibility == "public"
        }
        if {p.id for p in catalog.papers} != expected or catalog.stats.paperCount != len(expected):
            raise ValueError("公开目录与基线不一致")
