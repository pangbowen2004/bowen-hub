"""按真实正文字符数删除低分整条；正文渲染器由 T13 注入。"""

from collections.abc import Callable
from dataclasses import dataclass

from hub_contracts import Edition, NewsInternationalSection
from hub_newsroom.common.settings import Settings


@dataclass(frozen=True)
class BudgetResult:
    edition: Edition
    body_chars: int
    removed_ids: tuple[str, ...]


def trim_to_budget(
    edition: Edition, budget: int, render_body: Callable[[Edition], str]
) -> BudgetResult:
    """render_body 必须返回不含URL和页脚的邮件纯文本正文，不用JSON长度代替。"""
    if budget < 0:
        raise ValueError("阅读预算不能为负")
    current = edition.model_copy(deep=True)
    removed: list[str] = []
    while len(render_body(current)) > budget:
        # 每个候选路径指向一条完整内容，国际栏目内部也按文章逐条删除。
        candidates: list[tuple[float, int, int, str, int, str]] = []
        for section_index, section in enumerate(current.sections):
            for item_index, item in enumerate(section.items):
                if isinstance(section, NewsInternationalSection):
                    for group in ("top5", "briefs"):
                        for nested_index, nested in enumerate(
                            section.items[item_index].data.top5
                            if group == "top5"
                            else section.items[item_index].data.briefs
                        ):
                            candidates.append(
                                (
                                    nested.ruleScore or 0,
                                    section_index,
                                    item_index,
                                    group,
                                    nested_index,
                                    nested.id,
                                )
                            )
                else:
                    candidates.append(
                        (item.ruleScore or 0, section_index, item_index, "", -1, item.id)
                    )
        if not candidates:
            raise ValueError("导语等非条目正文已超过预算；不能偷偷截短或宣称预算通过")
        # 相同分数按版面位置稳定删；未评分条目按0处理，不编造来源分。
        _, section_index, item_index, group, nested_index, item_id = min(candidates)
        section = current.sections[section_index]
        if isinstance(section, NewsInternationalSection):
            data = section.items[item_index].data
            items = data.top5 if group == "top5" else data.briefs
            items.pop(nested_index)
            if not data.top5 and not data.briefs:
                section.items.pop(item_index)
        else:
            section.items.pop(item_index)
        if not section.items:
            current.sections.pop(section_index)
        removed.append(item_id)
    return BudgetResult(current, len(render_body(current)), tuple(removed))


def trim_edition(
    edition: Edition, settings: Settings, render_body: Callable[[Edition], str]
) -> BudgetResult:
    """AI加工后按版次配置裁剪，避免调用方另写一个字数阈值。"""
    if edition.kind not in settings.newsroom.editions:
        raise ValueError("版次没有配置的阅读预算")
    return trim_to_budget(
        edition, settings.newsroom.editions[edition.kind].readingBudgetChars, render_body
    )
