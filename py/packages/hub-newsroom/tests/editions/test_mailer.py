"""真实Mailer与发行编排组合，SMTP是显式内存替身。"""

import asyncio
from collections.abc import Mapping
from email.message import EmailMessage

from hub_contracts import WatchItem
from hub_core.calendar import NyseCalendar
from hub_core.mail import Mailer
from hub_core.settings import Settings as EnvironmentSettings
from hub_newsroom.common.settings import Settings
from hub_newsroom.editions.service import Options

from .test_publish import publisher


def test_real_mailer_three_retries_and_chinese_sender(
    settings: Settings, calendar: NyseCalendar, watchlist: list[WatchItem]
) -> None:
    service, store, _, _ = publisher("morning", settings, calendar, watchlist)
    messages: list[EmailMessage] = []
    delays: list[float] = []
    attempts: list[int] = []

    class Smtp:
        def login(self, user: str, password: str) -> object:
            return None

        def send_message(self, msg: EmailMessage, /) -> Mapping[str, object]:
            attempts.append(1)
            if len(attempts) < 4:
                raise OSError("假SMTP失败")
            assert "html" in store.events
            assert "sentAt" not in store.events
            messages.append(msg)
            return {}

        def quit(self) -> object:
            # DATA成功之后QUIT失败不能重复发信。
            raise OSError("假QUIT失败")

    environment = EnvironmentSettings.model_construct(
        email_from="from@example.test", email_to="to@example.test"
    )
    service.transport = Mailer(
        environment, from_name="美股新闻室", connector=lambda _: Smtp(), sleeper=delays.append
    )
    result = asyncio.run(service.publish(Options("morning")))
    assert result.sent
    assert len(attempts) == 4
    assert delays == [1, 2, 4]
    assert str(messages[0]["From"]) == "美股新闻室 <from@example.test>"
    assert messages[0].get_body(preferencelist=("plain",))
    assert messages[0].get_body(preferencelist=("html",))
    assert store.runs[-1].status == "succeeded"
