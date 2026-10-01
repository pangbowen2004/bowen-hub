// 新闻契约的业务边界：自然键、旧数据缺失值、反馈及能力后处理。
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { getPrivateNewsGetTimelineResponseMock } from "../../src/generated/msw";
import { createAjv, OPENAPI, readJson, readYaml, SAMPLES, SCHEMAS } from "../support/repo";

const ajv = createAjv();
const validate = (name: string, value: unknown): boolean => {
  const check = ajv.getSchema(`${name}.json`);
  if (check === undefined) throw new Error(`缺少 ${name} 契约`);
  return check(value) === true;
};
const schema = (name: string) =>
  readJson(join(SCHEMAS, `${name}.json`)) as {
    properties: Record<string, Record<string, unknown>>;
  };
const legacy = readJson(join(SAMPLES, "news", "Edition.legacy-2026-09-29.json")) as {
  generatedAt: unknown;
  window: unknown;
  email: unknown;
  sections: { kind: string }[];
};

describe("新闻业务边界", () => {
  it("初始新闻操作及获批兼容增量由T14实现", () => {
    const doc = readYaml(OPENAPI) as {
      paths: Record<string, Record<string, { "x-task": string }>>;
    };
    const ops = Object.entries(doc.paths)
      .filter(([path]) => path.startsWith("/v1/news/") || path.startsWith("/v1/internal/news/"))
      .flatMap(([, methods]) => Object.values(methods));
    const compatibleFullTimeline = doc.paths["/v1/news/tickers/{symbol}/timeline/full"]?.get;
    expect(ops).toHaveLength(18 + (compatibleFullTimeline === undefined ? 0 : 1));
    expect(ops.every((op) => op["x-task"] === "T14")).toBe(true);
  });

  it("生成的时间线随机样例始终遵守整数范围", () => {
    for (let run = 0; run < 100; run++) {
      for (const item of getPrivateNewsGetTimelineResponseMock()) {
        expect(validate("NewsTimelineItem", item)).toBe(true);
      }
    }
  });

  it("旧归档保留未知时间，栏目只有今日要闻", () => {
    expect(legacy.generatedAt).toBeNull();
    expect(legacy.window).toEqual({ fromAt: null, toAt: null });
    expect(legacy.email).toBeNull();
    expect(legacy.sections.map((section) => section.kind)).toEqual(["legacy_headlines"]);
  });

  it.each([0, 6, 1.5])("期次评分拒绝范围外或非整数的 %s", (score) => {
    expect(validate("EditionFeedbackRequest", { score })).toBe(false);
  });

  it("条目反馈只接受没用与有错", () => {
    const base = { editionId: "morning-2026-09-30", itemId: "sample" };
    expect(validate("ItemFeedbackRequest", { ...base, reason: "useless" })).toBe(true);
    expect(validate("ItemFeedbackRequest", { ...base, reason: "incorrect" })).toBe(true);
    expect(validate("ItemFeedbackRequest", { ...base, reason: "other" })).toBe(false);
  });

  it("国际栏目保留逐条规则分，旧归档允许规则分缺失", () => {
    const article = readJson(join(SAMPLES, "news", "Article.synthetic.json"));
    const digest = { article, summary: null, whyItMatters: null, topic: null, generatedBy: null };
    const item = { id: "source-1", data: digest, ruleScore: 8, clusterId: null };
    expect(
      validate("NewsInternational", {
        overview: "示例",
        top5: [item],
        briefs: [],
        generatedBy: null,
      }),
    ).toBe(true);
    expect(
      validate("NewsInternational", {
        overview: "示例",
        top5: [digest],
        briefs: [],
        generatedBy: null,
      }),
    ).toBe(false);
    expect(validate("NewsNewsArticleDigestItem", { id: "legacy-1", data: digest })).toBe(true);
  });

  it("个股摘要的财报输入必须具有可引用的来源 id", () => {
    const card = readJson(join(SAMPLES, "news", "EarningsCard.synthetic.json")) as Record<
      string,
      unknown
    >;
    expect(validate("NewsTickerEarnings", card)).toBe(false);
    expect(validate("NewsTickerEarnings", { ...card, id: "earnings-source-1" })).toBe(true);
  });

  it("内部人交易必须具有accession和交易行序号", () => {
    const trade = readJson(join(SAMPLES, "news", "InsiderTrade.synthetic.json")) as Record<
      string,
      unknown
    >;
    const { accession: _accession, ...withoutAccession } = trade;
    const { transactionIndex: _transactionIndex, ...withoutIndex } = trade;
    expect(validate("InsiderTrade", trade)).toBe(true);
    expect(validate("InsiderTrade", withoutAccession)).toBe(false);
    expect(validate("InsiderTrade", withoutIndex)).toBe(false);
  });

  it("能力输出可先不盖出处，持久化对象必须显式填写出处或降级空值", () => {
    const output = { whatHappened: "示例", whyItMatters: null, sourceIds: [], points: [] };
    expect(validate("TickerDigestOutput", output)).toBe(true);
    const persisted = { ...output, symbol: "NVDA", change: null, withSector: null };
    expect(validate("TickerDigest", persisted)).toBe(false);
    expect(validate("TickerDigest", { ...persisted, generatedBy: null })).toBe(true);
  });

  it("字数与来源数量由能力运行时后处理，生成schema只注记文字上限", () => {
    expect(schema("TickerDigestOutput").properties.whatHappened?.["x-max-chars"]).toBe(80);
    expect(schema("TickerDigestOutput").properties.whatHappened?.maxLength).toBeUndefined();
    expect(schema("TickerDigestOutput").properties.sourceIds?.maxItems).toBeUndefined();
    expect(
      validate("TickerDigestOutput", {
        whatHappened: "长".repeat(100),
        whyItMatters: null,
        sourceIds: ["a", "b", "c", "d"],
        points: [],
      }),
    ).toBe(true);
    expect(schema("EarningsFigure").properties.quote?.["x-source-quote"]).toBe(true);
    expect(schema("EarningsGuidance").properties.quote?.["x-source-quote"]).toBe(true);
  });
});
