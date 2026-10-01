"""bowen-hub 契约的 Pydantic v2 模型（由 contracts/ 生成，见 contracts/README.md）。

用法：``from hub_contracts import Run, WatchItem``。模型在 ``hub_contracts.generated``，
只能由 ``mise run gen`` 改动；字段名与 JSON 一致（camelCase，没有别名），
写 API 时用 ``model.model_dump(mode="json")``。
"""

from hub_contracts.generated import *  # noqa: F403
from hub_contracts.generated import __all__ as __all__
