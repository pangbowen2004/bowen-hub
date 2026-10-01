"""反馈草稿仅复用持久化证据；无法恢复的原始上下文标为待补齐。"""

from typing import Any
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
        evidence: list[dict[str, Any]] = []
        for section in edition.sections:
            for entry in section.items:
                if section.kind in {
                    "us_news",
                    "international_weekly",
                    "international",
                    "legacy_headlines",
                }:
                    evidence.append(entry.data.model_dump(mode="json"))
        for section in edition.sections:
            for entry in section.items:
                if entry.id != item.itemId:
                    continue
                output = entry.data.model_dump(mode="json")
                generated = output.get("generatedBy")
                sources = [
                    source for source in evidence if source.get("id") in output.get("sourceIds", [])
                ]
                drafts.append(
                    {
                        "id": item.id,
                        "capability": generated.get("capability") if generated else None,
                        "input": None,
                        "output": output,
                        "sources": sources,
                        "sourceIds": output.get("sourceIds", []),
                        "sourceLinks": [source["url"] for source in sources if "url" in source],
                        "expect": {},
                        "tags": ["feedback"],
                        "unresolved": [
                            "原始事实包及人工期望需要补齐；当前接口无法按历史来源 id 完整读取文章，未找到不等于不存在"
                        ],
                    }
                )
    return drafts
