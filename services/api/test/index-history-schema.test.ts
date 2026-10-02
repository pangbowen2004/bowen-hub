import { env } from "cloudflare:workers";
import { expect, it } from "vitest";

it("指数迁移保留旧行缺失事实，新行原样保存前收盘与收益率", async () => {
  await env.DB.prepare("DELETE FROM index_history").run();
  await env.DB.prepare(
    "INSERT INTO index_history(code,date,open,high,low,close,amount_cny) VALUES(?,?,?,?,?,?,?)",
  )
    .bind("legacy", "2026-09-30", 12, 13, 11, 12.3, 100)
    .run();
  const old = await env.DB.prepare(
    "SELECT pre_close,return1d FROM index_history WHERE code='legacy'",
  ).first();
  expect(old).toEqual({ pre_close: null, return1d: null });
  await env.DB.prepare(
    "INSERT INTO index_history(code,date,open,high,low,close,amount_cny,pre_close,return1d) VALUES(?,?,?,?,?,?,?,?,?)",
  )
    .bind("actual", "2026-10-02", 12, 13, 11, 12.3, 100, 12, 0.025)
    .run();
  const current = await env.DB.prepare(
    "SELECT pre_close,return1d FROM index_history WHERE code='actual'",
  ).first();
  expect(current).toEqual({ pre_close: 12, return1d: 0.025 });
});
