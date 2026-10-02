"""离线真实生成契约与HTTP回放，不改旧目录或联网。"""

import json
from datetime import UTC, date, datetime, timedelta
from pathlib import Path

import httpx
import pytest
import typer
from pydantic import SecretStr
from typer.testing import CliRunner

from hub_contracts import Article, Edition, WatchItem
from hub_core.api import ApiClient
from hub_core.http import HttpClient
from hub_core.settings import Settings
from hub_newsroom.migrate import commands
from hub_newsroom.migrate.legacy import LegacyItem, LegacyRow, convert, published_at, read_archive
from hub_newsroom.migrate.transfer import seed_watchlist, verify_news, verify_watchlist, write_news


def row(day: str = "2026-09-30", title: str = "合成标题") -> LegacyRow:
    return LegacyRow(
        date=date.fromisoformat(day),
        mode="rules",
        overview="合成综述",
        timestamp=day + "T07:00:00",
        top_5=[
            LegacyItem(
                title=title,
                link="http://example.com/news/?utm_source=fake#anchor",
                source="合成来源",
                published="Wed, 30 Sep 2026 00:00:00 GMT",
                category="technology",
                topic="AI",
                llm_summary="原摘要",
                llm_why="原理由",
            )
        ],
    )


SOURCE: list[dict[str, object]] = [
    {"id": "fake", "name": "合成来源", "lang": "zh", "paywall": "metered"}
]


def watch(symbol: str = "FAKE") -> WatchItem:
    return WatchItem(
        symbol=symbol,
        name="合成公司",
        kind="stock",
        group="合成组",
        underlying=None,
        sectorEtf=None,
        aliases=[],
        active=True,
    )


class Store:
    def __init__(self) -> None:
        self.editions: dict[str, Edition] = {}
        self.articles: dict[str, Article] = {}
        self.watch: dict[str, WatchItem] = {}
        self.writes = 0
        self.article_batch_sizes: list[int] = []
        self.repeat_cursor = False

    def handle(self, request: httpx.Request) -> httpx.Response:
        assert request.headers["Authorization"] == "Bearer offline-token"
        path = request.url.path
        if request.method in {"PUT", "POST"}:
            self.writes += 1
            raw = json.loads(request.content)
            if path == "/v1/internal/news/articles/batch":
                self.article_batch_sizes.append(len(raw))
                for value in raw:
                    article = Article.model_validate(value)
                    self.articles[article.url] = article
            elif path.startswith("/v1/internal/news/editions/"):
                edition = Edition.model_validate(raw)
                self.editions[edition.id] = edition
            elif path == "/v1/internal/watchlist/batch":
                for value in raw:
                    item = WatchItem.model_validate(value)
                    self.watch[item.symbol] = item
            else:
                raise AssertionError("未登记写路径")
            return httpx.Response(204)
        assert request.method == "GET"
        if path == "/v1/news/editions":
            start = int(request.url.params.get("cursor", "0"))
            values = list(self.editions.values())
            chosen = values[start : start + 1]
            nxt = str(start + 1) if start + 1 < len(values) else None
            if self.repeat_cursor:
                nxt = "0"
            return httpx.Response(
                200,
                json={
                    "items": [
                        {
                            "id": e.id,
                            "kind": e.kind,
                            "date": e.date.isoformat(),
                            "generatedAt": None,
                        }
                        for e in chosen
                    ],
                    "nextCursor": nxt,
                },
            )
        if path.startswith("/v1/news/editions/"):
            return httpx.Response(
                200, json=self.editions[path.rsplit("/", 1)[1]].model_dump(mode="json")
            )
        if path == "/v1/news/articles/search":
            assert int(request.url.params["days"]) >= 1
            q = request.url.params["q"]
            return httpx.Response(
                200,
                json=[a.model_dump(mode="json") for a in self.articles.values() if a.title == q],
            )
        if path == "/v1/watchlist":
            return httpx.Response(
                200, json=[w.model_dump(mode="json") for w in self.watch.values()]
            )
        raise AssertionError("未登记读路径")


