"""只读进程环境；不自动打开 .env，也不展示密钥。"""

from pathlib import Path
from typing import Literal

from pydantic import Field, SecretStr
from pydantic_settings import BaseSettings, SettingsConfigDict


class Settings(BaseSettings):
    model_config = SettingsConfigDict(
        env_file=None, case_sensitive=False, extra="ignore", hide_input_in_errors=True
    )
    hub_api_url: str = "http://localhost:8787"
    hub_service_token: SecretStr | None = Field(default=None, repr=False)
    hub_ai_backend: Literal["gateway", "subscription"] = "gateway"
    openai_api_key: SecretStr | None = Field(default=None, repr=False)
    cloudflare_account_id: str | None = None
    ai_gateway_id: str = "bowen-hub"
    cloudflare_api_token: SecretStr | None = Field(default=None, repr=False)
    hub_bootstrap_token: SecretStr | None = Field(default=None, repr=False)
    better_auth_secret: SecretStr | None = Field(default=None, repr=False)
    gh_automation_token: SecretStr | None = Field(default=None, repr=False)
    tushare_token: SecretStr | None = Field(default=None, repr=False)
    alpaca_api_key_id: SecretStr | None = Field(default=None, repr=False)
    alpaca_api_secret_key: SecretStr | None = Field(default=None, repr=False)
    tiingo_api_key: SecretStr | None = Field(default=None, repr=False)
    finnhub_api_key: SecretStr | None = Field(default=None, repr=False)
    fred_api_key: SecretStr | None = Field(default=None, repr=False)
    sec_user_agent: str | None = None
    email_from: str | None = None
    email_to: str | None = None
    email_smtp_host: str | None = None
    email_smtp_port: int = Field(default=465, ge=1, le=65535)
    email_smtp_user: str | None = None
    email_smtp_password: SecretStr | None = Field(default=None, repr=False)
    legacy_news_dir: Path | None = None
    legacy_market_dir: Path | None = None
    legacy_papers_dir: Path | None = None
    sites_live: bool = False
