import { env } from "cloudflare:workers";
import * as schemas from "@bowen-hub/contracts/zod";
import { beforeEach, describe, expect, it } from "vitest";
import { app } from "../../src/app";
import { authenticatedCookie } from "../auth/fixture";

const get = (table: string, query = "", authorization = "Bearer test-service-token") =>
  app.request(
    `http://localhost/v1/internal/export/${table}${query}`,
    { headers: { Authorization: authorization } },
    env,
  );
beforeEach(async () => {
  await env.DB.batch(
    ["documents", "insider_trades", "calendar_events", "ai_calls"].map((table) =>
      env.DB.prepare(`DELETE FROM ${table}`),
    ),
  );
});
describe("服务令牌完整业务数据导出", () => {
  it("22张契约业务表可读；鉴权表/FTS/SQL标识符不可导出", async () => {
    for (const table of schemas.ExportTable.options) {
      const response = await get(table);
      expect(response.status).toBe(200);
      expect(schemas.ExportPage.parse(await response.json()).table).toBe(table);
    }
    for (const table of [
      "user",
      "session",
      "oauth_access_token",
      "papers_fts",
      "sqlite_master",
      "documents%22%3BDELETE",
    ]) {
      expect((await get(table)).status).toBe(400);
    }
    expect((await get("documents", "", "")).status).toBe(401);
    const response = await app.request(
      "http://localhost/v1/internal/export/documents",
      { headers: { Cookie: await authenticatedCookie() } },
      env,
    );
    expect(response.status).toBe(401);
  });
  it("自然键分页跨越100行并保留原始JSON字符串、NULL和Unicode", async () => {
    for (let start = 0; start < 205; start += 50) {
      await env.DB.batch(
        Array.from({ length: Math.min(50, 205 - start) }, (_, index) =>
          env.DB.prepare("INSERT INTO documents(key,payload,updated_at) VALUES(?,?,?)").bind(
            `中文-${String(start + index).padStart(3, "0")}`,
            '{"私人原文": true, "数字": 1}',
            "2026-10-02",
          ),
        ),
      );
    }
    const rows: Record<string, unknown>[] = [];
    let cursor: string | null = null;
    do {
      const response = await get(
        "documents",
        `?limit=100${cursor ? `&cursor=${encodeURIComponent(cursor)}` : ""}`,
      );
      const page = schemas.ExportPage.parse(await response.json());
      rows.push(...page.items);
      cursor = page.nextCursor;
    } while (cursor);
    expect(rows.length).toBe(205);
    expect(new Set(rows.map((row) => row.key)).size).toBe(205);
    expect(rows[0]).toEqual({
      key: "中文-000",
      payload: '{"私人原文": true, "数字": 1}',
      updated_at: "2026-10-02",
    });
  });
  it("复合自然键中数字按数值排序，空串来源也不丢", async () => {
    for (const index of [12, 2, 1])
      await env.DB.prepare(
        "INSERT INTO insider_trades(accession,transaction_index,ticker,filed_at,payload) VALUES('same',?,'A','now','{}')",
      )
        .bind(index)
        .run();
    const first = schemas.ExportPage.parse(await (await get("insider_trades", "?limit=1")).json());
    expect(first.items[0]?.transaction_index).toBe(1);
    const second = schemas.ExportPage.parse(
      await (
        await get("insider_trades", `?limit=1&cursor=${encodeURIComponent(first.nextCursor ?? "")}`)
      ).json(),
    );
    expect(second.items[0]?.transaction_index).toBe(2);
    const third = schemas.ExportPage.parse(
      await (
        await get(
          "insider_trades",
          `?limit=1&cursor=${encodeURIComponent(second.nextCursor ?? "")}`,
        )
      ).json(),
    );
    expect(third.items[0]?.transaction_index).toBe(12);
    expect(third.nextCursor).toBeNull();
    for (const key of ["", "source"])
      await env.DB.prepare(
        "INSERT INTO calendar_events(kind,date,source_key,payload) VALUES('fomc','2026-10-02',?,'{}')",
      )
        .bind(key)
        .run();
    const page = schemas.ExportPage.parse(await (await get("calendar_events", "?limit=1")).json());
    expect(page.items[0]?.source_key).toBe("");
    expect(
      schemas.ExportPage.parse(
        await (
          await get("calendar_events", `?cursor=${encodeURIComponent(page.nextCursor ?? "")}`)
        ).json(),
      ).items[0]?.source_key,
    ).toBe("source");
  });
  it("拒绝错误表游标、键类型、非法base64与limit", async () => {
    const cursor = (value: unknown) =>
      `?cursor=${encodeURIComponent(btoa(encodeURIComponent(JSON.stringify(value))))}`;
    for (const query of [
      "?limit=0",
      "?limit=101",
      "?limit=1.5",
      "?cursor=bad!",
      cursor({ table: "runs", values: ["a"] }),
      cursor({ table: "documents", values: [] }),
      cursor({ table: "documents", values: [1] }),
    ])
      expect((await get("documents", query)).status).toBe(400);
    expect(
      (await get("ai_calls", cursor({ table: "ai_calls", values: [Number.MAX_SAFE_INTEGER + 1] })))
        .status,
    ).toBe(400);
    expect(schemas.ExportPage.parse(await (await get("documents")).json()).nextCursor).toBeNull();
  });
});