def client(store: Store) -> ApiClient:
    return ApiClient(
        Settings(hub_service_token=SecretStr("offline-token")),
        HttpClient(client=httpx.Client(transport=httpx.MockTransport(store.handle))),
    )


def test_fields_null_provenance_original_summary_and_canonical_url() -> None:
    plan = convert([row()], SOURCE)
    e = plan.editions[0]
    assert e.id == "legacy-2026-09-30"
    assert e.kind == "legacy"
    assert e.generatedAt is None
    assert e.lede is None
    assert e.aiUsage is None
    assert e.email is None
    data = e.model_dump(mode="json")["sections"][0]["items"][0]["data"]
    assert data["overview"] == "合成综述"
    assert data["generatedBy"] is None
    assert data["top5"][0]["id"] == "https://example.com/news"
    digest = data["top5"][0]["data"]
    assert digest["summary"] == "原摘要"
    assert digest["whyItMatters"] == "原理由"
    assert digest["generatedBy"] is None
    article = plan.articles[0]
    assert article.url == "https://example.com/news"
    assert article.sourceId == "fake"
    assert article.paywall == "metered"
    assert article.lang == "zh"
    assert article.topics == ["technology", "AI"]
    assert article.tickers == []
    assert plan.timestamps_without_zone == 1
    assert plan.modes == {"rules": 1}


def test_duplicate_url_keeps_each_edition_and_final_article() -> None:
    plan = convert([row(), row("2026-10-01", "后一期标题")], SOURCE)
    assert len(plan.editions) == 2
    assert plan.item_count == 2
    assert len(plan.articles) == 1
    assert plan.articles[0].title == "后一期标题"
    assert (
        plan.editions[0].model_dump(mode="json")["sections"][0]["items"][0]["data"]["top5"][0][
            "data"
        ]["article"]["title"]
        == "合成标题"
    )


def test_empty_top_list_does_not_invent_five_articles() -> None:
    value = row().model_copy(update={"top_5": []})
    plan = convert([value], SOURCE)
    assert len(plan.editions) == 1
    assert not plan.articles
    assert plan.item_count == 0


def test_unknown_source_not_guessed_and_null_summary_retained() -> None:
    value = row()
    value.top_5[0].llm_summary = None
    value.top_5[0].llm_why = None
    plan = convert([value], [])
    assert plan.unknown_sources == {"合成来源": 1}
    assert plan.articles[0].sourceId == "legacy"
    assert plan.articles[0].lang == "und"
    assert plan.articles[0].summary is None


def test_source_name_casefold_only_and_duplicate_date_rejected() -> None:
    assert convert([row()], [{**SOURCE[0], "name": " 合成来源"}]).articles[0].sourceId == "legacy"
    with pytest.raises(ValueError, match="重复"):
        convert([row(), row()], SOURCE)


@pytest.mark.parametrize("value", ["2026-09-30T00:00:00", "bad", "Wed, 30 Sep 2026 00:00:00"])
def test_invalid_or_unzoned_article_time_fails(value: str) -> None:
    with pytest.raises((ValueError, TypeError)):
        published_at(value)


def test_aware_article_time_preserves_instant() -> None:
    assert published_at("2026-09-30T08:00:00+08:00") == datetime(2026, 9, 30, tzinfo=UTC)


@pytest.mark.parametrize(
    "raw",
    ["bad", "null", "{}", json.dumps({**row().model_dump(mode="json"), "new_key": "unknown"})],
)
def test_invalid_row_reports_line_not_raw_body(tmp_path: Path, raw: str) -> None:
    path = tmp_path / "items.jsonl"
    path.write_text(raw, encoding="utf-8")
    with pytest.raises(ValueError, match="第1行"):
        read_archive(path)


def test_empty_source_fails(tmp_path: Path) -> None:
    path = tmp_path / "items.jsonl"
    path.write_text("\n", encoding="utf-8")
    with pytest.raises(ValueError, match="为空"):
        read_archive(path)


