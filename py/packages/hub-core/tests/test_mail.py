"""假 SMTP 验证 MIME、有限重试与失败通知。"""

import smtplib
from datetime import date
from email.message import EmailMessage

import pytest
from pydantic import SecretStr

from hub_core.mail import Mailer, MailError, SmtpConnection
from hub_core.settings import Settings


class FakeSmtp:
    def __init__(
        self, *, fail: bool = False, quit_fail: bool = False, refuse: bool = False
    ) -> None:
        self.fail = fail
        self.quit_fail = quit_fail
        self.refuse = refuse
        self.messages: list[EmailMessage] = []
        self.closed = False
        self.logged_in = False

    def login(self, user: str, password: str) -> object:
        assert user == "test-user"
        assert password == "仅测试密码"
        self.logged_in = True
        return None

    def send_message(self, msg: EmailMessage, /) -> dict[str, object]:
        self.messages.append(msg)
        if self.fail:
            raise smtplib.SMTPServerDisconnected("假断线")
        return {"test@example.test": (550, b"rejected")} if self.refuse else {}

    def quit(self) -> object:
        self.closed = True
        if self.quit_fail:
            raise smtplib.SMTPServerDisconnected("假关闭故障")
        return None


def settings() -> Settings:
    return Settings(
        email_from="from@example.test",
        email_to="to@example.test",
        email_smtp_host="fake.test",
        email_smtp_user="test-user",
        email_smtp_password=SecretStr("仅测试密码"),
    )


def test_mime_success_and_quit_failure() -> None:
    smtp = FakeSmtp(quit_fail=True)
    Mailer(settings(), connector=lambda _: smtp).send("中文标题", "纯文本", "<p>HTML</p>")
    assert smtp.logged_in
    assert smtp.closed
    message = smtp.messages[0]
    assert message["Subject"] == "中文标题"
    assert "Bowen Newsroom" in str(message["From"])
    assert message.get_content_type() == "multipart/alternative"
    text = message.get_body(preferencelist=("plain",))
    html = message.get_body(preferencelist=("html",))
    assert text is not None
    assert "纯文本" in str(text.get_content())
    assert html is not None
    assert "HTML" in str(html.get_content())


@pytest.mark.parametrize("refuse", [False, True])
def test_three_retries_then_failure(refuse: bool) -> None:
    attempts: list[FakeSmtp] = []
    pauses: list[float] = []

    def connector(_: Settings) -> SmtpConnection:
        smtp = FakeSmtp(fail=not refuse, refuse=refuse)
        attempts.append(smtp)
        return smtp

    mailer = Mailer(settings(), connector=connector, sleeper=pauses.append)
    with pytest.raises(MailError, match="重试 3 次"):
        mailer.send("标题", "文本", "<p>文本</p>")
    assert len(attempts) == 4
    assert pauses == [1, 2, 4]
    assert all(smtp.closed for smtp in attempts)


def test_retry_then_success() -> None:
    attempts: list[FakeSmtp] = []

    def connector(_: Settings) -> SmtpConnection:
        smtp = FakeSmtp(fail=len(attempts) < 2)
        attempts.append(smtp)
        return smtp

    Mailer(settings(), connector=connector, sleeper=lambda _: None).send(
        "标题", "正文", "<p>正文</p>"
    )
    assert len(attempts) == 3


def test_failure_notification() -> None:
    smtp = FakeSmtp()
    mailer = Mailer(settings(), connector=lambda _: smtp)
    assert mailer.notify_failure(
        "market-eod", date(2026, 9, 30), "错误 <样例>", "https://actions.fake.test/run"
    )
    assert smtp.messages[0]["Subject"] == "⚠️ [market-eod] 失败｜2026-09-30"
    html = smtp.messages[0].get_body(preferencelist=("html",))
    assert html is not None
    assert "&lt;样例&gt;" in str(html.get_content())
    failed = Mailer(settings(), connector=lambda _: FakeSmtp(fail=True), sleeper=lambda _: None)
    assert not failed.notify_failure("job", date(2026, 9, 30), "错误", "链接")


@pytest.mark.parametrize("port", [465, 587])
def test_tls_connection_setup(monkeypatch: pytest.MonkeyPatch, port: int) -> None:
    from hub_core.mail import connect_smtp

    calls: list[str] = []

    class TlsSmtp(FakeSmtp):
        def starttls(self, *, context: object) -> object:
            calls.append("starttls")
            return None

    smtp = TlsSmtp()

    def plain(host: str, selected_port: int, *, timeout: float) -> TlsSmtp:
        assert host == "fake.test"
        assert selected_port == port
        assert timeout == 30
        calls.append("plain")
        return smtp

    def secure(host: str, selected_port: int, *, timeout: float, context: object) -> TlsSmtp:
        assert host == "fake.test"
        assert selected_port == port
        assert timeout == 30
        calls.append("ssl")
        return smtp

    monkeypatch.setattr(smtplib, "SMTP", plain)
    monkeypatch.setattr(smtplib, "SMTP_SSL", secure)
    config = settings()
    config.email_smtp_port = port
    assert connect_smtp(config) is smtp
    assert calls == (["ssl"] if port == 465 else ["plain", "starttls"])
