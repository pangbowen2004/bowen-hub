"""唯一公开筛选边界：只派生Paper，不读取或传播PaperPrivate。"""

import re
from collections import Counter
from collections.abc import Mapping, Sequence
from itertools import combinations

from hub_contracts import (
    GraphData,
    Paper,
    PaperConceptCooccurrence,
    PaperGraphEdge,
    PaperGraphNode,
    PapersCatalog,
    PapersCatalogStats,
    PaperSearchItem,
    PaperSpace,
    PaperSummary,
    SearchIndex,
)


def concept_key(name: str) -> str:
    return re.sub(r"\s+", "", name.lower())


def summarize(paper: Paper, spaces: Sequence[str] | None = None) -> PaperSummary:
    return PaperSummary(
        id=paper.id,
        title=paper.meta.title,
        titleZh=paper.meta.titleZh,
        year=paper.meta.year,
        venue=paper.meta.venue,
        oneSentence=paper.guide.oneSentence if paper.guide else None,
        spaces=list(spaces if spaces is not None else paper.spaces or []),
        readingDepth=paper.status.readingDepth,
        paperKind=paper.meta.paperKind,
        paperType=paper.meta.paperType,
        visibility=paper.status.visibility,
        review=paper.status.review,
        updatedAt=paper.status.updatedAt,
        hasCode=bool(
            paper.resources and paper.resources.code and paper.resources.code.status == "verified"
        ),
        conceptCount=len(paper.structure.concepts or []) if paper.structure else 0,
    )


def derive_scope(
    papers: Sequence[Paper],
    spaces: Sequence[PaperSpace],
    aliases: Mapping[str, Sequence[str]],
    *,
    public: bool,
) -> tuple[PapersCatalog, GraphData, SearchIndex]:
    selected = sorted(
        (paper for paper in papers if not public or paper.status.visibility == "public"),
        key=lambda p: p.id,
    )
    if len({paper.id for paper in selected}) != len(selected):
        raise ValueError("论文id重复，不能派生相互覆盖的节点")
    space_lookup = {name: space.id for space in spaces for name in (space.id, *space.aliases)}
    space_labels = {space.id: space.label for space in spaces}
    merge = {
        concept_key(name): concept_key(canonical)
        for canonical, names in aliases.items()
        for name in (canonical, *names)
    }
    nodes = [PaperGraphNode(id="space:" + s.id, kind="space", label=s.label) for s in spaces]
    edges: list[PaperGraphEdge] = []
    summaries: list[PaperSummary] = []
    search: list[PaperSearchItem] = []
    concepts: dict[str, str] = {}
    cooccurrence: Counter[tuple[str, str]] = Counter()
    space_counts: Counter[str] = Counter()
    ids = {paper.id for paper in selected}
    for paper in selected:
        mapped: list[str] = []
        for name in paper.spaces or []:
            if name not in space_lookup:
                raise ValueError(f"论文{paper.id}使用了未配置研究空间：{name}")
            if space_lookup[name] not in mapped:
                mapped.append(space_lookup[name])
        space_counts.update(mapped)
        summaries.append(summarize(paper, mapped))
        nodes.append(
            PaperGraphNode(id=paper.id, kind="paper", label=paper.meta.titleZh or paper.meta.title)
        )
        paper_concepts: dict[str, str] = {}
        for concept in (paper.structure.concepts or []) if paper.structure else []:
            key = merge.get(concept_key(concept.name), concept_key(concept.name))
            if not key:
                raise ValueError("概念名称不能为空")
            paper_concepts[key] = concept.name
            concepts.setdefault(
                key, next((name for name in aliases if concept_key(name) == key), concept.name)
            )
        for key in paper_concepts:
            edges.append(PaperGraphEdge(source=paper.id, target="concept:" + key, type="discusses"))
        for space in mapped:
            edges.append(
                PaperGraphEdge(source=paper.id, target="space:" + space, type="belongs_to")
            )
        for relation in paper.relations or []:
            # 公开论文显式关系也不能暴露私有目标ID、关系注记或节点。
            if relation.target in ids:
                edges.append(
                    PaperGraphEdge(
                        source=paper.id,
                        target=relation.target,
                        type="relation",
                        relationType=relation.type,
                        note=relation.note,
                    )
                )
        cooccurrence.update(combinations(sorted(paper_concepts), 2))
        search.append(
            PaperSearchItem(
                id=paper.id,
                title=paper.meta.title,
                titleZh=paper.meta.titleZh,
                authors=paper.meta.authors or [],
                oneSentence=paper.guide.oneSentence if paper.guide else None,
                concepts=[concepts[key] for key in paper_concepts],
                spaces=[space_labels[key] for key in mapped],
            )
        )
    nodes.extend(
        PaperGraphNode(id="concept:" + key, kind="concept", label=label)
        for key, label in sorted(concepts.items())
    )
    graph = GraphData(
        nodes=nodes,
        edges=edges,
        cooccurrence=[
            PaperConceptCooccurrence(source="concept:" + a, target="concept:" + b, count=count)
            for (a, b), count in sorted(cooccurrence.items())
        ],
    )
    catalog = PapersCatalog(
        stats=PapersCatalogStats(
            paperCount=len(selected),
            spaceCount=len(spaces),
            conceptCount=len(concepts),
            edgeCount=len(edges),
        ),
        spaces=[s.model_copy(update={"paperCount": space_counts[s.id]}) for s in spaces],
        papers=summaries,
    )
    return catalog, graph, SearchIndex(papers=search)


def derive_documents(
    papers: Sequence[Paper], spaces: Sequence[PaperSpace], aliases: Mapping[str, Sequence[str]]
) -> dict[str, PapersCatalog | GraphData | SearchIndex]:
    catalog_public, graph_public, search = derive_scope(papers, spaces, aliases, public=True)
    catalog_all, graph_all, _ = derive_scope(papers, spaces, aliases, public=False)
    return {
        "papers.catalog.public": catalog_public,
        "papers.catalog.all": catalog_all,
        "papers.graph.public": graph_public,
        "papers.graph.all": graph_all,
        "papers.search.public": search,
    }
