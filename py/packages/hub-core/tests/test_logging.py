"""HTTP 访问日志不会把带 key 的 URL 输出到默认日志。"""

import logging

from hub_core.logging import configure_logging


def test_http_access_logs_disabled() -> None:
    configure_logging()
    assert not logging.getLogger("httpx").isEnabledFor(logging.INFO)
    assert not logging.getLogger("httpcore").isEnabledFor(logging.DEBUG)