def test_api_write_repeated_and_verify_all_content_readonly() -> None:
    plan = convert([row(), row("2026-10-01", "新标题")], SOURCE)
    store = Store()
    api = client(store)
    write_news(api, plan)
    write_news(api, plan)
    writes = store.writes
    assert len(store.editions) == 2
    assert len(store.articles) == 1
    assert verify_news(api, plan) == []
    assert store.writes == writes
    store.editions[plan.editions[0].id] = plan.editions[0].model_copy(update={"sections": []})
    assert any("内容不一致" in item for item in verify_news(api, plan))
    del store.articles[plan.articles[0].url]
    assert any("文章内容不一致" in item for item in verify_news(api, plan))


def test_verify_missing_extra_dates_and_cursor_loop() -> None:
    plan = convert([row()], SOURCE)
    store = Store()
    store.editions = {"legacy-2026-10-01": convert([row("2026-10-01")], SOURCE).editions[0]}
    differences = verify_news(client(store), plan)
    assert any("缺期次" in item for item in differences)
    assert any("多余期次" in item for item in differences)
    store.repeat_cursor = True
    with pytest.raises(ValueError, match="重复分页"):
        verify_news(client(store), plan)


def test_watchlist_empty_only_and_verify_preserves_user_changes() -> None:
    store = Store()
    api = client(store)
    initial = [watch()]
    assert seed_watchlist(api, initial)
    assert verify_watchlist(api, initial) == []
    store.watch["FAKE"] = watch().model_copy(update={"name": "用户名称", "active": False})
    count = store.writes
    assert not seed_watchlist(api, initial)
    assert store.writes == count
    assert store.watch["FAKE"].name == "用户名称"
    assert not store.watch["FAKE"].active
    assert verify_watchlist(api, initial) == ["自选股内容不一致：FAKE"]


def app() -> typer.Typer:
    value = typer.Typer()
    group = typer.Typer()
    value.add_typer(group, name="migrate")
    commands.register({"migrate": group})
    return value


def test_cli_dry_runs_no_network(tmp_path: Path, monkeypatch: pytest.MonkeyPatch) -> None:
    (tmp_path / "archive").mkdir()
    (tmp_path / "archive/items.jsonl").write_text(
        json.dumps(row().model_dump(mode="json")), encoding="utf-8"
    )
    monkeypatch.setenv("LEGACY_NEWS_DIR", str(tmp_path))

    def forbidden() -> HttpClient:
        raise AssertionError("dry-run不能发API请求")

    monkeypatch.setattr(commands, "HttpClient", forbidden)
    runner = CliRunner()
    for name in ["news-legacy", "watchlist"]:
        result = runner.invoke(app(), ["migrate", name, "--dry-run"])
        assert result.exit_code == 0, result.output
        assert "试运行通过" in result.output
        both = runner.invoke(app(), ["migrate", name, "--dry-run", "--verify"])
        assert both.exit_code == 1


