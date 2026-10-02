"""已批准的部署配置保存在Secrets，空变量不能令工作流退回本机API。"""

from pathlib import Path

import pytest
import yaml

ROOT = Path(__file__).resolve().parents[5]


@pytest.mark.parametrize("name", ["data-export", "evals-weekly"])
def test_workflow_accepts_existing_secrets_and_frozen_generated_setup(name: str) -> None:
    workflow = yaml.load(
        (ROOT / f".github/workflows/{name}.yml").read_text(), Loader=yaml.BaseLoader
    )
    job = next(iter(workflow["jobs"].values()))
    assert workflow["concurrency"]["cancel-in-progress"] == "false"
    assert any("mise run setup && mise run gen" in step.get("run", "") for step in job["steps"])
    env = next(step["env"] for step in job["steps"] if "HUB_API_URL" in step.get("env", {}))
    for key in ("HUB_API_URL", "EMAIL_FROM", "EMAIL_TO", "EMAIL_SMTP_HOST", "EMAIL_SMTP_PORT"):
        assert f"secrets.{key}" in env[key]
        assert f"vars.{key}" in env[key]
    if name == "evals-weekly":
        assert "secrets.AI_GATEWAY_ID" in env["AI_GATEWAY_ID"]
