// 市场公开 GET 使用只读旧数据转换的样例；来源与手写字段见市场样例 README。

import hypotheses from "../../../../../fixtures/samples/markets/Hypothesis.ledger.json" with {
  type: "json",
};
import bars000001 from "../../../../../fixtures/samples/markets/IndexBar.000001.sh.json" with {
  type: "json",
};
import bars000688 from "../../../../../fixtures/samples/markets/IndexBar.000688.sh.json" with {
  type: "json",
};
import bars000852 from "../../../../../fixtures/samples/markets/IndexBar.000852.sh.json" with {
  type: "json",
};
import bars399001 from "../../../../../fixtures/samples/markets/IndexBar.399001.sz.json" with {
  type: "json",
};
import bars399006 from "../../../../../fixtures/samples/markets/IndexBar.399006.sz.json" with {
  type: "json",
};
import bars399303 from "../../../../../fixtures/samples/markets/IndexBar.399303.sz.json" with {
  type: "json",
};
import day27 from "../../../../../fixtures/samples/markets/MarketDay.2026-08-27.json" with {
  type: "json",
};
import day28 from "../../../../../fixtures/samples/markets/MarketDay.2026-08-28.json" with {
  type: "json",
};
import summary27 from "../../../../../fixtures/samples/markets/MarketDaySummary.2026-08-27.json" with {
  type: "json",
};
import summary28 from "../../../../../fixtures/samples/markets/MarketDaySummary.2026-08-28.json" with {
  type: "json",
};
import events from "../../../../../fixtures/samples/markets/MarketEvent.calendar.json" with {
  type: "json",
};
import reference from "../../../../../fixtures/samples/markets/MarketReference.config.json" with {
  type: "json",
};
import weekly from "../../../../../fixtures/samples/markets/WeeklyReport.2026-08-28.json" with {
  type: "json",
};
import weeklySummary from "../../../../../fixtures/samples/markets/WeeklySummary.2026-08-28.json" with {
  type: "json",
};
import {
  getPublicMarketsGetDayMockHandler,
  getPublicMarketsGetLatestDayMockHandler,
  getPublicMarketsGetReferenceMockHandler,
  getPublicMarketsGetWeeklyMockHandler,
  getPublicMarketsListDaysMockHandler,
  getPublicMarketsListEventsMockHandler,
  getPublicMarketsListHypothesesMockHandler,
  getPublicMarketsListIndexBarsMockHandler,
  getPublicMarketsListWeekliesMockHandler,
} from "../../generated/msw";
import { type SampleRoute, sampleRoute } from "../registry";

export const marketsSamples: SampleRoute[] = [
  sampleRoute(getPublicMarketsListDaysMockHandler, [summary28, summary27], { shape: "page" }),
  sampleRoute(getPublicMarketsGetLatestDayMockHandler, [day28], { shape: "one" }),
  sampleRoute(getPublicMarketsGetDayMockHandler, [day28, day27], {
    shape: "one",
    pick: (sample, params) => sample.date === params.date,
  }),
  {
    build: () =>
      getPublicMarketsListIndexBarsMockHandler((info) => {
        const byCode: Record<string, typeof bars000001> = {
          "000001.SH": bars000001,
          "000688.SH": bars000688,
          "000852.SH": bars000852,
          "399001.SZ": bars399001,
          "399006.SZ": bars399006,
          "399303.SZ": bars399303,
        };
        const rows = byCode[String(info.params.code)] ?? bars000001;
        const requested = Number(new URL(info.request.url).searchParams.get("limit") ?? 250);
        const limit =
          Number.isInteger(requested) && requested >= 1 ? Math.min(requested, 250) : 250;
        return rows.slice(-limit).reverse();
      }),
  },
  sampleRoute(getPublicMarketsListHypothesesMockHandler, [hypotheses], { shape: "page" }),
  sampleRoute(getPublicMarketsListWeekliesMockHandler, [weeklySummary], { shape: "list" }),
  sampleRoute(getPublicMarketsGetWeeklyMockHandler, [weekly], { shape: "one" }),
  sampleRoute(getPublicMarketsListEventsMockHandler, [events], { shape: "list" }),
  sampleRoute(getPublicMarketsGetReferenceMockHandler, [reference], { shape: "one" }),
];
