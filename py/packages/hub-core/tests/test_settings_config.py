"""环境与 YAML 仅读取测试创建的临时文件。"""

from pathlib import Path

import pytest
from pydantic import ValidationError
from yaml import YAMLError

from hub_core.config import load_config, load_configs
from hub_core.settings import Settings


def test_environment(monkeypatch: pytest.MonkeyPatch, tmp_path: Path) -> None:
    monkeypatch.setenv("HUB_API_URL", "https://api.fake.test")
    monkeypatch.setenv("HUB_SERVICE_TOKEN", "仅测试的凭证")
    monkeypatch.setenv("EMAIL_SMTP_PORT", "587")
    monkeypatch.setenv("SITES_LIVE", "false")
    monkeypatch.chdir(tmp_path)
    (tmp_path / ".env").write_text("EMAIL_SMTP_HOST=不应读取\n")
    settings = Settings()
    assert settings.hub_api_url == "https://api.fake.test"
    assert settings.email_smtp_port == 587
    assert settings.hub_service_token is not None
    assert settings.hub_service_token.get_secret_value() == "仅测试的凭证"
    assert "仅测试的凭证" not in repr(settings)
    assert "仅测试的凭证" not in settings.model_dump_json()
    assert settings.email_smtp_host is None
    assert not settings.sites_live


def test_invalid_environment_hides_input(monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.setenv("EMAIL_SMTP_PORT", "私密错误值")
    with pytest.raises(ValidationError) as error:
        Settings()
    assert "私密错误值" not in str(error.value)


@pytest.mark.parametrize(
    "content", ["[]", "null", "3: 数字键", "!!python/object/apply:os.system [echo]"]
)
def test_config_rejects_bad_root(tmp_path: Path, content: str) -> None:
    path = tmp_path / "bad.yaml"
    path.write_text(content)
    with pytest.raises((ValueError, YAMLError)):
        load_config(path)


def test_config_directory(tmp_path: Path) -> None:
    (tmp_path / "one.yaml").write_text("name: 中文\nenabled: true\nitems: [1, 2]\n")
    (tmp_path / "ignore.txt").write_text("忽略")
    assert load_configs(tmp_path) == {"one": {"name": "中文", "enabled": True, "items": [1, 2]}}
