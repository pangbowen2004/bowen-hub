"""为命令验收建立临时仓库；不修改产品能力或共享样例。"""

import shutil
from pathlib import Path

import yaml

from hub_ai.registry import find_root


def prepare(destination: Path) -> Path:
    root = find_root()
    fixture = Path(__file__).parent / "fixtures"
    for folder in (
        "capabilities",
        "config",
        "prompts",
        "evals/fixture.summary",
        "contracts/generated",
    ):
        (destination / folder).mkdir(parents=True, exist_ok=True)
    shutil.copy(root / "capabilities/_schema.json", destination / "capabilities/_schema.json")
    shutil.copy(fixture / "capability.yaml", destination / "capabilities/fixture.summary.yaml")
    for name in ("cases.yaml", "responses.yaml"):
        shutil.copy(fixture / name, destination / "evals/fixture.summary" / name)
    shutil.copytree(
        root / "contracts/generated/schemas",
        destination / "contracts/generated/schemas",
        dirs_exist_ok=True,
    )
    (destination / "prompts/fixture_summary.md").write_text(
        "## system\n只按事实写摘要。\n## user\n{{ text }}\n"
    )
    (destination / "config/llm.yaml").write_text(
        yaml.safe_dump(
            {
                "tiers": {"fast": {"model": "fixture/model", "reasoning": "none"}},
                "prices": {"fixture/model": {"input": 1, "cachedInput": 0.1, "output": 2}},
                "defaults": {"maxRetries": 2},
                "candidates": [],
                "gateway": {"baseUrl": "https://invalid.example/"},
                "monthlyBudgetUsd": 20,
            }
        )
    )
    (destination / "config/newsroom.yaml").write_text("adviceWords: [建议买入]\n")
    return destination


if __name__ == "__main__":
    import sys

    prepare(Path(sys.argv[1]))
