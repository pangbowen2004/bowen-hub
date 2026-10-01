"""确定性后置校验。报告只记录路径与原因，不保留私人正文。"""

import copy
import re
from collections.abc import Callable
from dataclasses import dataclass, field
from decimal import Decimal
from typing import Any, cast


@dataclass
class CheckContext:
    inputs: dict[str, Any]
    schema: dict[str, Any]
    advice_words: list[str] = field(default_factory=lambda: list[str]())
    total_pages: int | None = None


@dataclass
class CheckReport:
    name: str
    changes: list[str] = field(default_factory=lambda: list[str]())
    failed: bool = False


Check = Callable[[dict[str, Any], CheckContext], CheckReport]

# 排除语境而非排除所有四位数；例如 2025 亿仍须核对。
EXCLUSIONS = re.compile(
    r"(?<![0-9])(?:19|20)\d{2}(?![\d,.]|\s*(?:亿|万|%|B\b|million|billion))(?=年|\b)|\b\d{1,2}:\d{2}(?::\d{2})?\b|\b\d{4}[-/]\d{1,2}[-/]\d{1,2}\b|\d{1,2}\s*月\s*\d{1,2}\s*[日号]|\bQ[1-4]\b|第[一二三四1234]季度|\b8-K\b|\bForm\s+\d+\b|\bItem\s+\d+(?:\.\d+)?\b|(?:标普|S&P\s*)\s*500|\b(?:January|February|March|April|May|June|July|August|September|October|November|December)\s+\d{1,2}\b",
    re.I,
)
NUMBER = re.compile(
    r"(?<![A-Za-z0-9_.])(?P<dollar>\$)?[+-]?(?P<n>\d[\d,]*(?:\.\d+)?)(?:\s*(?P<u>万亿|亿|万|billion|million|thousand|[BMbmkK]|%|bp|倍))?",
    re.I,
)
MULTIPLIERS = {
    "万亿": Decimal(10) ** 12,
    "亿": Decimal(10) ** 8,
    "万": Decimal(10) ** 4,
    "b": Decimal(10) ** 9,
    "billion": Decimal(10) ** 9,
    "m": Decimal(10) ** 6,
    "million": Decimal(10) ** 6,
    "k": Decimal(10) ** 3,
    "thousand": Decimal(10) ** 3,
}


def quantities(text: str) -> set[Decimal]:
    text = EXCLUSIONS.sub(" ", text)
    found: set[Decimal] = set()
    for match in NUMBER.finditer(text):
        number = match["n"].replace(",", "")
        if not match["u"] and not match["dollar"] and len(number.split(".")[0]) < 3:
            continue
        found.add(Decimal(number) * MULTIPLIERS.get((match["u"] or "").lower(), Decimal(1)))
    return found


def sentences(text: str) -> list[str]:
    return [part for part in re.findall(r".*?(?:[。！？!?]|\.(?=\s|$)|\n|$)", text, re.S) if part]


def _strings(value: Any) -> list[str]:
    if isinstance(value, str):
        return [value]
    if isinstance(value, dict):
        return [text for child in cast(dict[str, Any], value).values() for text in _strings(child)]
    if isinstance(value, list):
        return [text for child in cast(list[Any], value) for text in _strings(child)]
    return []


def _walk(
    value: Any,
    schema: dict[str, Any],
    transform: Callable[[str, dict[str, Any], str], str],
    path: str = "$",
) -> Any:
    if isinstance(value, str):
        return transform(value, schema, path)
    if isinstance(value, list):
        child_schema = {
            **schema.get("items", {}),
            **({"x-max-chars": schema["x-max-chars"]} if "x-max-chars" in schema else {}),
        }
        return [
            _walk(child, child_schema, transform, f"{path}[{i}]")
            for i, child in enumerate(cast(list[Any], value))
        ]
    if isinstance(value, dict):
        props = schema.get("properties", {})
        # anyOf/allOf 注解的分支按实际键汇合；强结构已先经生成校验器。
        for branch in schema.get("anyOf", []) + schema.get("allOf", []):
            props = {**props, **branch.get("properties", {})}
        return {
            key: _walk(child, props.get(key, {}), transform, f"{path}.{key}")
            if key != "generatedBy"
            else child
            for key, child in cast(dict[str, Any], value).items()
        }
    return value


def _filter_text(
    name: str, output: dict[str, Any], ctx: CheckContext, predicate: Callable[[str], bool]
) -> CheckReport:
    report = CheckReport(name)

    def transform(text: str, _schema: dict[str, Any], path: str) -> str:
        kept = [sentence for sentence in sentences(text) if predicate(sentence)]
        result = "".join(kept)
        if result != text:
            report.changes.append(path)
            if not result.strip():
                report.failed = True
        return result

    updated = _walk(output, ctx.schema, transform)
    output.clear()
    output.update(updated)
    return report


def numbers_in_sources(output: dict[str, Any], ctx: CheckContext) -> CheckReport:
    known = quantities("\n".join(_strings(ctx.inputs)))
    return _filter_text("numbers_in_sources", output, ctx, lambda text: quantities(text) <= known)


def no_advice(output: dict[str, Any], ctx: CheckContext) -> CheckReport:
    return _filter_text(
        "no_advice", output, ctx, lambda text: not any(word in text for word in ctx.advice_words)
    )


