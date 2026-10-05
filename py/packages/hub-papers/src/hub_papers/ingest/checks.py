"""配置读取只在适配层；领域校验不闭包捕获论文，只读取本次上下文。"""

from typing import Any

from hub_ai.checks import CheckContext, CheckRegistry, CheckReport
from hub_papers.ai import paper_draft_check as check
from hub_papers.pdf.config import load_rules


def paper_draft_check(output: dict[str, Any], context: CheckContext) -> CheckReport:
    return check(output, context, load_rules())


def register_checks(checks: CheckRegistry) -> None:
    checks.register("paper_draft", paper_draft_check)
