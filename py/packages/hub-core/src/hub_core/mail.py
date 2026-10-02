"""HTML 与纯文本一起发；第一次失败后最多重试三次。"""

import logging
import smtplib
import ssl
from collections.abc import Callable, Mapping
from datetime import date
from email.message import EmailMessage
from email.utils import formataddr
from html import escape
from time import sleep
from typing import Protocol

from hub_core.settings import Settings

logger = logging.getLogger(__name__)


class SmtpConnection(Protocol):
    def login(self, user: str, password: str) -> object: ...
    def send_message(self, msg: EmailMessage, /) -> Mapping[str, object]: ...
    def quit(self) -> object: ...


class MailError(RuntimeError):
    pass


def connect_smtp(settings: Settings) -> SmtpConnection:
    if settings.email_smtp_host is None:
        raise ValueError("缺少 EMAIL_SMTP_HOST")
    context = ssl.create_default_context()
    if settings.email_smtp_port == 465:
        return smtplib.SMTP_SSL(
            settings.email_smtp_host, settings.email_smtp_port, timeout=30, context=context
        )
    connection = smtplib.SMTP(settings.email_smtp_host, settings.email_smtp_port, timeout=30)
    try:
        connection.starttls(context=context)
    except Exception:
        connection.close()
        raise
    return connection


class Mailer:
    def __init__(
        self,
        settings: Settings,
        *,
        from_name: str = "美股新闻室",
        connector: Callable[[Settings], SmtpConnection] = connect_smtp,
        sleeper: Callable[[float], None] = sleep,
    ) -> None:
        self.settings = settings
        self.from_name = from_name
        self.connector = connector
        self.sleeper = sleeper

    def send(self, subject: str, text: str, html: str) -> None:
        settings = self.settings
        if not settings.email_from or not settings.email_to:
            raise ValueError("缺少 EMAIL_FROM 或 EMAIL_TO")
        message = EmailMessage()
        message["Subject"] = subject
        message["From"] = formataddr((self.from_name, settings.email_from))
        message["To"] = settings.email_to
        message.set_content(text)
        message.add_alternative(html, subtype="html")
        for attempt in range(4):
            connection: SmtpConnection | None = None
            try:
                connection = self.connector(settings)
                if settings.email_smtp_user:
                    if settings.email_smtp_password is None:
                        raise ValueError("缺少 EMAIL_SMTP_PASSWORD")
                    connection.login(
                        settings.email_smtp_user, settings.email_smtp_password.get_secret_value()
                    )
                refused = connection.send_message(message)
                if refused:
                    raise MailError("收件人被拒绝")
            except OSError, smtplib.SMTPException, MailError:
                logger.warning("邮件发送失败（第 %d/4 次）", attempt + 1)
                if attempt == 3:
                    raise MailError("邮件发送失败，已重试 3 次") from None
                self.sleeper(2**attempt)
            else:
                return
            finally:
                if connection is not None:
                    try:
                        connection.quit()
                    except OSError, smtplib.SMTPException:
                        # DATA 已成功送达时，QUIT 失败不应触发重复发信。
                        logger.warning("SMTP 连接关闭失败")

    def notify_failure(self, job: str, business_date: date, summary: str, actions_url: str) -> bool:
        subject = f"⚠️ [{job}] 失败｜{business_date}"
        text = f"错误摘要：{summary}\nActions 运行：{actions_url}"
        try:
            self.send(
                subject,
                text,
                f"<p>错误摘要：{escape(summary)}</p><p>Actions 运行：{escape(actions_url)}</p>",
            )
        except MailError, ValueError:
            logger.error("失败通知邮件未送达")
            return False
        return True
