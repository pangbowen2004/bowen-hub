"""只转换老数据；每个键映射、明确丢弃或保留私人原文。"""

import json
import re
from dataclasses import dataclass, field
from datetime import date
from typing import Any, cast

from hub_contracts import Paper, PaperPrivate, PaperSummary, PaperWrite

Json = dict[str, Any]


def camel(key: str) -> str:
    head, *tail = key.split("_")
    return head + "".join(part[:1].upper() + part[1:] for part in tail)


def converted(value: Any) -> Any:
    if isinstance(value, dict):
        return {camel(str(k)): converted(v) for k, v in cast(Json, value).items()}
    if isinstance(value, list):
        return [converted(v) for v in cast(list[Any], value)]
    return value


def keys(value: Any, prefix: str = "") -> set[str]:
    result: set[str] = set()
    if isinstance(value, dict):
        for key, child in cast(Json, value).items():
            path = prefix + "." + key if prefix else key
            result.add(path)
            result.update(keys(child, path))
    elif isinstance(value, list):
        for child in cast(list[Any], value):
            result.update(keys(child, prefix + "[]"))
    return result


@dataclass
class Scan:
    transformations: set[str] = field(default_factory=lambda: set[str]())
    mapped: set[str] = field(default_factory=lambda: set[str]())
    discarded: set[str] = field(default_factory=lambda: set[str]())
    preserved: set[str] = field(default_factory=lambda: set[str]())


@dataclass
class LegacyFile:
    name: str
    data: Json
    text: str
    scan: Scan
    handled: set[str] = field(default_factory=lambda: set[str]())

    def take(self, key: str, default: Any = None) -> Any:
        if key in self.data:
            self.handled.add(key)
        return self.data.get(key, default)

    def discard(self, path: str) -> None:
        for key in keys(self.data):
            if key == path or key.startswith((path + ".", path + "[]")):
                self.scan.discarded.add(self.name + ":" + key)

    def finish(self) -> bool:
        self.scan.preserved.difference_update(self.scan.discarded)
        unknown = False
        for key in keys(self.data):
            label = self.name + ":" + key
            if label in self.scan.discarded or label in self.scan.preserved:
                continue
            if key.split(".")[0].split("[")[0] in self.handled:
                self.scan.mapped.add(label)
            else:
                self.scan.preserved.add(label)
                unknown = True
        self.scan.mapped.difference_update(self.scan.preserved | self.scan.discarded)
        return unknown or any(k.startswith(self.name + ":") for k in self.scan.preserved)


def prune(value: Any, schema: Json, definitions: Json, unknown: set[str], prefix: str) -> Any:
    """生成模型默认忽略额外键；在验证之前显式识别并保留它们。"""
    if "$ref" in schema:
        schema = definitions[schema["$ref"].split("/")[-1]]
    if "anyOf" in schema:
        options = cast(list[Json], schema["anyOf"])
        candidates = [s for s in options if s.get("type") != "null"]
        if isinstance(value, dict):
            schema = next(
                (s for s in candidates if "$ref" in s or s.get("type") == "object"), schema
            )
        elif isinstance(value, list):
            schema = next((s for s in candidates if s.get("type") == "array"), schema)
        if "$ref" in schema:
            schema = definitions[schema["$ref"].split("/")[-1]]
    if isinstance(value, dict) and "properties" in schema:
        properties = cast(Json, schema["properties"])
        result: Json = {}
        for key, child in cast(Json, value).items():
            path = prefix + "." + key
            if key in properties:
                result[key] = prune(child, properties[key], definitions, unknown, path)
            else:
                unknown.add(path)
                unknown.update(keys(child, path))
        return result
    if isinstance(value, list) and "items" in schema:
        return [
            prune(v, schema["items"], definitions, unknown, prefix + "[]")
            for v in cast(list[Any], value)
        ]
    return cast(Any, value)


