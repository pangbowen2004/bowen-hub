"""新闻室确定性计算平面；版次调度、持久化与发信由 T13 接入。"""

from hub_newsroom.pipeline.articles import (
    ArticleCluster,
    associate_tickers,
    canonical_symbol,
    cluster_articles,
    international_score,
    normalise_article,
    normalise_url,
    rule_score,
    rule_topic,
)
from hub_newsroom.pipeline.budget import BudgetResult, trim_edition, trim_to_budget
from hub_newsroom.pipeline.editions import PipelineInput, PipelineResult, build_edition, lede_facts
from hub_newsroom.pipeline.facts import (
    EarningsRelease,
    earnings_facts,
    insider_text,
    select_insiders,
)
from hub_newsroom.pipeline.quotes import close_snapshot, sector_sync
from hub_newsroom.pipeline.windows import edition_window, prepare_calendar

__all__ = [
    "ArticleCluster",
    "BudgetResult",
    "EarningsRelease",
    "PipelineInput",
    "PipelineResult",
    "associate_tickers",
    "build_edition",
    "canonical_symbol",
    "close_snapshot",
    "cluster_articles",
    "earnings_facts",
    "edition_window",
    "insider_text",
    "international_score",
    "lede_facts",
    "normalise_article",
    "normalise_url",
    "prepare_calendar",
    "rule_score",
    "rule_topic",
    "sector_sync",
    "select_insiders",
    "trim_edition",
    "trim_to_budget",
]
