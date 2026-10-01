"""反馈草稿仅复用持久化证据；无法恢复的原始上下文标为待补齐。"""

from typing import Any, cast
from urllib.parse import quote, urlencode

from hub_contracts import Edition, Feedback, ItemFeedback
from hub_core.api import ApiClient


def harvest_feedback(api: ApiClient, *, since: str | None = None) -> list[dict[str, Any]]:
    path = "/v1/private/news/feedback" + ("?" + urlencode({"since": since}) if since else "")
    drafts: list[dict[str, Any]] = []
    for record in api.get_list(path, Feedback):
        item = record.root
        if not isinstance(item, ItemFeedback):
            continue
        edition = api.get(f"/v1/private/news/editions/{quote(item.editionId, safe='')}", Edition)
        evidence: dict[str, dict[str, Any]] = {}

        def gather(value: Any, target: dict[str, dict[str, Any]]) -> None:
            if isinstance(value, list):
                for child in cast(list[Any], value):
                    gather(child, target)
            elif isinstance(value, dict):
                node = cast(dict[str, Any], value)
                article = node.get("article")
                if isinstance(article, dict):
                    saved = cast(dict[str, Any], article)
                    if "id" in saved and "url" in saved:
                        target[saved["id"]] = saved
                for child in node.values():
                    gather(child, target)

        gather(edition.model_dump(mode="json"), evidence)
        for section in edition.sections:
            for entry in section.items:
                if entry.id != item.itemId:
                    continue
                output = entry.data.model_dump(mode="json")
                generated = output.get("generatedBy")
                ids: list[str] = list(output.get("sourceIds", []))
                for point in output.get("points", []):
                    ids.extend(point.get("sourceIds", []))
                if "article" in output:
                    ids.append(output["article"]["id"])
                ids = list(dict.fromkeys(ids))
                sources = [evidence[source_id] for source_id in ids if source_id in evidence]
                capability = generated.get("capability") if generated else None
                partial: dict[str, Any] = {}
                if capability == "news.ticker_digest":
                    partial = {
                        "symbol": output.get("symbol"),
                        "withSector": output.get("withSector"),
                        "mode": "weekly" if section.kind == "ticker_weekly" else "daily",
                        "articles": [
                            {
                                "id": source["id"],
                                "title": source["title"],
                                "summary": source["summary"],
                                "source": source["sourceId"],
                                "publishedAt": source["publishedAt"],
                            }
                            for source in sources
                        ],
                    }
                links = [source["url"] for source in sources if "url" in source]

                def source_links(value: Any, target: list[str]) -> None:
                    if isinstance(value, list):
                        for child in cast(list[Any], value):
                            source_links(child, target)
                    elif isinstance(value, dict):
                        for key, child in cast(dict[str, Any], value).items():
                            if key in {"url", "sourceUrl"} and isinstance(child, str):
                                target.append(child)
                            else:
                                source_links(child, target)

                source_links(output, links)
                drafts.append(
                    {
                        "id": item.id,
                        "capability": capability,
                        "input": None,
                        "output": output,
                        "sources": sources,
                        "partialInput": partial,
                        "unresolvedSourceIds": [
                            source_id for source_id in ids if source_id not in evidence
                        ],
                        "sourceIds": ids,
                        "sourceLinks": list(dict.fromkeys(links)),
                        "expect": {},
                        "tags": ["feedback"],
                        "unresolved": [
                            "原始事实包及人工期望需要补齐；当前接口无法按历史来源 id 完整读取文章，未找到不等于不存在"
                        ],
                    }
                )
    return drafts