def r1_evidence(text: str) -> tuple[Json, list[str]]:
    section = ""
    claims: list[Json] = []
    questions: list[str] = []
    for line in text.splitlines():
        if line.startswith("## "):
            section = line
        elif "关键结果" in section and line.strip().startswith("|"):
            cells = [cell.strip() for cell in re.split(r"(?<!\\)\|", line.strip())[1:-1]]
            if (
                len(cells) < 4
                or cells[0] == "结果"
                or all(re.fullmatch(r":?-+:?", c) for c in cells)
            ):
                continue
            page = re.search(r"\bp\.?\s*(\d+)", cells[3], re.I)
            claims.append(
                {
                    "id": f"c{len(claims) + 1}",
                    "kind": "result",
                    "claim": cells[0],
                    "metric": cells[1],
                    "interpretationBoundary": cells[2],
                    "anchor": cells[3],
                    "pdfPage": int(page[1]) if page else None,
                    "claimOrigin": "paper_supported",
                    "quantities": [],
                    "sourceExcerpt": None,
                }
            )
        elif "尚未理解或待核查" in section and re.match(r"^\s*[-*]\s+", line):
            questions.append(re.sub(r"^\s*[-*]\s+", "", line))
    return {
        "readerCheck": None,
        "claims": claims,
        "articleBlocks": [],
        "legacyAnchors": True,
    }, questions


