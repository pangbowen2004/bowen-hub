// 市场契约验收：公开接口覆盖、真实样例口径、缺失方向与每类规则的结构。
import { join } from "node:path";
import { setupServer } from "msw/node";
import { describe, expect, it } from "vitest";
import type { Hypothesis, MarketDay, WeeklyReport } from "../../src/generated/types";
import { marketsSamples } from "../../src/mocks/samples/markets";
import { createAjv, OPENAPI, ROOT, readJson, readYaml, SAMPLES } from "../support/repo";

const sample = (name: string) => readJson(join(SAMPLES, "markets", name));
const day = sample("MarketDay.2026-08-28.json") as MarketDay;
const hypotheses = sample("Hypothesis.ledger.json") as Hypothesis[];
const weekly = sample("WeeklyReport.2026-08-28.json") as WeeklyReport;
const summary = sample("WeeklySummary.2026-08-28.json") as Record<string, unknown>;
const ajv = createAjv();
const doc = readYaml(OPENAPI) as { paths: Record<string, Record<string, { "x-task"?: string }>> };

describe("市场领域契约", () => {
  it("恰好覆盖 docs08 的17个T23接口", () => {
    const expected = [
      "get /v1/public/markets/days",
      "get /v1/public/markets/days/latest",
      "get /v1/public/markets/days/{date}",
      "get /v1/public/markets/indices/{code}/bars",
      "get /v1/public/markets/hypotheses",
      "get /v1/public/markets/weeklies",
      "get /v1/public/markets/weeklies/{date}",
      "get /v1/public/markets/events",
      "get /v1/public/markets/reference",
      "post /v1/markets/events",
      "put /v1/markets/events/{id}",
      "delete /v1/markets/events/{id}",
      "put /v1/internal/markets/days/{date}",
      "post /v1/internal/markets/hypotheses/batch",
      "put /v1/internal/markets/weeklies/{date}",
      "post /v1/internal/markets/events/batch",
      "put /v1/internal/markets/indices/{code}/bars",
    ];
    const actual = Object.entries(doc.paths).flatMap(([path, operations]) =>
      Object.entries(operations)
        .filter(([, op]) => op["x-task"] === "T23")
        .map(([method]) => `${method} ${path}`),
    );
    expect(actual.sort()).toEqual(expected.sort());
  });
  it("真实8月28日关键数字与只读fixtures一致", () => {
    const old = readJson(join(ROOT, "fixtures/market/close-analysis-2026-08-28.json")) as {
      market: MarketDay["market"];
    };
    expect(day.market.turnoverCny).toBe(old.market.turnoverCny);
    expect(day.temperature.value).toBe(51.9);
    expect(day.sentiment.value).toBe(81.1);
    expect(day.market.turnoverChange).toBeCloseTo(
      day.market.turnoverCny / day.market.turnoverPrevCny - 1,
      12,
    );
    expect(day.technical).not.toHaveProperty("sourceLevels");
    expect(day.directions?.items).toHaveLength(16);
    expect(day.etfGroups?.groups).toHaveLength(8);
  });
  it("周报摘要同名保留，Research Error仅含4条未确认，12条证据不足单列", () => {
    for (const [key, value] of Object.entries(summary))
      expect(weekly[key as keyof WeeklyReport]).toEqual(value);
    expect(weekly.researchErrorCount).toBe(4);
    expect(weekly.inconclusiveCount).toBe(12);
    expect(weekly.researchErrors.items).toHaveLength(4);
    expect(weekly.researchErrors.items.every((h) => h.result === "NOT_CONFIRMED")).toBe(true);
  });
  it("61条账本保留五类强类型rule、四类结果及11条无rule记录", () => {
    expect(hypotheses).toHaveLength(61);
    expect(new Set(hypotheses.map((h) => h.result))).toEqual(
      new Set(["PENDING", "CONFIRMED", "NOT_CONFIRMED", "INCONCLUSIVE"]),
    );
    expect(hypotheses.filter((h) => h.rule === null)).toHaveLength(11);
    expect(new Set(hypotheses.filter((h) => h.rule).map((h) => h.rule?.type)).size).toBe(5);
    const validate = ajv.getSchema("Hypothesis.json");
    const bad = structuredClone(hypotheses.find((h) => h.rule?.type === "LIMIT_ECOLOGY"));
    if (!bad?.rule) throw new Error("缺少涨停生态规则样例");
    const malformed = { ...bad, rule: { ...bad.rule, thresholds: { arbitraryThreshold: 1 } } };
    expect(validate?.(malformed)).toBe(false);
  });
  it("摘要方向字段必填nullable，整块和最后一天相关条目可为空", () => {
    const s = sample("MarketDaySummary.2026-08-28.json") as Record<string, unknown>;
    const validate = ajv.getSchema("MarketDaySummary.json");
    expect(validate?.({ ...s, topDirections: null, directionsRelative: null })).toBe(true);
    const missing = { ...s };
    delete missing.topDirections;
    expect(validate?.(missing)).toBe(false);
    const d = structuredClone(day);
    d.directions = null;
    d.evolution.transmission.direction = null;
    d.evolution.signals.direction = null;
    expect(ajv.getSchema("MarketDay.json")?.(d)).toBe(true);
  });
  it("固定五个交易日，缺方向保留行并标记覆盖2/5，资金流不足用null", () => {
    expect(day.evolution.rows.map((row) => row.date)).toEqual([
      "2026-08-24",
      "2026-08-25",
      "2026-08-26",
      "2026-08-27",
      "2026-08-28",
    ]);
    expect(day.evolution.summary.directionCoverageDays).toBe(2);
    expect(day.evolution.summary.windowDays).toBe(5);
    expect(day.evolution.rows.filter((row) => row.topDirections !== null)).toHaveLength(2);
    expect(day.directions?.items.every((item) => item.moneyflowCoverage === null)).toBe(true);
    expect(day.dataStatus).toEqual({ complete: false, missing: ["moneyflow"] });
    const malformed = {
      ...day,
      evolution: { ...day.evolution, rows: day.evolution.rows.slice(1) },
    };
    expect(ajv.getSchema("MarketDay.json")?.(malformed)).toBe(false);
  });
  it("全部9个公开GET的样例处理器可请求，指数参数选择对应指数", async () => {
    const server = setupServer(...marketsSamples.map((s) => s.build()));
    server.listen({ onUnhandledRequest: "error" });
    try {
      for (const suffix of [
        "days",
        "days/latest",
        "days/2026-08-27",
        "indices/399006.SZ/bars?limit=1",
        "hypotheses",
        "weeklies",
        "weeklies/2026-08-28",
        "events",
        "reference",
      ]) {
        const response = await fetch(`http://localhost/v1/public/markets/${suffix}`);
        expect(response.status).toBe(200);
        const content = (await response.json()) as { close: number }[];
        if (suffix === "indices/399006.SZ/bars?limit=1")
          expect(content[0]?.close).toBe(
            (sample("IndexBar.399006.sz.json") as { close: number }[]).at(-1)?.close,
          );
      }
    } finally {
      server.close();
    }
  });
});
