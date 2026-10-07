// 由 contracts 生成，勿手改（mise run gen）
import {
  getBaseUrl
} from '../runtime/base-url';

import type {
  AiCall,
  AiUsageSummary,
  Article,
  CalendarEvent,
  CapabilityInfo,
  DocumentKey,
  EarningsCard,
  Edition,
  EditionFeedback,
  EditionFeedbackRequest,
  EditionPage,
  EvalResult,
  ExportPage,
  ExportTable,
  Feedback,
  Filing,
  GraphData,
  Health,
  Hypothesis,
  HypothesisPage,
  IndexBar,
  InsiderTrade,
  InternalNewsPruneArticlesParams,
  InternalPlatformExportTableParams,
  InternalPlatformPutDocumentBody,
  ItemFeedback,
  ItemFeedbackRequest,
  MarketDay,
  MarketDaySummaryPage,
  MarketDayWrite,
  MarketEvent,
  MarketReference,
  NewsFullTimelineItem,
  NewsSourceHealth,
  NewsTimelineItem,
  Paper,
  PaperArxivUploadRequest,
  PaperAskRequest,
  PaperExplanation,
  PaperExplanationCreate,
  PaperExplanationPatch,
  PaperPage,
  PaperPatch,
  PaperPrivate,
  PaperPrivateWrite,
  PaperReviseRequest,
  PaperUploadPatch,
  PaperWrite,
  PapersCatalog,
  PrivateCalendarListEventsParams,
  PrivateNewsGetFullTimelineParams,
  PrivateNewsGetTimelineParams,
  PrivateNewsListEditionsParams,
  PrivateNewsListFeedbackParams,
  PrivateNewsSearchArticlesParams,
  PrivatePapersListPapersParams,
  PrivatePapersListUploadsParams,
  PrivatePlatformGetAiUsageParams,
  PrivatePlatformListEvalsParams,
  PrivatePlatformListRunsParams,
  PublicMarketsListDaysParams,
  PublicMarketsListEventsParams,
  PublicMarketsListHypothesesParams,
  PublicMarketsListIndexBarsParams,
  Review,
  Run,
  RunPage,
  SearchIndex,
  Upload,
  WatchItem,
  WeeklyReport,
  WeeklySummary
} from './types';


export const getPrivatePlatformGetAiUsageUrl = (params?: PrivatePlatformGetAiUsageParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/ai/usage?${stringifiedParams}` : `${getBaseUrl()}/v1/ai/usage`
}

/**
 * AI 用量汇总（ai_calls 表的聚合）
 */
export const privatePlatformGetAiUsage = async (params?: PrivatePlatformGetAiUsageParams, options?: RequestInit): Promise<AiUsageSummary> => {

  const res = await fetch(getPrivatePlatformGetAiUsageUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: AiUsageSummary, status?: number} = new globalThis.Error();
    const data : AiUsageSummary = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: AiUsageSummary = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateCalendarListEventsUrl = (params: PrivateCalendarListEventsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/calendar/events?${stringifiedParams}` : `${getBaseUrl()}/v1/calendar/events`
}

/**
 * 登录后读取日期范围内的美股财报与美国宏观日程。
 */
