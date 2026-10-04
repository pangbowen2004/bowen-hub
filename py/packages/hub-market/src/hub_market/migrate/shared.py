"""两条迁移共用的小工具：老数据模型的基类和统计文字。"""

from collections.abc import Mapping

from pydantic import BaseModel, ConfigDict


class LegacyModel(BaseModel):
    # 未登记的键直接失败；错误信息不带老数据正文。
    model_config = ConfigDict(extra="forbid", hide_input_in_errors=True)


def counts(values: Mapping[str, int]) -> str:
    return "、".join(f"{key} {count}" for key, count in sorted(values.items())) or "无"
