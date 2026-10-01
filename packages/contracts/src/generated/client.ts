// 由 contracts 生成，勿手改（mise run gen）
import {
  getBaseUrl
} from '../runtime/base-url';

import type {
  AiCall,
  AiUsageSummary,
  CapabilityInfo,
  DocumentKey,
  EvalResult,
  ExportPage,
  ExportTable,
  Health,
  InternalPlatformExportTableParams,
  InternalPlatformPutDocumentBody,
  PrivatePlatformGetAiUsageParams,
  PrivatePlatformListEvalsParams,
  PrivatePlatformListRunsParams,
  Run,
  RunPage,
  WatchItem
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



