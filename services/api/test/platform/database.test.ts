import { env } from "cloudflare:workers";
import { getTableName, is } from "drizzle-orm";
import { SQLiteTable } from "drizzle-orm/sqlite-core";
import { describe, expect, it } from "vitest";
import * as schema from "../../src/db/schema";

const business = [
  "news_sources",
  "articles",
  "filings",
  "insider_trades",
  "calendar_events",
  "earnings_cards",
  "editions",
  "edition_feedback",
  "watch_items",
  "market_days",
  "market_hypotheses",
  "market_weeklies",
  "market_events",
  "index_history",
  "papers",
  "paper_private",
  "paper_reviews",
  "paper_uploads",
  "documents",
  "runs",
  "ai_calls",
  "eval_results",
];
const auth = [
  "user",
  "session",
  "account",
  "verification",
  "passkey",
  "jwks",
  "oauth_client",
  "oauth_resource",
  "oauth_client_resource",
  "oauth_refresh_token",
  "oauth_access_token",
  "oauth_consent",
  "oauth_client_assertion",
];
it("迁移实际建表与docs09和官方auth schema一致，FTS5可用", async () => {
  const rows = await env.DB.prepare(
    "SELECT name FROM sqlite_master WHERE type='table' AND name NOT LIKE 'sqlite_%' AND name NOT IN ('d1_migrations','_cf_METADATA') AND name NOT LIKE '%_fts_%'",
  ).all<{ name: string }>();
  expect(rows.results.map((r) => r.name).sort()).toEqual(
    [...business, ...auth, "articles_fts", "papers_fts"].sort(),
  );
  expect(
    Object.values(schema)
      .filter((x) => is(x, SQLiteTable))
      .map((x) => getTableName(x))
      .sort(),
  ).toEqual([...business, ...auth].sort());
  const fts = await env.DB.prepare(
    "SELECT sql FROM sqlite_master WHERE name IN ('articles_fts','papers_fts')",
  ).all<{ sql: string }>();
  expect(fts.results.every((x) => x.sql.includes("fts5"))).toBe(true);
});

describe("自然键与全文索引", () => {
  it("文章dedupe_key、filing accession与交易行自然键拒绝重复", async () => {
    await env.DB.prepare(
      "INSERT INTO articles(id,dedupe_key,source_id,kind,title,url,published_at,tickers,topics,payload) VALUES(?,?,?,?,?,?,?,?,?,?)",
    )
      .bind(
        "a1",
        "same",
        "source",
        "news",
        "initial",
        "https://example.test",
        "2026-10-01T00:00:00Z",
        "[]",
        "[]",
        "{}",
      )
      .run();
    await expect(
      env.DB.prepare(
        "INSERT INTO articles(id,dedupe_key,source_id,kind,title,url,published_at,tickers,topics,payload) VALUES(?,?,?,?,?,?,?,?,?,?)",
      )
        .bind(
          "a2",
          "same",
          "source",
          "news",
          "other",
          "https://example.test",
          "2026-10-01T00:00:00Z",
          "[]",
          "[]",
          "{}",
        )
        .run(),
    ).rejects.toThrow();
    await env.DB.prepare(
      "INSERT INTO filings(accession,ticker,filed_at,payload) VALUES('acc','A','now','{}')",
    ).run();
    await expect(
      env.DB.prepare(
        "INSERT INTO filings(accession,ticker,filed_at,payload) VALUES('acc','B','now','{}')",
      ).run(),
    ).rejects.toThrow();
    await env.DB.prepare(
      "INSERT INTO insider_trades(accession,transaction_index,ticker,filed_at,payload) VALUES('trade',0,'A','now','{}')",
    ).run();
    await env.DB.prepare(
      "INSERT INTO insider_trades(accession,transaction_index,ticker,filed_at,payload) VALUES('trade',1,'A','now','{}')",
    ).run();
    await expect(
      env.DB.prepare(
        "INSERT INTO insider_trades(accession,transaction_index,ticker,filed_at,payload) VALUES('trade',0,'A','now','{}')",
      ).run(),
    ).rejects.toThrow();
  });
  it("日历和财报的自然键按来源区分，period不是财报主键", async () => {
    for (const [kind, key] of [
      ["macro", "1"],
      ["macro", "2"],
      ["earnings", "A"],
      ["earnings", "B"],
      ["fomc", ""],
    ])
      await env.DB.prepare(
        "INSERT INTO calendar_events(kind,date,source_key,payload) VALUES(?,?,?,'{}')",
      )
        .bind(kind, "2026-10-01", key)
        .run();
    await expect(
      env.DB.prepare(
        "INSERT INTO calendar_events(kind,date,source_key,payload) VALUES('fomc','2026-10-01','','{}')",
      ).run(),
    ).rejects.toThrow();
    for (const key of ["accession-1", "https://example.test/news"])
      await env.DB.prepare(
        "INSERT INTO earnings_cards(symbol,source_key,period,published_at,payload) VALUES('A',?,'Q1','now','{}')",
      )
        .bind(key)
        .run();
    await expect(
      env.DB.prepare(
        "INSERT INTO earnings_cards(symbol,source_key,period,published_at,payload) VALUES('A','accession-1','Q2','later','{}')",
      ).run(),
    ).rejects.toThrow();
  });
  it("FTS触发器随插入/更新/删除同步，论文概念参与搜索", async () => {
    await env.DB.prepare(
      "INSERT INTO articles(id,dedupe_key,source_id,kind,title,url,published_at,tickers,topics,payload) VALUES('search','search','x','news','alpha','https://example.test','now','[]','[]','{}')",
    ).run();
    const search = () =>
      env.DB.prepare(
        "SELECT count(*) AS n FROM articles_fts WHERE articles_fts MATCH 'alpha'",
      ).first<{ n: number }>();
    expect((await search())?.n).toBe(1);
    await env.DB.prepare("UPDATE articles SET title='beta' WHERE id='search'").run();
    expect((await search())?.n).toBe(0);
    await env.DB.prepare("DELETE FROM articles WHERE id='search'").run();
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) AS n FROM articles_fts WHERE articles_fts MATCH 'beta'",
        ).first<{ n: number }>()
      )?.n,
    ).toBe(0);
    const doc = JSON.stringify({
      meta: { title: "paper" },
      guide: { oneSentence: "sentence" },
      structure: { concepts: [{ name: "capm" }] },
    });
    await env.DB.prepare(
      "INSERT INTO papers(id,visibility,review,reading_depth,spaces,updated_at,summary,doc) VALUES('fts','private','draft','R0','[]','2026-10-01','{}',?)",
    )
      .bind(doc)
      .run();
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) AS n FROM papers_fts WHERE papers_fts MATCH 'capm'",
        ).first<{ n: number }>()
      )?.n,
    ).toBe(1);
    await env.DB.prepare("DELETE FROM papers WHERE id='fts'").run();
    expect(
      (
        await env.DB.prepare(
          "SELECT count(*) AS n FROM papers_fts WHERE papers_fts MATCH 'capm'",
        ).first<{ n: number }>()
      )?.n,
    ).toBe(0);
  });
});