export const privateCalendarListEvents = async (params: PrivateCalendarListEventsParams, options?: RequestInit): Promise<CalendarEvent[]> => {

  const res = await fetch(getPrivateCalendarListEventsUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: CalendarEvent[], status?: number} = new globalThis.Error();
    const data : CalendarEvent[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: CalendarEvent[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePlatformListCapabilitiesUrl = () => {




  return `${getBaseUrl()}/v1/capabilities`
}

/**
 * 能力清单（读 packages/ai 构建时生成的注册表）+ 各能力最近一次评测结果
 */
export const privatePlatformListCapabilities = async ( options?: RequestInit): Promise<CapabilityInfo[]> => {

  const res = await fetch(getPrivatePlatformListCapabilitiesUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: CapabilityInfo[], status?: number} = new globalThis.Error();
    const data : CapabilityInfo[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: CapabilityInfo[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePlatformListEvalsUrl = (params?: PrivatePlatformListEvalsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/evals?${stringifiedParams}` : `${getBaseUrl()}/v1/evals`
}

/**
 * 评测结果（eval_results 表），最新的在前
 */
export const privatePlatformListEvals = async (params?: PrivatePlatformListEvalsParams, options?: RequestInit): Promise<EvalResult[]> => {

  const res = await fetch(getPrivatePlatformListEvalsUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: EvalResult[], status?: number} = new globalThis.Error();
    const data : EvalResult[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: EvalResult[] = body ? JSON.parse(body) : {}
  return data
}



export const getHealthCheckGetUrl = () => {




  return `${getBaseUrl()}/v1/health`
}

/**
 * API 在线就返回 200
 */
export const healthCheckGet = async ( options?: RequestInit): Promise<Health> => {

  const res = await fetch(getHealthCheckGetUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Health, status?: number} = new globalThis.Error();
    const data : Health = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Health = body ? JSON.parse(body) : {}
  return data
}



export const getInternalPlatformBatchAiCallsUrl = () => {




  return `${getBaseUrl()}/v1/internal/ai-calls/batch`
}

/**
 * 批量写入 AI 调用记录
 */
export const internalPlatformBatchAiCalls = async (aiCall: AiCall[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPlatformBatchAiCallsUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(aiCall)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPlatformPutDocumentUrl = (key: DocumentKey,) => {




  return `${getBaseUrl()}/v1/internal/documents/${encodeURIComponent(String(key))}`
}

/**
 * 写一份派生数据或参考资料（documents 表，按 key 覆盖）。
 * 请求体就是文档本身，结构由 key 决定（见 Document.payload）；API 不解析重组，整块存入。
 */
export const internalPlatformPutDocument = async (key: DocumentKey,
    internalPlatformPutDocumentBody: InternalPlatformPutDocumentBody, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPlatformPutDocumentUrl(key),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(internalPlatformPutDocumentBody)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPlatformBatchEvalResultsUrl = () => {




  return `${getBaseUrl()}/v1/internal/evals/results/batch`
}

/**
 * 批量写入评测结果（每周评测）
 */
export const internalPlatformBatchEvalResults = async (evalResult: EvalResult[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPlatformBatchEvalResultsUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(evalResult)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPlatformExportTableUrl = (table: ExportTable,
    params?: InternalPlatformExportTableParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/internal/export/${encodeURIComponent(String(table))}?${stringifiedParams}` : `${getBaseUrl()}/v1/internal/export/${encodeURIComponent(String(table))}`
}

/**
 * 数据导出：分页读出一张表（hub export 每晚调用，docs/09 第 5 节）
 */
export const internalPlatformExportTable = async (table: ExportTable,
    params?: InternalPlatformExportTableParams, options?: RequestInit): Promise<ExportPage> => {

  const res = await fetch(getInternalPlatformExportTableUrl(table,params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: ExportPage, status?: number} = new globalThis.Error();
    const data : ExportPage = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: ExportPage = body ? JSON.parse(body) : {}
  return data
}



export const getInternalMarketsPutDayUrl = (date: string,) => {




  return `${getBaseUrl()}/v1/internal/markets/days/${encodeURIComponent(String(date))}`
}

/**
 * putDay：市场数据接口。
 */
export const internalMarketsPutDay = async (date: string,
    marketDayWrite: MarketDayWrite, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalMarketsPutDayUrl(date),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(marketDayWrite)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalMarketsPutEventsUrl = () => {




  return `${getBaseUrl()}/v1/internal/markets/events/batch`
}

/**
 * putEvents：市场数据接口。
 */
export const internalMarketsPutEvents = async (marketEvent: MarketEvent[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalMarketsPutEventsUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(marketEvent)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalMarketsPutHypothesesUrl = () => {




  return `${getBaseUrl()}/v1/internal/markets/hypotheses/batch`
}

/**
 * putHypotheses：市场数据接口。
 */
export const internalMarketsPutHypotheses = async (hypothesis: Hypothesis[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalMarketsPutHypothesesUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(hypothesis)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalMarketsPutIndexBarsUrl = (code: string,) => {




  return `${getBaseUrl()}/v1/internal/markets/indices/${encodeURIComponent(String(code))}/bars`
}

/**
 * putIndexBars：市场数据接口。
 */
export const internalMarketsPutIndexBars = async (code: string,
    indexBar: IndexBar[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalMarketsPutIndexBarsUrl(code),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(indexBar)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalMarketsPutWeeklyUrl = (date: string,) => {




  return `${getBaseUrl()}/v1/internal/markets/weeklies/${encodeURIComponent(String(date))}`
}

/**
 * putWeekly：市场数据接口。
 */
export const internalMarketsPutWeekly = async (date: string,
    weeklyReport: WeeklyReport, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalMarketsPutWeeklyUrl(date),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(weeklyReport)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutArticlesUrl = () => {




  return `${getBaseUrl()}/v1/internal/news/articles/batch`
}

export const internalNewsPutArticles = async (article: Article[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutArticlesUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(article)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPruneArticlesUrl = (params: InternalNewsPruneArticlesParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/internal/news/articles/prune?${stringifiedParams}` : `${getBaseUrl()}/v1/internal/news/articles/prune`
}

export const internalNewsPruneArticles = async (params: InternalNewsPruneArticlesParams, options?: RequestInit): Promise<void> => {

  const res = await fetch(getInternalNewsPruneArticlesUrl(params),
  {
    ...options,
    method: 'POST'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutCalendarUrl = () => {




  return `${getBaseUrl()}/v1/internal/news/calendar/batch`
}

export const internalNewsPutCalendar = async (calendarEvent: CalendarEvent[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutCalendarUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(calendarEvent)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutEarningsCardsUrl = () => {




  return `${getBaseUrl()}/v1/internal/news/earnings-cards/batch`
}

export const internalNewsPutEarningsCards = async (earningsCard: EarningsCard[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutEarningsCardsUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(earningsCard)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutEditionUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/internal/news/editions/${encodeURIComponent(String(id))}`
}

export const internalNewsPutEdition = async (id: string,
    edition: Edition, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutEditionUrl(id),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(edition)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutEditionHtmlUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/internal/news/editions/${encodeURIComponent(String(id))}/html`
}

export const internalNewsPutEditionHtml = async (id: string,
    internalNewsPutEditionHtmlBody: string, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutEditionHtmlUrl(id),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'text/html', ...getHeaders(options?.headers) },
    body: internalNewsPutEditionHtmlBody
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutFilingsUrl = () => {




  return `${getBaseUrl()}/v1/internal/news/filings/batch`
}

export const internalNewsPutFilings = async (filing: Filing[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutFilingsUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(filing)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutInsiderTradesUrl = () => {




  return `${getBaseUrl()}/v1/internal/news/insider-trades/batch`
}

export const internalNewsPutInsiderTrades = async (insiderTrade: InsiderTrade[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutInsiderTradesUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(insiderTrade)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalNewsPutSourceHealthUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/internal/news/sources/${encodeURIComponent(String(id))}/health`
}

export const internalNewsPutSourceHealth = async (id: string,
    newsSourceHealth: NewsSourceHealth, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalNewsPutSourceHealthUrl(id),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(newsSourceHealth)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPapersGetUploadUrl = (uploadId: string,) => {




  return `${getBaseUrl()}/v1/internal/papers/uploads/${encodeURIComponent(String(uploadId))}`
}

export const internalPapersGetUpload = async (uploadId: string, options?: RequestInit): Promise<Upload> => {

  const res = await fetch(getInternalPapersGetUploadUrl(uploadId),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Upload, status?: number} = new globalThis.Error();
    const data : Upload = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Upload = body ? JSON.parse(body) : {}
  return data
}



export const getInternalPapersPatchUploadUrl = (uploadId: string,) => {




  return `${getBaseUrl()}/v1/internal/papers/uploads/${encodeURIComponent(String(uploadId))}`
}

export const internalPapersPatchUpload = async (uploadId: string,
    paperUploadPatch: PaperUploadPatch, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPapersPatchUploadUrl(uploadId),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperUploadPatch)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPapersGetUploadFileUrl = (uploadId: string,) => {




  return `${getBaseUrl()}/v1/internal/papers/uploads/${encodeURIComponent(String(uploadId))}/file`
}

export const internalPapersGetUploadFile = async (uploadId: string, options?: RequestInit): Promise<Blob> => {

  const res = await fetch(getInternalPapersGetUploadFileUrl(uploadId),
  {
    ...options,
    method: 'GET'


  }
)

  if (!res.ok) {
    const errorBody = [204, 205, 304].includes(res.status) ? null : await res.text();

    const err: globalThis.Error & {info?: Blob, status?: number} = new globalThis.Error();
    const data : Blob = errorBody ? JSON.parse(errorBody) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const body = [204, 205, 304].includes(res.status) ? null : await res.blob();
  const data: Blob = body as Blob
  return data
}



export const getInternalPapersPutPaperUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/internal/papers/${encodeURIComponent(String(id))}`
}

export const internalPapersPutPaper = async (id: string,
    paperWrite: PaperWrite, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPapersPutPaperUrl(id),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperWrite)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPapersPutFileUrl = (id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt',) => {




  return `${getBaseUrl()}/v1/internal/papers/${encodeURIComponent(String(id))}/files/${encodeURIComponent(String(name))}`
}

export const internalPapersPutFile = async (id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt',
    internalPapersPutFileBody: Blob | string, options?: RequestInit): Promise<void> => {

  const res = await fetch(getInternalPapersPutFileUrl(id,name),
  {
    ...options,
    method: 'PUT'
    ,
    body: internalPapersPutFileBody
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPapersGetFileUrl = (id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt',) => {




  return `${getBaseUrl()}/v1/internal/papers/${encodeURIComponent(String(id))}/files/${encodeURIComponent(String(name))}`
}

export const internalPapersGetFile = async (id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt', options?: RequestInit): Promise<Response> => {

    const stream = await fetch(getInternalPapersGetFileUrl(id,name),
  {
    ...options,
    method: 'GET'


  }
);
  if (!stream.ok) {
    const body = [204, 205, 304].includes(stream.status) ? null : await stream.text();
    const err: globalThis.Error & {info?: Response, status?: number} = new globalThis.Error();
    const data : Response = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = stream.status;
    throw err;
  }
  return stream
  }



export const getInternalPapersPutPageUrl = (id: string,
    n: number,) => {




  return `${getBaseUrl()}/v1/internal/papers/${encodeURIComponent(String(id))}/pages/${encodeURIComponent(String(n))}`
}

export const internalPapersPutPage = async (id: string,
    n: number,
    internalPapersPutPageBody: Blob, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPapersPutPageUrl(id,n),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'image/png', ...getHeaders(options?.headers) },
    body: internalPapersPutPageBody
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPapersPutPrivateUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/internal/papers/${encodeURIComponent(String(id))}/private`
}

export const internalPapersPutPrivate = async (id: string,
    paperPrivate: PaperPrivate, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPapersPutPrivateUrl(id),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperPrivate)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPapersCreateReviewUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/internal/papers/${encodeURIComponent(String(id))}/reviews`
}

export const internalPapersCreateReview = async (id: string,
    review: Review, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPapersCreateReviewUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(review)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalPlatformPutRunUrl = (runId: string,) => {




  return `${getBaseUrl()}/v1/internal/runs/${encodeURIComponent(String(runId))}`
}

/**
 * 写一条运行记录（任务开始和结束各写一次，按 runId 覆盖）；body.id 必须等于路径里的 runId
 */
export const internalPlatformPutRun = async (runId: string,
    run: Run, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalPlatformPutRunUrl(runId),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(run)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getInternalWatchlistBatchUrl = () => {




  return `${getBaseUrl()}/v1/internal/watchlist/batch`
}

/**
 * 自选股初始导入（hub migrate watchlist）：按代码覆盖写入
 */
export const internalWatchlistBatch = async (watchItem: WatchItem[], options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getInternalWatchlistBatchUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(watchItem)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getPrivateMarketsCreateEventUrl = () => {




  return `${getBaseUrl()}/v1/markets/events`
}

/**
 * createEvent：市场数据接口。
 */
export const privateMarketsCreateEvent = async (marketEvent: MarketEvent, options?: RequestInit): Promise<MarketEvent> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivateMarketsCreateEventUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(marketEvent)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: MarketEvent, status?: number} = new globalThis.Error();
    const data : MarketEvent = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: MarketEvent = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateMarketsPutEventUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/markets/events/${encodeURIComponent(String(id))}`
}

/**
 * putEvent：市场数据接口。
 */
export const privateMarketsPutEvent = async (id: string,
    marketEvent: MarketEvent, options?: RequestInit): Promise<MarketEvent> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivateMarketsPutEventUrl(id),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(marketEvent)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: MarketEvent, status?: number} = new globalThis.Error();
    const data : MarketEvent = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: MarketEvent = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateMarketsDeleteEventUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/markets/events/${encodeURIComponent(String(id))}`
}

/**
 * deleteEvent：市场数据接口。
 */
export const privateMarketsDeleteEvent = async (id: string, options?: RequestInit): Promise<void> => {

  const res = await fetch(getPrivateMarketsDeleteEventUrl(id),
  {
    ...options,
    method: 'DELETE'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getPrivateNewsSearchArticlesUrl = (params: PrivateNewsSearchArticlesParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/news/articles/search?${stringifiedParams}` : `${getBaseUrl()}/v1/news/articles/search`
}

export const privateNewsSearchArticles = async (params: PrivateNewsSearchArticlesParams, options?: RequestInit): Promise<Article[]> => {

  const res = await fetch(getPrivateNewsSearchArticlesUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Article[], status?: number} = new globalThis.Error();
    const data : Article[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Article[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsListEditionsUrl = (params?: PrivateNewsListEditionsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/news/editions?${stringifiedParams}` : `${getBaseUrl()}/v1/news/editions`
}

export const privateNewsListEditions = async (params?: PrivateNewsListEditionsParams, options?: RequestInit): Promise<EditionPage> => {

  const res = await fetch(getPrivateNewsListEditionsUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: EditionPage, status?: number} = new globalThis.Error();
    const data : EditionPage = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: EditionPage = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsGetEditionUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/news/editions/${encodeURIComponent(String(id))}`
}

export const privateNewsGetEdition = async (id: string, options?: RequestInit): Promise<Edition> => {

  const res = await fetch(getPrivateNewsGetEditionUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Edition, status?: number} = new globalThis.Error();
    const data : Edition = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Edition = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsRateEditionUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/news/editions/${encodeURIComponent(String(id))}/feedback`
}

export const privateNewsRateEdition = async (id: string,
    editionFeedbackRequest: EditionFeedbackRequest, options?: RequestInit): Promise<EditionFeedback> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivateNewsRateEditionUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(editionFeedbackRequest)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: EditionFeedback, status?: number} = new globalThis.Error();
    const data : EditionFeedback = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: EditionFeedback = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsGetEditionHtmlUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/news/editions/${encodeURIComponent(String(id))}/html`
}

export const privateNewsGetEditionHtml = async (id: string, options?: RequestInit): Promise<string> => {

  const res = await fetch(getPrivateNewsGetEditionHtmlUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: string, status?: number} = new globalThis.Error();
    const data : string = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: string = body !== null ? body : ''
  return data
}



export const getPrivateNewsListFeedbackUrl = (params?: PrivateNewsListFeedbackParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/news/feedback?${stringifiedParams}` : `${getBaseUrl()}/v1/news/feedback`
}

export const privateNewsListFeedback = async (params?: PrivateNewsListFeedbackParams, options?: RequestInit): Promise<Feedback[]> => {

  const res = await fetch(getPrivateNewsListFeedbackUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Feedback[], status?: number} = new globalThis.Error();
    const data : Feedback[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Feedback[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsFlagItemUrl = () => {




  return `${getBaseUrl()}/v1/news/feedback/items`
}

export const privateNewsFlagItem = async (itemFeedbackRequest: ItemFeedbackRequest, options?: RequestInit): Promise<ItemFeedback> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivateNewsFlagItemUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(itemFeedbackRequest)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: ItemFeedback, status?: number} = new globalThis.Error();
    const data : ItemFeedback = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: ItemFeedback = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsListSourcesUrl = () => {




  return `${getBaseUrl()}/v1/news/sources`
}

export const privateNewsListSources = async ( options?: RequestInit): Promise<NewsSourceHealth[]> => {

  const res = await fetch(getPrivateNewsListSourcesUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: NewsSourceHealth[], status?: number} = new globalThis.Error();
    const data : NewsSourceHealth[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: NewsSourceHealth[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsGetTimelineUrl = (symbol: string,
    params?: PrivateNewsGetTimelineParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/news/tickers/${encodeURIComponent(String(symbol))}/timeline?${stringifiedParams}` : `${getBaseUrl()}/v1/news/tickers/${encodeURIComponent(String(symbol))}/timeline`
}

export const privateNewsGetTimeline = async (symbol: string,
    params?: PrivateNewsGetTimelineParams, options?: RequestInit): Promise<NewsTimelineItem[]> => {

  const res = await fetch(getPrivateNewsGetTimelineUrl(symbol,params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: NewsTimelineItem[], status?: number} = new globalThis.Error();
    const data : NewsTimelineItem[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: NewsTimelineItem[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateNewsGetFullTimelineUrl = (symbol: string,
    params?: PrivateNewsGetFullTimelineParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/news/tickers/${encodeURIComponent(String(symbol))}/timeline/full?${stringifiedParams}` : `${getBaseUrl()}/v1/news/tickers/${encodeURIComponent(String(symbol))}/timeline/full`
}

/**
 * 完整个股时间线：新闻、公告、内部人交易、财报卡片。旧timeline接口保留。
 */
export const privateNewsGetFullTimeline = async (symbol: string,
    params?: PrivateNewsGetFullTimelineParams, options?: RequestInit): Promise<NewsFullTimelineItem[]> => {

  const res = await fetch(getPrivateNewsGetFullTimelineUrl(symbol,params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: NewsFullTimelineItem[], status?: number} = new globalThis.Error();
    const data : NewsFullTimelineItem[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: NewsFullTimelineItem[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersListPapersUrl = (params?: PrivatePapersListPapersParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/papers?${stringifiedParams}` : `${getBaseUrl()}/v1/papers`
}

export const privatePapersListPapers = async (params?: PrivatePapersListPapersParams, options?: RequestInit): Promise<PaperPage> => {

  const res = await fetch(getPrivatePapersListPapersUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: PaperPage, status?: number} = new globalThis.Error();
    const data : PaperPage = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: PaperPage = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersGetCatalogUrl = () => {




  return `${getBaseUrl()}/v1/papers/catalog`
}

export const privatePapersGetCatalog = async ( options?: RequestInit): Promise<PapersCatalog> => {

  const res = await fetch(getPrivatePapersGetCatalogUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: PapersCatalog, status?: number} = new globalThis.Error();
    const data : PapersCatalog = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: PapersCatalog = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersGetGraphUrl = () => {




  return `${getBaseUrl()}/v1/papers/graph`
}

export const privatePapersGetGraph = async ( options?: RequestInit): Promise<GraphData> => {

  const res = await fetch(getPrivatePapersGetGraphUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: GraphData, status?: number} = new globalThis.Error();
    const data : GraphData = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: GraphData = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersListUploadsUrl = (params?: PrivatePapersListUploadsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/papers/uploads?${stringifiedParams}` : `${getBaseUrl()}/v1/papers/uploads`
}

export const privatePapersListUploads = async (params?: PrivatePapersListUploadsParams, options?: RequestInit): Promise<Upload[]> => {

  const res = await fetch(getPrivatePapersListUploadsUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Upload[], status?: number} = new globalThis.Error();
    const data : Upload[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Upload[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersUploadArxivUrl = () => {




  return `${getBaseUrl()}/v1/papers/uploads/arxiv`
}

export const privatePapersUploadArxiv = async (paperArxivUploadRequest: PaperArxivUploadRequest, options?: RequestInit): Promise<Upload> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersUploadArxivUrl(),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperArxivUploadRequest)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Upload, status?: number} = new globalThis.Error();
    const data : Upload = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Upload = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersUploadPdfUrl = (filename: string,) => {




  return `${getBaseUrl()}/v1/papers/uploads/${encodeURIComponent(String(filename))}`
}

export const privatePapersUploadPdf = async (filename: string,
    privatePapersUploadPdfBody: Blob, options?: RequestInit): Promise<Upload> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersUploadPdfUrl(filename),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/pdf', ...getHeaders(options?.headers) },
    body: privatePapersUploadPdfBody
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Upload, status?: number} = new globalThis.Error();
    const data : Upload = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Upload = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersRetryUploadUrl = (uploadId: string,) => {




  return `${getBaseUrl()}/v1/papers/uploads/${encodeURIComponent(String(uploadId))}/retry`
}

export const privatePapersRetryUpload = async (uploadId: string, options?: RequestInit): Promise<Upload> => {

  const res = await fetch(getPrivatePapersRetryUploadUrl(uploadId),
  {
    ...options,
    method: 'POST'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Upload, status?: number} = new globalThis.Error();
    const data : Upload = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Upload = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersGetPaperUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}`
}

export const privatePapersGetPaper = async (id: string, options?: RequestInit): Promise<Paper> => {

  const res = await fetch(getPrivatePapersGetPaperUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Paper, status?: number} = new globalThis.Error();
    const data : Paper = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Paper = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersPatchPaperUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}`
}

export const privatePapersPatchPaper = async (id: string,
    paperPatch: PaperPatch, options?: RequestInit): Promise<Paper> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersPatchPaperUrl(id),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperPatch)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Paper, status?: number} = new globalThis.Error();
    const data : Paper = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Paper = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersAskUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/ask`
}

export const privatePapersAsk = async (id: string,
    paperAskRequest: PaperAskRequest, options?: RequestInit): Promise<string> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersAskUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperAskRequest)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: string, status?: number} = new globalThis.Error();
    const data : string = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: string = body !== null ? body : ''
  return data
}



export const getPrivatePapersCreateExplanationUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/explanations`
}

export const privatePapersCreateExplanation = async (id: string,
    paperExplanationCreate: PaperExplanationCreate, options?: RequestInit): Promise<PaperExplanation> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersCreateExplanationUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperExplanationCreate)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: PaperExplanation, status?: number} = new globalThis.Error();
    const data : PaperExplanation = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: PaperExplanation = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersPatchExplanationUrl = (id: string,
    eid: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/explanations/${encodeURIComponent(String(eid))}`
}

export const privatePapersPatchExplanation = async (id: string,
    eid: string,
    paperExplanationPatch: PaperExplanationPatch, options?: RequestInit): Promise<PaperExplanation> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersPatchExplanationUrl(id,eid),
  {
    ...options,
    method: 'PATCH',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperExplanationPatch)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: PaperExplanation, status?: number} = new globalThis.Error();
    const data : PaperExplanation = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: PaperExplanation = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersGetPageUrl = (id: string,
    n: number,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/pages/${encodeURIComponent(String(n))}`
}

export const privatePapersGetPage = async (id: string,
    n: number, options?: RequestInit): Promise<Blob> => {

  const res = await fetch(getPrivatePapersGetPageUrl(id,n),
  {
    ...options,
    method: 'GET'


  }
)

  if (!res.ok) {
    const errorBody = [204, 205, 304].includes(res.status) ? null : await res.text();

    const err: globalThis.Error & {info?: Blob, status?: number} = new globalThis.Error();
    const data : Blob = errorBody ? JSON.parse(errorBody) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const body = [204, 205, 304].includes(res.status) ? null : await res.blob();
  const data: Blob = body as Blob
  return data
}



export const getPrivatePapersGetPrivateUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/private`
}

export const privatePapersGetPrivate = async (id: string, options?: RequestInit): Promise<PaperPrivate> => {

  const res = await fetch(getPrivatePapersGetPrivateUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: PaperPrivate, status?: number} = new globalThis.Error();
    const data : PaperPrivate = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: PaperPrivate = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersPutPrivateUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/private`
}

export const privatePapersPutPrivate = async (id: string,
    paperPrivateWrite: PaperPrivateWrite, options?: RequestInit): Promise<PaperPrivate> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersPutPrivateUrl(id),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperPrivateWrite)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: PaperPrivate, status?: number} = new globalThis.Error();
    const data : PaperPrivate = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: PaperPrivate = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersListReviewsUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/reviews`
}

export const privatePapersListReviews = async (id: string, options?: RequestInit): Promise<Review[]> => {

  const res = await fetch(getPrivatePapersListReviewsUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Review[], status?: number} = new globalThis.Error();
    const data : Review[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Review[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePapersReviseUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/revise`
}

export const privatePapersRevise = async (id: string,
    paperReviseRequest: PaperReviseRequest, options?: RequestInit): Promise<void> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivatePapersReviseUrl(id),
  {
    ...options,
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(paperReviseRequest)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



export const getPrivatePapersGetPdfUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/papers/${encodeURIComponent(String(id))}/source.pdf`
}

export const privatePapersGetPdf = async (id: string, options?: RequestInit): Promise<Blob> => {

  const res = await fetch(getPrivatePapersGetPdfUrl(id),
  {
    ...options,
    method: 'GET'


  }
)

  if (!res.ok) {
    const errorBody = [204, 205, 304].includes(res.status) ? null : await res.text();

    const err: globalThis.Error & {info?: Blob, status?: number} = new globalThis.Error();
    const data : Blob = errorBody ? JSON.parse(errorBody) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const body = [204, 205, 304].includes(res.status) ? null : await res.blob();
  const data: Blob = body as Blob
  return data
}



export const getPublicMarketsListDaysUrl = (params?: PublicMarketsListDaysParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/public/markets/days?${stringifiedParams}` : `${getBaseUrl()}/v1/public/markets/days`
}

/**
 * listDays：市场数据接口。
 */
export const publicMarketsListDays = async (params?: PublicMarketsListDaysParams, options?: RequestInit): Promise<MarketDaySummaryPage> => {

  const res = await fetch(getPublicMarketsListDaysUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: MarketDaySummaryPage, status?: number} = new globalThis.Error();
    const data : MarketDaySummaryPage = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: MarketDaySummaryPage = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsGetLatestDayUrl = () => {




  return `${getBaseUrl()}/v1/public/markets/days/latest`
}

/**
 * getLatestDay：市场数据接口。
 */
export const publicMarketsGetLatestDay = async ( options?: RequestInit): Promise<MarketDay> => {

  const res = await fetch(getPublicMarketsGetLatestDayUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: MarketDay, status?: number} = new globalThis.Error();
    const data : MarketDay = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: MarketDay = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsGetDayUrl = (date: string,) => {




  return `${getBaseUrl()}/v1/public/markets/days/${encodeURIComponent(String(date))}`
}

/**
 * getDay：市场数据接口。
 */
export const publicMarketsGetDay = async (date: string, options?: RequestInit): Promise<MarketDay> => {

  const res = await fetch(getPublicMarketsGetDayUrl(date),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: MarketDay, status?: number} = new globalThis.Error();
    const data : MarketDay = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: MarketDay = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsListEventsUrl = (params?: PublicMarketsListEventsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/public/markets/events?${stringifiedParams}` : `${getBaseUrl()}/v1/public/markets/events`
}

/**
 * listEvents：市场数据接口。
 */
export const publicMarketsListEvents = async (params?: PublicMarketsListEventsParams, options?: RequestInit): Promise<MarketEvent[]> => {

  const res = await fetch(getPublicMarketsListEventsUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: MarketEvent[], status?: number} = new globalThis.Error();
    const data : MarketEvent[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: MarketEvent[] = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsListHypothesesUrl = (params?: PublicMarketsListHypothesesParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/public/markets/hypotheses?${stringifiedParams}` : `${getBaseUrl()}/v1/public/markets/hypotheses`
}

/**
 * listHypotheses：市场数据接口。
 */
export const publicMarketsListHypotheses = async (params?: PublicMarketsListHypothesesParams, options?: RequestInit): Promise<HypothesisPage> => {

  const res = await fetch(getPublicMarketsListHypothesesUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: HypothesisPage, status?: number} = new globalThis.Error();
    const data : HypothesisPage = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: HypothesisPage = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsListIndexBarsUrl = (code: string,
    params?: PublicMarketsListIndexBarsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/public/markets/indices/${encodeURIComponent(String(code))}/bars?${stringifiedParams}` : `${getBaseUrl()}/v1/public/markets/indices/${encodeURIComponent(String(code))}/bars`
}

/**
 * listIndexBars：市场数据接口。
 */
export const publicMarketsListIndexBars = async (code: string,
    params?: PublicMarketsListIndexBarsParams, options?: RequestInit): Promise<IndexBar[]> => {

  const res = await fetch(getPublicMarketsListIndexBarsUrl(code,params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: IndexBar[], status?: number} = new globalThis.Error();
    const data : IndexBar[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: IndexBar[] = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsGetReferenceUrl = () => {




  return `${getBaseUrl()}/v1/public/markets/reference`
}

/**
 * getReference：市场数据接口。
 */
export const publicMarketsGetReference = async ( options?: RequestInit): Promise<MarketReference> => {

  const res = await fetch(getPublicMarketsGetReferenceUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: MarketReference, status?: number} = new globalThis.Error();
    const data : MarketReference = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: MarketReference = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsListWeekliesUrl = () => {




  return `${getBaseUrl()}/v1/public/markets/weeklies`
}

/**
 * listWeeklies：市场数据接口。
 */
export const publicMarketsListWeeklies = async ( options?: RequestInit): Promise<WeeklySummary[]> => {

  const res = await fetch(getPublicMarketsListWeekliesUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: WeeklySummary[], status?: number} = new globalThis.Error();
    const data : WeeklySummary[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: WeeklySummary[] = body ? JSON.parse(body) : {}
  return data
}



export const getPublicMarketsGetWeeklyUrl = (date: string,) => {




  return `${getBaseUrl()}/v1/public/markets/weeklies/${encodeURIComponent(String(date))}`
}

/**
 * getWeekly：市场数据接口。
 */
export const publicMarketsGetWeekly = async (date: string, options?: RequestInit): Promise<WeeklyReport> => {

  const res = await fetch(getPublicMarketsGetWeeklyUrl(date),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: WeeklyReport, status?: number} = new globalThis.Error();
    const data : WeeklyReport = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: WeeklyReport = body ? JSON.parse(body) : {}
  return data
}



export const getPublicPapersGetCatalogUrl = () => {




  return `${getBaseUrl()}/v1/public/papers/catalog`
}

export const publicPapersGetCatalog = async ( options?: RequestInit): Promise<PapersCatalog> => {

  const res = await fetch(getPublicPapersGetCatalogUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: PapersCatalog, status?: number} = new globalThis.Error();
    const data : PapersCatalog = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: PapersCatalog = body ? JSON.parse(body) : {}
  return data
}



export const getPublicPapersGetGraphUrl = () => {




  return `${getBaseUrl()}/v1/public/papers/graph`
}

export const publicPapersGetGraph = async ( options?: RequestInit): Promise<GraphData> => {

  const res = await fetch(getPublicPapersGetGraphUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: GraphData, status?: number} = new globalThis.Error();
    const data : GraphData = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: GraphData = body ? JSON.parse(body) : {}
  return data
}



export const getPublicPapersGetSearchIndexUrl = () => {




  return `${getBaseUrl()}/v1/public/papers/search-index`
}

export const publicPapersGetSearchIndex = async ( options?: RequestInit): Promise<SearchIndex> => {

  const res = await fetch(getPublicPapersGetSearchIndexUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: SearchIndex, status?: number} = new globalThis.Error();
    const data : SearchIndex = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: SearchIndex = body ? JSON.parse(body) : {}
  return data
}



export const getPublicPapersGetPaperUrl = (id: string,) => {




  return `${getBaseUrl()}/v1/public/papers/${encodeURIComponent(String(id))}`
}

export const publicPapersGetPaper = async (id: string, options?: RequestInit): Promise<Paper> => {

  const res = await fetch(getPublicPapersGetPaperUrl(id),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: Paper, status?: number} = new globalThis.Error();
    const data : Paper = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: Paper = body ? JSON.parse(body) : {}
  return data
}



export const getPrivatePlatformListRunsUrl = (params?: PrivatePlatformListRunsParams,) => {
  const normalizedParams = new URLSearchParams();

  Object.entries(params || {}).forEach(([key, value]) => {

    if (value !== undefined) {
      normalizedParams.append(key, value === null ? 'null' : String(value))
    }
  });

  const stringifiedParams = normalizedParams.toString();

  return stringifiedParams.length > 0 ? `${getBaseUrl()}/v1/runs?${stringifiedParams}` : `${getBaseUrl()}/v1/runs`
}

/**
 * 运行记录（runs 表），最新的在前
 */
export const privatePlatformListRuns = async (params?: PrivatePlatformListRunsParams, options?: RequestInit): Promise<RunPage> => {

  const res = await fetch(getPrivatePlatformListRunsUrl(params),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: RunPage, status?: number} = new globalThis.Error();
    const data : RunPage = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: RunPage = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateWatchlistListUrl = () => {




  return `${getBaseUrl()}/v1/watchlist`
}

/**
 * 全部自选股（含停用的）
 */
export const privateWatchlistList = async ( options?: RequestInit): Promise<WatchItem[]> => {

  const res = await fetch(getPrivateWatchlistListUrl(),
  {
    ...options,
    method: 'GET'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: WatchItem[], status?: number} = new globalThis.Error();
    const data : WatchItem[] = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: WatchItem[] = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateWatchlistPutUrl = (symbol: string,) => {




  return `${getBaseUrl()}/v1/watchlist/${encodeURIComponent(String(symbol))}`
}

/**
 * 新增或修改一只自选股（按代码覆盖）；body.symbol 必须等于路径里的 symbol
 */
export const privateWatchlistPut = async (symbol: string,
    watchItem: WatchItem, options?: RequestInit): Promise<WatchItem> => {

    const getHeaders = (h?: NonNullable<RequestInit['headers']>): Record<string, string | readonly string[]> => {
    if (!h) return {};
    if (h instanceof Headers) return Object.fromEntries(h.entries());
    if (Symbol.iterator in h) {
      return Object.fromEntries(
        Array.from(h as Iterable<Iterable<string>>, (entry) => Array.from(entry) as [string, string]),
      );
    }
    const headers: Record<string, string | readonly string[]> = {};
    for (const [name, value] of Object.entries<string | readonly string[] | undefined>(h)) {
      if (value !== undefined) headers[name] = value;
    }
    return headers;
  };
const res = await fetch(getPrivateWatchlistPutUrl(symbol),
  {
    ...options,
    method: 'PUT',
    headers: { 'Content-Type': 'application/json', ...getHeaders(options?.headers) },
    body: JSON.stringify(watchItem)
  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: WatchItem, status?: number} = new globalThis.Error();
    const data : WatchItem = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: WatchItem = body ? JSON.parse(body) : {}
  return data
}



export const getPrivateWatchlistRemoveUrl = (symbol: string,) => {




  return `${getBaseUrl()}/v1/watchlist/${encodeURIComponent(String(symbol))}`
}

/**
 * 删除一只自选股
 */
export const privateWatchlistRemove = async (symbol: string, options?: RequestInit): Promise<void> => {

  const res = await fetch(getPrivateWatchlistRemoveUrl(symbol),
  {
    ...options,
    method: 'DELETE'


  }
)


  const body = [204, 205, 304].includes(res.status) ? null : await res.text();
  if (!res.ok) {

    const err: globalThis.Error & {info?: void, status?: number} = new globalThis.Error();
    const data : void = body ? JSON.parse(body) : {}
    err.info = data;
    err.status = res.status;
    throw err;
  }
  const data: void = body ? JSON.parse(body) : undefined
  return data
}



