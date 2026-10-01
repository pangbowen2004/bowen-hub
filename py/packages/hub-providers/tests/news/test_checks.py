"""真实 CLI 入口、安全录制和缺配置状态。"""

import json
import os
import re
import subprocess
from datetime import date
from pathlib import Path

import httpx
import pytest
from pydantic import SecretStr

from hub_core.settings import Settings
from hub_providers.common.checks import check_sources
from hub_providers.common.recording import Recorder

ROOT = Path(__file__).resolve().parents[5]


@pytest.mark.parametrize(
    "command", [["providers", "check", "--help"], ["news", "sources", "--help"]]
)
@pytest.mark.parametrize("colored", [False, True])
def test_actual_cli_help(command: list[str], colored: bool) -> None:
    result = subprocess.run(
        [str(ROOT / "py/.venv/bin/hub"), *command],
        env={**os.environ, "FORCE_COLOR": "1" if colored else "0"},
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == 0
    # CI 强制Rich彩色帮助时，样式序列可插在选项字符串中间。
    plain = re.sub(r"\x1b\[[0-?]*[ -/]*[@-~]", "", result.stdout)
    assert "--date" in plain
    assert "--record" in plain


def test_recording_drops_headers_credentials_and_error_bodies(tmp_path: Path) -> None:
    recorder = Recorder(tmp_path)
    request = httpx.Request(
        "GET",
        "https://example.test/releases?api_key=DO_NOT_SAVE&start=2026-09-30",
        headers={"Authorization": "DO_NOT_SAVE"},
    )
    recorder.response(httpx.Response(200, text='{"news": []}', request=request))
    recorder.response(httpx.Response(401, text="DO_NOT_SAVE", request=request))
    raw = (tmp_path / "0001.json").read_text() + (tmp_path / "0002.json").read_text()
    assert "DO_NOT_SAVE" not in raw
    assert "api_key" not in raw
    assert "Authorization" not in raw
    data = json.loads((tmp_path / "0001.json").read_text())
    assert data["request"]["params"] == {"start": "2026-09-30"}
    assert json.loads((tmp_path / "0002.json").read_text())["response"]["text"] is None


def test_check_without_keys_continues_other_sources_no_api(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    for key in list(os.environ):
        if key.startswith(("ALPACA_", "TIINGO_", "FINNHUB_", "FRED_", "SEC_")):
            monkeypatch.delenv(key)
    (
        tmp_path / "news_sources.yaml"
    ).write_text("""defaults: {maxItems: 8, timeoutSec: 20, weight: 1}
sources:
  - {id: alpaca-news, name: 新闻, type: alpaca_news, section: us, lang: en, paywall: none, enabled: true}
  - {id: fred-calendar, name: 日程, type: fred, section: us, lang: en, paywall: none, enabled: true}
  - {id: example-rss, name: RSS, type: rss, section: us, lang: en, paywall: metered, enabled: true, url: 'https://example.test/rss'}
""")
    (tmp_path / "newsroom.yaml").write_text("snapshot: {indexEtfs: []}\n")
    (tmp_path / "us_watchlist.yaml").write_text("items: []\n")
    requests: list[httpx.Request] = []

    def replay(request: httpx.Request) -> httpx.Response:
        requests.append(request)
        return httpx.Response(200, text=(ROOT / "fixtures/http/news/rss-edge.xml").read_text())

    records = check_sources(
        Settings(),
        tmp_path,
        date(2026, 9, 30),
        client_factory=lambda: httpx.Client(transport=httpx.MockTransport(replay)),
    )
    assert [row.status for row in records] == ["failed", "failed", "ok"]
    assert len(requests) == 1
    assert requests[0].url.host == "example.test"
    assert "缺少 ALPACA" in (records[0].error or "")


def test_settings_never_reads_dotenv(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    monkeypatch.chdir(tmp_path)
    monkeypatch.delenv("FRED_API_KEY", raising=False)
    (tmp_path / ".env").write_text("FRED_API_KEY=DO_NOT_READ\n")
    assert Settings().fred_api_key is None
    assert "DO_NOT_READ" not in repr(Settings(fred_api_key=SecretStr("DO_NOT_READ")))


def test_recorded_transport_roundtrip_and_refuses_missing_coverage(tmp_path: Path) -> None:
    from hub_providers.common.replay import ReplayTransport

    recorder = Recorder(tmp_path)
    request = httpx.Request("GET", "https://example.test/news?start=2026-09-30&api_key=DO_NOT_SAVE")
    recorder.response(httpx.Response(200, json={"news": [{"id": 1}]}, request=request))
    client = httpx.Client(transport=ReplayTransport(tmp_path))
    assert client.get(
        "https://example.test/news", params={"start": "2026-09-30", "api_key": "DIFFERENT_KEY"}
    ).json() == {"news": [{"id": 1}]}
    with pytest.raises(httpx.ConnectError, match="覆盖范围"):
        client.get("https://example.test/news", params={"start": "2026-10-01"})
    with pytest.raises(httpx.ConnectError, match="覆盖范围"):
        client.get("https://example.test/news", params={"start": "2026-09-30"})


@pytest.mark.parametrize("command", [["providers", "check"], ["news", "sources", "--check"]])
@pytest.mark.parametrize(("status", "exit_code"), [("ok", 0), ("failed", 1)])
def test_actual_cli_execution_success_and_partial_failure(
    command: list[str], status: str, exit_code: int
) -> None:
    # 子进程使用真实安装的 entry point，只替换外部来源采集边界。
    program = """
import sys, socket
from datetime import UTC, datetime
from hub_contracts import NewsSourceHealth
from hub_providers import commands, tushare
from hub_cli.main import main
status = sys.argv[1]
def reject(*args, **kwargs):
    raise AssertionError('不得联网')
socket.socket.connect = reject
commands.check_sources = lambda *args, **kwargs: [
    NewsSourceHealth(id='alpaca-news', checkedAt=datetime.now(UTC), status='ok', error=None),
    NewsSourceHealth(id='finnhub-earnings', checkedAt=datetime.now(UTC), status=status, error='HTTP 429' if status == 'failed' else None),
]
tushare.check_sources = lambda settings: []
sys.argv = ['hub', *sys.argv[2:]]
main()
"""
    result = subprocess.run(
        [str(ROOT / "py/.venv/bin/python"), "-c", program, status, *command],
        cwd=ROOT,
        capture_output=True,
        text=True,
        timeout=15,
        check=False,
    )
    assert result.returncode == exit_code, result.stdout + result.stderr
    assert "alpaca-news: ok" in result.stdout
    assert f"finnhub-earnings: {status}" in result.stdout
    if status == "failed":
        assert "HTTP 429" in result.stdout
    assert "Traceback" not in result.stderr


def test_recorded_static_series_and_feed_category_are_strict(tmp_path: Path) -> None:
    from hub_providers.common.replay import ReplayTransport

    recorder = Recorder(tmp_path)
    for query in ["data=daily_treasury_yield_curve&field_tdr_date_value=2026", "category=Markets"]:
        request = httpx.Request("GET", "https://example.test/feed?" + query)
        recorder.response(httpx.Response(200, text="public", request=request))
    client = httpx.Client(transport=ReplayTransport(tmp_path))
    with pytest.raises(httpx.ConnectError):
        client.get("https://example.test/feed", params={"category": "Technology"})
    with pytest.raises(httpx.ConnectError):
        client.get(
            "https://example.test/feed",
            params={"data": "daily_treasury_bill_rates", "field_tdr_date_value": "2026"},
        )
    assert client.get("https://example.test/feed", params={"category": "Markets"}).text == "public"
    assert (
        client.get(
            "https://example.test/feed",
            params={"data": "daily_treasury_yield_curve", "field_tdr_date_value": "2026"},
        ).text
        == "public"
    )


def test_recorded_public_redirect_follows_offline_without_keys(tmp_path: Path) -> None:
    from hub_providers.common.replay import ReplayTransport

    recorder = Recorder(tmp_path)
    first = httpx.Request("GET", "https://example.test/old")
    location = "https://example.test/new?category=Markets&api_key=DO_NOT_SAVE#DO_NOT_SAVE"
    recorder.response(
        httpx.Response(
            302, headers={"location": location, "set-cookie": "DO_NOT_SAVE"}, request=first
        )
    )
    second = httpx.Request("GET", "https://example.test/new?category=Markets&api_key=DO_NOT_SAVE")
    recorder.response(httpx.Response(200, text="公开 RSS", request=second))
    raw = (tmp_path / "0001.json").read_text()
    assert "DO_NOT_SAVE" not in raw
    assert "set-cookie" not in raw
    assert json.loads(raw)["response"]["location"] == "https://example.test/new?category=Markets"
    client = httpx.Client(transport=ReplayTransport(tmp_path), follow_redirects=True)
    result = client.get("https://example.test/old")
    assert result.text == "公开 RSS"
    assert len(result.history) == 1
