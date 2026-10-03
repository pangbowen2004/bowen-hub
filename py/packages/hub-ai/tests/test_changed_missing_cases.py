"""真实临时 Git 仓库验证 changed 不能把已交付用例缺失当作占位跳过。"""

import subprocess
from pathlib import Path

import pytest
from typer.testing import CliRunner

from hub_cli.main import create_app

from .prepare_fixture import prepare


def git(root: Path, *args: str) -> str:
    return subprocess.run(
        ["git", *args], cwd=root, capture_output=True, text=True, check=True
    ).stdout.strip()


def repository(root: Path, *, registered: bool) -> Path:
    prepare(root)
    if not registered:
        (root / "evals/fixture.summary/cases.yaml").unlink()
    git(root, "init", "-b", "main")
    git(root, "config", "user.name", "Offline test")
    git(root, "config", "user.email", "offline@example.invalid")
    git(root, "add", ".")
    git(root, "commit", "-m", "Initial fixture")
    git(root, "update-ref", "refs/remotes/origin/main", "HEAD")
    return root


def run(root: Path) -> tuple[int, str]:
    result = CliRunner().invoke(
        create_app(), ["evals", "run", "--changed", "--offline", "--root", str(root)], color=False
    )
    return result.exit_code, result.output


def change_prompt(root: Path) -> None:
    path = root / "prompts/fixture_summary.md"
    path.write_text(path.read_text() + "\n离线变更\n")


@pytest.mark.parametrize("deletion", ["working", "staged", "committed"])
def test_registered_case_deletion_is_failure(tmp_path: Path, deletion: str) -> None:
    root = repository(tmp_path / "repo", registered=True)
    path = "evals/fixture.summary/cases.yaml"
    (root / path).unlink()
    if deletion != "working":
        git(root, "add", path)
    if deletion == "committed":
        git(root, "commit", "-m", "Remove case")
        git(root, "update-ref", "refs/remotes/origin/main", "HEAD")
        change_prompt(root)
    code, output = run(root)
    assert code == 1
    assert "缺少 cases.yaml" in output
    assert "未注册用例" not in output


def test_never_registered_placeholder_is_explicit_skip(tmp_path: Path) -> None:
    root = repository(tmp_path / "repo", registered=False)
    change_prompt(root)
    code, output = run(root)
    assert code == 0
    assert "跳过 fixture.summary：未注册用例，没有生成评测结果。" in output
    assert "没有运行产品评测" in output
    assert "PASS" not in output


def test_baseline_registered_cases_still_fail_on_older_branch(tmp_path: Path) -> None:
    root = repository(tmp_path / "repo", registered=False)
    earlier = git(root, "rev-parse", "HEAD")
    # main 基线随后登记，而当前较旧分支从未登记：不能只检查当前历史。
    (root / "evals/fixture.summary/cases.yaml").write_text("[]\n")
    git(root, "add", ".")
    git(root, "commit", "-m", "Register case")
    git(root, "update-ref", "refs/remotes/origin/main", "HEAD")
    git(root, "checkout", "--detach", earlier)
    change_prompt(root)
    code, output = run(root)
    assert code == 1
    assert "缺少 cases.yaml" in output


def test_unmerged_other_branch_does_not_register_this_line(tmp_path: Path) -> None:
    root = repository(tmp_path / "repo", registered=False)
    git(root, "checkout", "-b", "other-unmerged")
    (root / "evals/fixture.summary/cases.yaml").write_text("[]\n")
    git(root, "add", ".")
    git(root, "commit", "-m", "Other branch only")
    git(root, "checkout", "main")
    change_prompt(root)
    code, output = run(root)
    assert code == 0
    assert "未注册用例" in output


def test_unprovable_history_cannot_skip(tmp_path: Path) -> None:
    root = repository(tmp_path / "repo", registered=False)
    change_prompt(root)
    git(root, "update-ref", "-d", "refs/remotes/origin/main")
    code, output = run(root)
    assert code == 1
    assert "未注册用例" not in output
    assert "PASS" not in output