def test_cli_verify_failure_exit_no_secret_or_write(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    store = Store()
    http = HttpClient(client=httpx.Client(transport=httpx.MockTransport(store.handle)))
    monkeypatch.setenv("HUB_SERVICE_TOKEN", "offline-token")
    monkeypatch.setattr(commands, "HttpClient", lambda: http)
    result = CliRunner().invoke(app(), ["migrate", "watchlist", "--verify"])
    assert result.exit_code == 1
    assert "核对差异" in result.output
    assert store.writes == 0
    assert "offline-token" not in result.output


def test_read_watchlist_defaults_verify_flags_and_duplicates(tmp_path: Path) -> None:
    path = tmp_path / "watch.yaml"
    path.write_text(
        "items:\n  - {symbol: FAKE, name: 合成, kind: etf, group: 测试, verify: true}\n",
        encoding="utf-8",
    )
    items, pending = commands.read_watchlist(path)
    assert items[0].active
    assert items[0].aliases == []
    assert items[0].underlying is None
    assert pending == ["FAKE"]
    path.write_text(
        path.read_text() + "  - {symbol: FAKE, name: 合成, kind: etf, group: 测试}\n",
        encoding="utf-8",
    )
    with pytest.raises(ValueError, match="重复"):
        commands.read_watchlist(path)


def test_legacy_chinese_source_whitespace_offset_preserves_time() -> None:
    assert published_at("2026-06-10 14:11:37  +0800") == datetime(
        2026, 6, 10, 6, 11, 37, tzinfo=UTC
    )


def test_cli_news_write_twice_then_readonly_verify_and_content_failure(
    tmp_path: Path, monkeypatch: pytest.MonkeyPatch
) -> None:
    (tmp_path / "archive").mkdir()
    (tmp_path / "archive/items.jsonl").write_text(
        json.dumps(row().model_dump(mode="json")), encoding="utf-8"
    )
    monkeypatch.setenv("LEGACY_NEWS_DIR", str(tmp_path))
    monkeypatch.setenv("HUB_SERVICE_TOKEN", "offline-token")
    store = Store()
    http = HttpClient(client=httpx.Client(transport=httpx.MockTransport(store.handle)))
    monkeypatch.setattr(commands, "HttpClient", lambda: http)
    runner = CliRunner()
    for _ in range(2):
        result = runner.invoke(app(), ["migrate", "news-legacy"])
        assert result.exit_code == 0, result.output
        assert "API导入完成" in result.output
    writes = store.writes
    verified = runner.invoke(app(), ["migrate", "news-legacy", "--verify"])
    assert verified.exit_code == 0, verified.output
    assert "核对差异：0项" in verified.output
    assert store.writes == writes
    assert len(store.editions) == 1
    key = next(iter(store.editions))
    store.editions[key] = store.editions[key].model_copy(update={"sections": []})
    failed = runner.invoke(app(), ["migrate", "news-legacy", "--verify"])
    assert failed.exit_code == 1
    assert "期次内容不一致" in failed.output
    assert store.writes == writes


def test_cli_watchlist_initialize_and_never_overwrite_existing(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    store = Store()
    http = HttpClient(client=httpx.Client(transport=httpx.MockTransport(store.handle)))
    monkeypatch.setenv("HUB_SERVICE_TOKEN", "offline-token")
    monkeypatch.setattr(commands, "HttpClient", lambda: http)
    runner = CliRunner()
    result = runner.invoke(app(), ["migrate", "watchlist"])
    assert result.exit_code == 0, result.output
    assert len(store.watch) == 30
    writes = store.writes
    store.watch["TSM"] = store.watch["TSM"].model_copy(update={"name": "用户改名"})
    result = runner.invoke(app(), ["migrate", "watchlist"])
    assert result.exit_code == 0
    assert "表非空，已跳过" in result.output
    assert store.writes == writes
    assert store.watch["TSM"].name == "用户改名"


def test_cli_transport_failure_does_not_print_upstream_secret(
    monkeypatch: pytest.MonkeyPatch,
) -> None:
    def fail() -> HttpClient:
        raise RuntimeError("upstream-sensitive-do-not-print")

    monkeypatch.setattr(commands, "HttpClient", fail)
    result = CliRunner().invoke(app(), ["migrate", "watchlist", "--verify"])
    assert result.exit_code == 1
    assert "RuntimeError" in result.output
    assert "upstream-sensitive-do-not-print" not in result.output


def test_article_batches_keep_all_records_below_d1_query_limit() -> None:
    values: list[LegacyRow] = []
    for index in range(81):
        value = row((date(2026, 7, 1) + timedelta(days=index)).isoformat(), f"合成标题{index}")
        value.top_5[0].link = f"https://example.com/news/{index}"
        values.append(value)
    plan = convert(values, SOURCE)
    store = Store()
    write_news(client(store), plan)
    assert store.article_batch_sizes == [40, 40, 1]
    assert len(store.articles) == 81
    assert len(store.editions) == 81
