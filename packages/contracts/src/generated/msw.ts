// 由 contracts 生成，勿手改（mise run gen）
import {
  faker
} from '@faker-js/faker';

import {
  HttpResponse,
  http
} from 'msw';
import type {
  RequestHandlerOptions
} from 'msw';

import {
  AutonomyLevel,
  CapabilityRuntime,
  EvalSchedule,
  ExportTable,
  ModelTier,
  ReasoningEffort,
  RunStatus,
  WatchItemKind
} from './types';
import type {
  AiUsageSummary,
  CapabilityInfo,
  EvalResult,
  ExportPage,
  Health,
  RunPage,
  WatchItem
} from './types';


export const getPrivatePlatformGetAiUsageResponseMock = (overrideResponse: Partial<Extract<AiUsageSummary, object>> = {}): AiUsageSummary => ({days: faker.number.int(), total: {calls: faker.number.int(), failedCalls: faker.number.int(), inputTokens: faker.number.int(), outputTokens: faker.number.int(), costUsd: faker.number.float({fractionDigits: 2})}, byDay: Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => ({date: faker.date.past().toISOString().slice(0, 10), calls: faker.number.int(), failedCalls: faker.number.int(), inputTokens: faker.number.int(), outputTokens: faker.number.int(), costUsd: faker.number.float({fractionDigits: 2})})), byCapability: Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => ({capability: faker.string.alpha({length: {min: 10, max: 20}}), calls: faker.number.int(), failedCalls: faker.number.int(), inputTokens: faker.number.int(), outputTokens: faker.number.int(), costUsd: faker.number.float({fractionDigits: 2})})), monthCostUsd: faker.number.float({fractionDigits: 2}), monthlyBudgetUsd: faker.number.float({fractionDigits: 2}), ...overrideResponse})

export const getPrivatePlatformListCapabilitiesResponseMock = (): CapabilityInfo[] => (Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => ({id: faker.string.alpha({length: {min: 10, max: 20}}), version: faker.number.int(), summary: faker.string.alpha({length: {min: 10, max: 20}}), owner: faker.string.alpha({length: {min: 10, max: 20}}), runtime: faker.helpers.arrayElement(Object.values(CapabilityRuntime)), tier: faker.helpers.arrayElement(Object.values(ModelTier)), model: faker.string.alpha({length: {min: 10, max: 20}}), reasoning: faker.helpers.arrayElement(Object.values(ReasoningEffort)), autonomy: faker.helpers.arrayElement(Object.values(AutonomyLevel)), prompt: faker.string.alpha({length: {min: 10, max: 20}}), io: {input: faker.string.alpha({length: {min: 10, max: 20}}), output: faker.string.alpha({length: {min: 10, max: 20}})}, limits: {maxInputTokens: faker.number.int(), maxOutputTokens: faker.number.int(), timeoutSec: faker.number.int()}, checks: Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => (faker.string.alpha({length: {min: 10, max: 20}}))), fallback: faker.string.alpha({length: {min: 10, max: 20}}), params: {}, evals: {dataset: faker.string.alpha({length: {min: 10, max: 20}}), schedule: faker.helpers.arrayElement(Object.values(EvalSchedule)), thresholds: {}}, latestEval: faker.helpers.arrayElement([{capability: faker.string.alpha({length: {min: 10, max: 20}}), model: faker.string.alpha({length: {min: 10, max: 20}}), datasetVersion: faker.string.alpha({length: {min: 10, max: 20}}), scores: {}, passed: faker.datatype.boolean(), at: faker.date.past().toISOString().slice(0, 19) + 'Z', costUsd: faker.helpers.arrayElement([faker.number.float({fractionDigits: 2}), undefined]), durationMs: faker.helpers.arrayElement([faker.number.int(), undefined])},null,])})))

export const getPrivatePlatformListEvalsResponseMock = (): EvalResult[] => (Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => ({capability: faker.string.alpha({length: {min: 10, max: 20}}), model: faker.string.alpha({length: {min: 10, max: 20}}), datasetVersion: faker.string.alpha({length: {min: 10, max: 20}}), scores: {}, passed: faker.datatype.boolean(), at: faker.date.past().toISOString().slice(0, 19) + 'Z', costUsd: faker.helpers.arrayElement([faker.number.float({fractionDigits: 2}), undefined]), durationMs: faker.helpers.arrayElement([faker.number.int(), undefined])})))

export const getHealthCheckGetResponseMock = (overrideResponse: Partial<Extract<Health, object>> = {}): Health => ({status: faker.helpers.arrayElement(['ok'] as const), ...overrideResponse})

export const getInternalPlatformExportTableResponseMock = (overrideResponse: Partial<Extract<ExportPage, object>> = {}): ExportPage => ({table: faker.helpers.arrayElement(Object.values(ExportTable)), items: Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => ({})), nextCursor: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}),null,]), ...overrideResponse})

