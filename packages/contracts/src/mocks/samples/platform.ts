// 平台接口 ↔ 样例（T01 甲段）。样例在 fixtures/samples/platform/。
import aiUsage from "../../../../../fixtures/samples/platform/AiUsageSummary.last-7-days.json" with {
  type: "json",
};
import capabilities from "../../../../../fixtures/samples/platform/CapabilityInfo.registry.json" with {
  type: "json",
};
import evals from "../../../../../fixtures/samples/platform/EvalResult.weekly.json" with {
  type: "json",
};
import exportRuns from "../../../../../fixtures/samples/platform/ExportPage.runs.json" with {
  type: "json",
};
import exportWatchItems from "../../../../../fixtures/samples/platform/ExportPage.watch-items.json" with {
  type: "json",
};
import health from "../../../../../fixtures/samples/platform/Health.ok.json" with { type: "json" };
import runEodFailed from "../../../../../fixtures/samples/platform/Run.market-eod-failed.json" with {
  type: "json",
};
import runMorning from "../../../../../fixtures/samples/platform/Run.news-morning.json" with {
  type: "json",
};
import runIngest from "../../../../../fixtures/samples/platform/Run.papers-ingest-running.json" with {
  type: "json",
};
import {
  getHealthCheckGetMockHandler,
  getInternalPlatformExportTableMockHandler,
  getPrivatePlatformGetAiUsageMockHandler,
  getPrivatePlatformListCapabilitiesMockHandler,
  getPrivatePlatformListEvalsMockHandler,
  getPrivatePlatformListRunsMockHandler,
} from "../../generated/msw";
import { type SampleRoute, sampleRoute } from "../registry";

export const platformSamples: SampleRoute[] = [
  sampleRoute(getHealthCheckGetMockHandler, [health], { shape: "one" }),
  sampleRoute(getPrivatePlatformListRunsMockHandler, [runIngest, runMorning, runEodFailed], {
    shape: "page",
  }),
  sampleRoute(getPrivatePlatformGetAiUsageMockHandler, [aiUsage], { shape: "one" }),
  sampleRoute(getPrivatePlatformListEvalsMockHandler, [evals], { shape: "list" }),
  sampleRoute(getPrivatePlatformListCapabilitiesMockHandler, [capabilities], { shape: "list" }),
  sampleRoute(getInternalPlatformExportTableMockHandler, [exportRuns, exportWatchItems], {
    shape: "one",
    pick: (sample, params) => sample.table === params.table,
  }),
];