def length_within(output: dict[str, Any], ctx: CheckContext) -> CheckReport:
    report = CheckReport("length_within")

    def truncate(text: str, schema: dict[str, Any], path: str) -> str:
        limit = schema.get("x-max-chars")
        if not isinstance(limit, int) or len(text) <= limit:
            return text
        prefix = text[:limit]
        boundaries = list(re.finditer(r"[。！？!?]|\.(?=\s|$)", prefix))
        result = prefix[: boundaries[-1].end()] if boundaries else ""
        report.changes.append(path)
        report.failed |= not bool(result)
        return result

    updated = _walk(output, ctx.schema, truncate)
    output.clear()
    output.update(updated)
    return report


def quotes_in_sources(output: dict[str, Any], ctx: CheckContext) -> CheckReport:
    report = CheckReport("quotes_in_sources")
    original = ctx.inputs.get("pages", ctx.inputs.get("sourceText", ctx.inputs))
    source = re.sub(r"\s+", "", re.sub(r"(?m)^L\d+:\s*", "", "\n".join(_strings(original))))

    def valid(item: Any, schema: dict[str, Any], path: str) -> bool:
        if isinstance(item, str) and schema.get("x-source-quote"):
            ok = re.sub(r"\s+", "", item) in source
            if not ok:
                report.changes.append(path)
            return ok
        if isinstance(item, dict):
            props = schema.get("properties", {})
            for branch in schema.get("anyOf", []) + schema.get("allOf", []):
                props = {**props, **branch.get("properties", {})}
            node = cast(dict[str, Any], item)
            for key, child in list(node.items()):
                child_schema = props.get(key, {})
                if not valid(child, child_schema, f"{path}.{key}"):
                    if any(
                        branch.get("type") == "null" for branch in child_schema.get("anyOf", [])
                    ):
                        node[key] = None
                    else:
                        return False
        if isinstance(item, list):
            values = cast(list[Any], item)
            before = len(values)
            values[:] = [
                child
                for i, child in enumerate(values)
                if valid(child, schema.get("items", {}), f"{path}[{i}]")
            ]
            report.failed |= bool(before) and not values
        return True

    root_valid = valid(output, ctx.schema, "$")
    report.failed = report.failed or not root_valid
    return report


def source_ids_exist(output: dict[str, Any], ctx: CheckContext) -> CheckReport:
    known: set[str | int] = set()

    def gather(value: Any) -> None:
        if isinstance(value, dict):
            node = cast(dict[str, Any], value)
            if isinstance(node.get("id"), (str, int)):
                known.add(node["id"])
            for child in node.values():
                gather(child)
        elif isinstance(value, list):
            for child in cast(list[Any], value):
                gather(child)

    gather(ctx.inputs)
    report = CheckReport("source_ids_exist")

    def visit(value: Any, path: str) -> bool:
        if isinstance(value, dict):
            node = cast(dict[str, Any], value)
            if "id" in node and node["id"] not in known:
                report.changes.append(path + ".id")
                return False
            if isinstance(node.get("sourceIds"), list):
                refs = node["sourceIds"]
                kept = [ref for ref in refs if ref in known]
                if len(kept) != len(refs):
                    report.changes.append(path + ".sourceIds")
                    report.failed |= bool(refs) and not kept
                node["sourceIds"] = kept
            for key, child in node.items():
                if key != "generatedBy" and not visit(child, f"{path}.{key}"):
                    return False
        elif isinstance(value, list):
            values = cast(list[Any], value)
            before = len(values)
            values[:] = [child for i, child in enumerate(values) if visit(child, f"{path}[{i}]")]
            report.failed |= bool(before) and not values
        return True

    valid = visit(output, "$")
    report.failed = report.failed or not valid
    return report


def pages_in_range(output: dict[str, Any], ctx: CheckContext) -> CheckReport:
    if ctx.total_pages is None or ctx.total_pages < 1:
        raise ValueError("pages_in_range 需要调用方提供真实 totalPages")
    report = CheckReport("pages_in_range")

    def visit(value: Any, path: str) -> None:
        if isinstance(value, dict):
            node = cast(dict[str, Any], value)
            for key, child in node.items():
                if key in {"pages", "pagesChecked", "visualPagesChecked"} and isinstance(
                    child, list
                ):
                    pages = cast(list[Any], child)
                    kept = [
                        page
                        for page in pages
                        if isinstance(page, int) and 1 <= page <= cast(int, ctx.total_pages)
                    ]
                    if kept != pages:
                        report.changes.append(path + ".pages")
                    node[key] = kept
                elif (
                    key == "pdfPage"
                    and child is not None
                    and (not isinstance(child, int) or not 1 <= child <= cast(int, ctx.total_pages))
                ):
                    report.changes.append(path + ".pdfPage")
                    report.failed = True
                    node[key] = None
                else:
                    visit(child, f"{path}.{key}")
        elif isinstance(value, list):
            for i, child in enumerate(cast(list[Any], value)):
                visit(child, f"{path}[{i}]")

    visit(output, "$")
    return report


class CheckRegistry:
    def __init__(self) -> None:
        self.checks: dict[str, Check] = {
            check.__name__: check
            for check in (
                numbers_in_sources,
                quotes_in_sources,
                source_ids_exist,
                no_advice,
                length_within,
                pages_in_range,
            )
        }

    def register(self, name: str, check: Check) -> None:
        if name in self.checks:
            raise ValueError("校验已注册")
        self.checks[name] = check

    def run(
        self, names: list[str], output: dict[str, Any], context: CheckContext
    ) -> tuple[dict[str, Any], list[CheckReport]]:
        result = copy.deepcopy(output)
        reports: list[CheckReport] = []
        for name in names:
            if name not in self.checks:
                raise ValueError(f"领域校验未注册：{name}")
            reports.append(self.checks[name](result, context))
        return result, reports