def convert_paper(
    paper_id: str,
    files: dict[str, LegacyFile],
    markdown: dict[str, str],
    *,
    public: set[str],
    spaces: list[str],
    relations: list[Json],
    today: date,
) -> tuple[PaperWrite, PaperPrivate]:
    meta_file = files["00-元数据.yml"]
    board = files.get("07-看板状态.yml")
    guide_file = files.get("11-读者导读.yml")
    learning_file = files.get("08-理解学习包.yml")
    navigation = files.get("10-阅读导航包.yml")
    resources_file = files.get("资源与出处.yml")
    audit = files.get("evidence-audit.json")
    raw: Json = {"schemaVersion": 1, "id": paper_id, "spaces": spaces, "relations": relations}
    raw["meta"] = {
        camel(k): meta_file.take(k)
        for k in (
            "title",
            "title_zh",
            "authors",
            "year",
            "venue",
            "version",
            "paper_type",
            "study_design",
            "doi",
            "arxiv_id",
            "anthology_id",
            "source_url",
        )
        if k in meta_file.data
    }
    reading = cast(Json, meta_file.take("reading", {}))
    updated = (
        meta_file.take("updated_at")
        or (board.take("updated_at") if board else None)
        or today.isoformat()
    )
    status_text = str(reading.get("status", ""))
    raw["status"] = {
        "visibility": "public" if paper_id in public else "private",
        "review": "passed"
        if status_text == "已结构阅读"
        or any(x in status_text for x in ("核验通过", "修正并核验", "自检完成"))
        else "draft",
        "readingDepth": "R0"
        if reading.get("completed_depth", "未开始") == "未开始"
        else reading["completed_depth"],
        "nextAction": "",
        "updatedAt": str(updated)[:10],
    }
    guide: Json = {}
    if guide_file:
        for key in (
            "reading_goal",
            "one_sentence",
            "prerequisites",
            "method",
            "experiment",
            "findings",
            "bottom_line",
            "limitations",
            "project_connection",
            "open_questions",
        ):
            if key in guide_file.data:
                guide[camel(key)] = converted(guide_file.take(key))
        problem = guide_file.take("research_problem") or guide_file.take("problem")
        if problem is not None:
            problem = converted(problem)
            if "setup" not in problem:
                problem["setup"] = "\n\n".join(
                    str(problem.pop(k)) for k in ("question", "pain") if k in problem
                )
            guide["problem"] = problem
        if "method" in guide and "overview" in guide["method"]:
            guide["method"]["thesis"] = guide["method"].pop("overview")
    if "12-论文导读文章.md" in markdown:
        guide["article"] = markdown["12-论文导读文章.md"]
    if audit:
        raw["evidence"] = {
            camel(k): converted(audit.take(k))
            for k in ("reader_check", "claims", "article_blocks")
            if k in audit.data
        }
        raw["evidence"]["legacyAnchors"] = True
        for claim in raw["evidence"].get("claims", []):
            if claim.get("kind") == "problem":
                claim["kind"] = "definition"
                audit.scan.preserved.add(audit.name + ":claims[].kind")
                audit.scan.transformations.add(
                    paper_id + ":evidence.claims.kind:problem→definition"
                )
        if "paper_kind" in audit.data:
            raw["meta"]["paperKind"] = audit.take("paper_kind")
    elif "02-R1结构阅读卡.md" in markdown:
        raw["evidence"], guide["openQuestions"] = r1_evidence(markdown["02-R1结构阅读卡.md"])
    structure: Json = {}
    learning: Json = {}
    if learning_file:
        for key in ("concepts", "figures"):
            if key in learning_file.data:
                structure[key] = converted(learning_file.take(key))
        for key in (
            "orientation",
            "mechanism_steps",
            "design_philosophy",
            "expert_qa",
            "active_recall",
        ):
            if key in learning_file.data:
                learning[camel(key)] = converted(learning_file.take(key))
        for step in learning.get("mechanismSteps", []):
            if "title" in step:
                step["step"] = step.pop("title")
            if "explanation" in step:
                step["detail"] = step.pop("explanation")
            step.pop("number", None)
    if navigation:
        document = cast(Json, navigation.take("document_map", {}))
        if "page_count" in document:
            structure["pageCount"] = document["page_count"]
        if "sections" in document:
            structure["sections"] = converted(document["sections"])
            for index, section in enumerate(structure["sections"]):
                if isinstance(section, str):
                    structure["sections"][index] = {"pages": "", "role": section}
                    navigation.scan.preserved.add(navigation.name + ":document_map.sections")
                    navigation.scan.transformations.add(
                        paper_id + ":document_map.sections:string→role;pages为空"
                    )
                    continue
                if isinstance(section.get("pages"), list):
                    section["pages"] = ", ".join(str(p) for p in section["pages"])
                elif isinstance(section.get("pages"), int):
                    section["pages"] = str(section["pages"])
                elif section.get("pages") is None:
                    section["pages"] = ""
                    navigation.scan.preserved.add(navigation.name + ":document_map.sections")
                    navigation.scan.transformations.add(
                        paper_id + ":document_map.sections.pages:缺省→空串"
                    )
                if section.get("status") not in {None, "read", "skimmed", "unread"}:
                    old_status = section.pop("status")
                    navigation.scan.preserved.add(
                        navigation.name + ":document_map.sections[].status"
                    )
                    navigation.scan.transformations.add(
                        paper_id
                        + f":document_map.sections[{index}].status:{old_status}→省略可选字段"
                    )
        coverage = navigation.take("coverage", {})
        if "dimensions" in coverage:
            structure["coverage"] = converted(coverage["dimensions"])
            for dimension in structure["coverage"]:
                dimension["dimension"] = dimension.pop("name")
                dimension.pop("id", None)
        for old, new in (
            ("critical_appraisal", "appraisal"),
            ("negative_and_null", "negativeResults"),
        ):
            if old in navigation.data:
                structure[new] = converted(navigation.take(old))
        for index, negative in enumerate(structure.get("negativeResults", [])):
            if isinstance(negative, dict):
                structure["negativeResults"][index] = json.dumps(negative, ensure_ascii=False)
                navigation.scan.preserved.add(navigation.name + ":negative_and_null")
                navigation.scan.transformations.add(
                    paper_id + ":negative_and_null:对象→完整字段说明字符串"
                )
        appraisal = structure.get("appraisal", {})
        for index, dimension in enumerate(appraisal.get("dimensions", [])):
            if isinstance(dimension, str):
                appraisal["dimensions"][index] = {"name": dimension}
                navigation.scan.preserved.add(navigation.name + ":critical_appraisal.dimensions")
                navigation.scan.transformations.add(
                    paper_id + ":critical_appraisal.dimensions:string→name"
                )
            elif isinstance(dimension, dict):
                dimension = cast(Json, dimension)
                if "name" not in dimension and "id" in dimension:
                    dimension["name"] = dimension["id"]
                    navigation.scan.preserved.add(
                        navigation.name + ":critical_appraisal.dimensions"
                    )
                    navigation.scan.transformations.add(
                        paper_id + ":critical_appraisal.dimensions:id→name"
                    )
                if "note" not in dimension and ("finding" in dimension or "evidence" in dimension):
                    dimension["note"] = dimension.get("finding", dimension.get("evidence"))
                    navigation.scan.preserved.add(
                        navigation.name + ":critical_appraisal.dimensions"
                    )
                    navigation.scan.transformations.add(
                        paper_id + ":critical_appraisal.dimensions:finding或evidence→note"
                    )
        citations = navigation.take("citation_navigation", {})
        raw["citations"] = {
            direction: [
                {"title": item, "why": ""} if isinstance(item, str) else converted(item)
                for item in citations.get(direction, [])
            ]
            for direction in ("backward", "forward")
        }
        for direction in ("backward", "forward"):
            for citation in raw["citations"][direction]:
                if "title" not in citation:
                    title = citation.get("work", citation.get("task"))
                    if title is not None:
                        citation["title"] = title
                if "why" not in citation and "reason" in citation:
                    citation["why"] = citation["reason"]
                if "work" in citation or "task" in citation or "reason" in citation:
                    navigation.scan.preserved.add(navigation.name + ":citation_navigation")
                    navigation.scan.transformations.add(
                        paper_id + ":citation_navigation:work或task→title;reason→why"
                    )
        route = navigation.take("reading_route", {})
        raw["status"]["nextAction"] = route.get("next_action", "")
    if not raw["status"]["nextAction"] and board:
        raw["status"]["nextAction"] = board.take("recommended_next", "")
    resources: Json = {}
    if resources_file:
        paper = cast(Json, resources_file.take("paper", {}))
        resources["landingPage"] = paper.get("landing_page")
        raw["meta"]["pdfUrl"] = paper.get("pdf")
        code = resources_file.take("code")
        if code:
            resources["code"] = (
                {"status": "unverified", "url": code} if isinstance(code, str) else converted(code)
            )
        articles = resources_file.take("quantml_articles", [])
        resources["secondary"] = [{"title": a["title"]} for a in articles]
    if guide_file:
        code_navigation = guide_file.take("code_navigation")
        code_entries = guide_file.take("code_entries")
        if code_navigation:
            resources["code"] = {**resources.get("code", {}), **converted(code_navigation)}
        if code_entries:
            resources.setdefault("code", {}).setdefault(
                "url",
                next(
                    (
                        cast(Json, e)["url"]
                        for e in cast(list[Any], code_entries)
                        if isinstance(e, dict) and cast(Json, e).get("url")
                    ),
                    None,
                ),
            )
            entries_note = "\n".join(str(e) for e in code_entries)
            resources["code"]["note"] = "\n".join(
                filter(None, (resources["code"].get("note", ""), entries_note))
            )
    if resources.get("code", {}).get("status") not in {None, "verified", "unverified", "not_found"}:
        original_status = resources["code"]["status"]
        resources["code"]["status"] = "unverified"
        meta_file.scan.transformations.add(
            paper_id + ":resources.code.status:" + str(original_status) + "→unverified"
        )
        if (
            guide_file
            and isinstance(guide_file.data.get("code_navigation"), dict)
            and "status" in guide_file.data["code_navigation"]
        ):
            guide_file.scan.preserved.add(guide_file.name + ":code_navigation.status")
        if (
            resources_file
            and isinstance(resources_file.data.get("code"), dict)
            and "status" in resources_file.data["code"]
        ):
            resources_file.scan.preserved.add(resources_file.name + ":code.status")
    raw.update(
        guide=guide or None,
        structure=structure or None,
        learning=learning or None,
        resources=resources or None,
    )
    schema = Paper.model_json_schema()
    unknown: set[str] = set()
    cleaned = prune(raw, schema, schema.get("$defs", {}), unknown, "")
    # 原文件里未被模型接纳的嵌套键不能被Pydantic静默忽略。
    for file in files.values():
        for key in keys(file.data):
            converted_path = ".".join(camel(part) for part in key.split("."))
            if any(
                path.endswith("." + converted_path) or converted_path.endswith(path)
                for path in unknown
            ):
                file.scan.preserved.add(file.name + ":" + key)
    destinations: dict[str, dict[str, str]] = {
        "00-元数据.yml": {k: "meta." + camel(k) for k in meta_file.handled},
        "11-读者导读.yml": {
            k: "guide." + camel(k) for k in (guide_file.handled if guide_file else set[str]())
        },
        "08-理解学习包.yml": {
            k: ("structure." if k in {"concepts", "figures"} else "learning.") + camel(k)
            for k in (learning_file.handled if learning_file else set[str]())
        },
        "10-阅读导航包.yml": {
            "document_map.sections": "structure.sections",
            "document_map.page_count": "structure.pageCount",
            "coverage.dimensions": "structure.coverage",
            "critical_appraisal": "structure.appraisal",
            "negative_and_null": "structure.negativeResults",
            "citation_navigation": "citations",
            "reading_route.next_action": "status.nextAction",
        },
        "evidence-audit.json": {
            k: "evidence." + camel(k) for k in ("claims", "reader_check", "article_blocks")
        },
        "资源与出处.yml": {
            "paper.landing_page": "resources.landingPage",
            "paper.pdf": "meta.pdfUrl",
            "code": "resources.code",
            "quantml_articles[].title": "resources.secondary[].title",
        },
    }
    destinations["00-元数据.yml"].update(
        {
            "reading.completed_depth": "status.readingDepth",
            "reading.status": "status.review",
            "updated_at": "status.updatedAt",
        }
    )
    destinations["11-读者导读.yml"].update(
        {
            "research_problem": "guide.problem",
            "problem": "guide.problem",
            "code_navigation": "resources.code",
            "code_entries": "resources.code.note",
        }
    )
    accepted = keys(cleaned)
    for file in files.values():
        mapping = destinations.get(file.name, {})
        for key in keys(file.data):
            label = file.name + ":" + key
            if label in file.scan.discarded:
                continue
            target: str | None = None
            for old in sorted(mapping, key=len, reverse=True):
                if key == old or key.startswith((old + ".", old + "[]")):
                    target = mapping[old] + ".".join(
                        camel(part) for part in key[len(old) :].split(".")
                    )
                    break
            if target:
                target = (
                    target.replace(".mechanismSteps[].title", ".mechanismSteps[].step")
                    .replace(".mechanismSteps[].explanation", ".mechanismSteps[].detail")
                    .replace(".coverage[].name", ".coverage[].dimension")
                    .replace(".problem.question", ".problem.setup")
                    .replace(".problem.pain", ".problem.setup")
                    .replace(".method.overview", ".method.thesis")
                )
            if target not in accepted and "." in key:
                file.scan.preserved.add(label)
    paper = Paper.model_validate(cleaned)
    private: Json = {
        "schemaVersion": 1,
        "mastery": "confirmed"
        if board and board.take("knowledge_status") == "confirmed"
        else "pending",
        "notes": board.take("user_note", "") if board else "",
        "explanations": [],
        "legacyCards": [
            {"title": title, "markdown": markdown[name]}
            for name, title in (
                ("01-R0初筛卡.md", "R0 初筛卡"),
                ("02-R1结构阅读卡.md", "R1 结构阅读卡"),
                ("QuantML导读.md", "QuantML 导读"),
            )
            if name in markdown
        ],
    }
    explanations = files.get("09-解释记录.yml")
    if explanations:
        private["explanations"] = converted(explanations.take("explanations", []))
        for explanation in private["explanations"]:
            if "knowledgeStatus" in explanation:
                explanation["status"] = (
                    "confirmed" if explanation["knowledgeStatus"] == "confirmed" else "pending"
                )
                explanations.scan.preserved.add(
                    explanations.name + ":explanations[].knowledge_status"
                )
                explanations.scan.transformations.add(
                    paper_id + ":explanations.knowledge_status→status"
                )
            if "citations" in explanation:
                page_numbers: list[int] = []
                for citation in explanation["citations"]:
                    if isinstance(citation, str):
                        for match in re.finditer(r"\bPDF\s+p\.\s*(\d+)\b", citation, re.IGNORECASE):
                            page = int(match[1])
                            if page > 0 and page not in page_numbers:
                                page_numbers.append(page)
                explanation["pages"] = page_numbers
                explanations.scan.preserved.add(explanations.name + ":explanations[].citations")
                explanations.scan.transformations.add(
                    paper_id + ":explanations.citations:明确PDF p.N→pages"
                )
    supplement = [
        f"## {file.name}\n\n```yaml\n{file.text}\n```" for file in files.values() if file.finish()
    ]
    if supplement:
        private["legacyCards"].append(
            {"title": "迁移补充字段", "markdown": "\n\n".join(supplement)}
        )
    summary = PaperSummary(
        id=paper.id,
        title=paper.meta.title,
        titleZh=paper.meta.titleZh,
        year=paper.meta.year,
        venue=paper.meta.venue,
        oneSentence=paper.guide.oneSentence if paper.guide else None,
        spaces=paper.spaces or [],
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
    return PaperWrite(paper=paper, summary=summary), PaperPrivate.model_validate(private)