export const getPrivatePlatformListRunsResponseMock = (overrideResponse: Partial<Extract<RunPage, object>> = {}): RunPage => ({items: Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => ({id: faker.string.alpha({length: {min: 10, max: 20}}), job: faker.string.alpha({length: {min: 10, max: 20}}), date: faker.date.past().toISOString().slice(0, 10), status: faker.helpers.arrayElement(Object.values(RunStatus)), startedAt: faker.date.past().toISOString().slice(0, 19) + 'Z', finishedAt: faker.helpers.arrayElement([faker.date.past().toISOString().slice(0, 19) + 'Z',null,]), stats: {}, error: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}),null,])})), nextCursor: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}),null,]), ...overrideResponse})

export const getPrivateWatchlistListResponseMock = (): WatchItem[] => (Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => ({symbol: faker.string.alpha({length: {min: 10, max: 20}}), name: faker.string.alpha({length: {min: 10, max: 20}}), kind: faker.helpers.arrayElement(Object.values(WatchItemKind)), group: faker.string.alpha({length: {min: 10, max: 20}}), underlying: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}),null,]), sectorEtf: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}),null,]), aliases: Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => (faker.string.alpha({length: {min: 10, max: 20}}))), active: faker.datatype.boolean()})))

export const getPrivateWatchlistPutResponseMock = (overrideResponse: Partial<Extract<WatchItem, object>> = {}): WatchItem => ({symbol: faker.string.alpha({length: {min: 10, max: 20}}), name: faker.string.alpha({length: {min: 10, max: 20}}), kind: faker.helpers.arrayElement(Object.values(WatchItemKind)), group: faker.string.alpha({length: {min: 10, max: 20}}), underlying: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}),null,]), sectorEtf: faker.helpers.arrayElement([faker.string.alpha({length: {min: 10, max: 20}}),null,]), aliases: Array.from({ length: faker.number.int({min: 1, max: 10}) }, (_, i) => i + 1).map(() => (faker.string.alpha({length: {min: 10, max: 20}}))), active: faker.datatype.boolean(), ...overrideResponse})


export const getPrivatePlatformGetAiUsageMockHandler = (overrideResponse?: AiUsageSummary | ((info: Parameters<Parameters<typeof http.get>[1]>[0]) => Promise<AiUsageSummary> | AiUsageSummary), options?: RequestHandlerOptions) => {
  return http.get('*/v1/ai/usage', async (info: Parameters<Parameters<typeof http.get>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getPrivatePlatformGetAiUsageResponseMock(),
      { status: 200
      })
  }, options)
}

export const getPrivatePlatformListCapabilitiesMockHandler = (overrideResponse?: CapabilityInfo[] | ((info: Parameters<Parameters<typeof http.get>[1]>[0]) => Promise<CapabilityInfo[]> | CapabilityInfo[]), options?: RequestHandlerOptions) => {
  return http.get('*/v1/capabilities', async (info: Parameters<Parameters<typeof http.get>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getPrivatePlatformListCapabilitiesResponseMock(),
      { status: 200
      })
  }, options)
}

export const getPrivatePlatformListEvalsMockHandler = (overrideResponse?: EvalResult[] | ((info: Parameters<Parameters<typeof http.get>[1]>[0]) => Promise<EvalResult[]> | EvalResult[]), options?: RequestHandlerOptions) => {
  return http.get('*/v1/evals', async (info: Parameters<Parameters<typeof http.get>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getPrivatePlatformListEvalsResponseMock(),
      { status: 200
      })
  }, options)
}

export const getHealthCheckGetMockHandler = (overrideResponse?: Health | ((info: Parameters<Parameters<typeof http.get>[1]>[0]) => Promise<Health> | Health), options?: RequestHandlerOptions) => {
  return http.get('*/v1/health', async (info: Parameters<Parameters<typeof http.get>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getHealthCheckGetResponseMock(),
      { status: 200
      })
  }, options)
}

export const getInternalPlatformBatchAiCallsMockHandler = (overrideResponse?: void | ((info: Parameters<Parameters<typeof http.post>[1]>[0]) => Promise<void> | void), options?: RequestHandlerOptions) => {
  return http.post('*/v1/internal/ai-calls/batch', async (info: Parameters<Parameters<typeof http.post>[1]>[0]) => {
  if (typeof overrideResponse === 'function') {await overrideResponse(info); }

    return new HttpResponse(null,
      { status: 204
      })
  }, options)
}

export const getInternalPlatformPutDocumentMockHandler = (overrideResponse?: void | ((info: Parameters<Parameters<typeof http.put>[1]>[0]) => Promise<void> | void), options?: RequestHandlerOptions) => {
  return http.put('*/v1/internal/documents/:key', async (info: Parameters<Parameters<typeof http.put>[1]>[0]) => {
  if (typeof overrideResponse === 'function') {await overrideResponse(info); }

    return new HttpResponse(null,
      { status: 204
      })
  }, options)
}

