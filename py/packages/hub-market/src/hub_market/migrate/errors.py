"""可安全展示的迁移诊断：只含类别、数量和记录 ID，不含原始正文、URL 或凭据。"""

from pydantic import ValidationError


class MigrationError(ValueError):
    pass


def locations(error: ValidationError, limit: int = 5) -> str:
    """只列出出错字段的位置和类型；输入值可能是老数据正文，不展示。"""
    rows = error.errors(include_input=False, include_url=False, include_context=False)
    shown = [".".join(str(part) for part in row["loc"]) + f"（{row['type']}）" for row in rows]
    more = f"；另有{len(shown) - limit}处" if len(shown) > limit else ""
    return "；".join(shown[:limit]) + more