export const getInternalPlatformBatchEvalResultsMockHandler = (overrideResponse?: void | ((info: Parameters<Parameters<typeof http.post>[1]>[0]) => Promise<void> | void), options?: RequestHandlerOptions) => {
  return http.post('*/v1/internal/evals/results/batch', async (info: Parameters<Parameters<typeof http.post>[1]>[0]) => {
  if (typeof overrideResponse === 'function') {await overrideResponse(info); }

    return new HttpResponse(null,
      { status: 204
      })
  }, options)
}

export const getInternalPlatformExportTableMockHandler = (overrideResponse?: ExportPage | ((info: Parameters<Parameters<typeof http.get>[1]>[0]) => Promise<ExportPage> | ExportPage), options?: RequestHandlerOptions) => {
  return http.get('*/v1/internal/export/:table', async (info: Parameters<Parameters<typeof http.get>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getInternalPlatformExportTableResponseMock(),
      { status: 200
      })
  }, options)
}

export const getInternalPlatformPutRunMockHandler = (overrideResponse?: void | ((info: Parameters<Parameters<typeof http.put>[1]>[0]) => Promise<void> | void), options?: RequestHandlerOptions) => {
  return http.put('*/v1/internal/runs/:runId', async (info: Parameters<Parameters<typeof http.put>[1]>[0]) => {
  if (typeof overrideResponse === 'function') {await overrideResponse(info); }

    return new HttpResponse(null,
      { status: 204
      })
  }, options)
}

export const getInternalWatchlistBatchMockHandler = (overrideResponse?: void | ((info: Parameters<Parameters<typeof http.post>[1]>[0]) => Promise<void> | void), options?: RequestHandlerOptions) => {
  return http.post('*/v1/internal/watchlist/batch', async (info: Parameters<Parameters<typeof http.post>[1]>[0]) => {
  if (typeof overrideResponse === 'function') {await overrideResponse(info); }

    return new HttpResponse(null,
      { status: 204
      })
  }, options)
}

export const getPrivatePlatformListRunsMockHandler = (overrideResponse?: RunPage | ((info: Parameters<Parameters<typeof http.get>[1]>[0]) => Promise<RunPage> | RunPage), options?: RequestHandlerOptions) => {
  return http.get('*/v1/runs', async (info: Parameters<Parameters<typeof http.get>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getPrivatePlatformListRunsResponseMock(),
      { status: 200
      })
  }, options)
}

export const getPrivateWatchlistListMockHandler = (overrideResponse?: WatchItem[] | ((info: Parameters<Parameters<typeof http.get>[1]>[0]) => Promise<WatchItem[]> | WatchItem[]), options?: RequestHandlerOptions) => {
  return http.get('*/v1/watchlist', async (info: Parameters<Parameters<typeof http.get>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getPrivateWatchlistListResponseMock(),
      { status: 200
      })
  }, options)
}

export const getPrivateWatchlistPutMockHandler = (overrideResponse?: WatchItem | ((info: Parameters<Parameters<typeof http.put>[1]>[0]) => Promise<WatchItem> | WatchItem), options?: RequestHandlerOptions) => {
  return http.put('*/v1/watchlist/:symbol', async (info: Parameters<Parameters<typeof http.put>[1]>[0]) => {


    return HttpResponse.json(overrideResponse !== undefined
    ? (typeof overrideResponse === "function" ? await overrideResponse(info) : overrideResponse)
    : getPrivateWatchlistPutResponseMock(),
      { status: 200
      })
  }, options)
}

export const getPrivateWatchlistRemoveMockHandler = (overrideResponse?: void | ((info: Parameters<Parameters<typeof http.delete>[1]>[0]) => Promise<void> | void), options?: RequestHandlerOptions) => {
  return http.delete('*/v1/watchlist/:symbol', async (info: Parameters<Parameters<typeof http.delete>[1]>[0]) => {
  if (typeof overrideResponse === 'function') {await overrideResponse(info); }

    return new HttpResponse(null,
      { status: 204
      })
  }, options)
}
export const getBowenHubAPIMock = () => [
  getPrivatePlatformGetAiUsageMockHandler(),
  getPrivatePlatformListCapabilitiesMockHandler(),
  getPrivatePlatformListEvalsMockHandler(),
  getHealthCheckGetMockHandler(),
  getInternalPlatformBatchAiCallsMockHandler(),
  getInternalPlatformPutDocumentMockHandler(),
  getInternalPlatformBatchEvalResultsMockHandler(),
  getInternalPlatformExportTableMockHandler(),
  getInternalPlatformPutRunMockHandler(),
  getInternalWatchlistBatchMockHandler(),
  getPrivatePlatformListRunsMockHandler(),
  getPrivateWatchlistListMockHandler(),
  getPrivateWatchlistPutMockHandler(),
  getPrivateWatchlistRemoveMockHandler()
]
