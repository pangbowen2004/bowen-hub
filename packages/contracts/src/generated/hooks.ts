// 由 contracts 生成，勿手改（mise run gen）
import {
  useMutation,
  useQuery
} from '@tanstack/react-query';
import type {
  DataTag,
  DefinedInitialDataOptions,
  DefinedUseQueryResult,
  MutationFunction,
  QueryClient,
  QueryFunction,
  QueryKey,
  UndefinedInitialDataOptions,
  UseMutationOptions,
  UseMutationResult,
  UseQueryOptions,
  UseQueryResult
} from '@tanstack/react-query';

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
  Problem,
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


type AwaitedInput<T> = PromiseLike<T> | T;

      type Awaited<O> = O extends AwaitedInput<infer T> ? T : never;




const withQueryKey = <T extends object, K>(query: T, queryKey: K): T & { queryKey: K } => {
  const result = { queryKey } as T & { queryKey: K };
  for (const key of Object.keys(query)) {
    // The explicit queryKey always wins, matching the previous
    // `{ ...query, queryKey }` spread where it was set last.
    if (key === 'queryKey') continue;
    Object.defineProperty(result, key, {
      enumerable: true,
      configurable: true,
      get: () => (query as Record<string, unknown>)[key],
    });
  }
  return result;
};

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





export const getPrivatePlatformGetAiUsageQueryKey = (params?: PrivatePlatformGetAiUsageParams,) => {
    return [
    `${getBaseUrl()}/v1/ai/usage`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivatePlatformGetAiUsageQueryOptions = <TData = Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PrivatePlatformGetAiUsageParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePlatformGetAiUsageQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>> = ({ signal }) => privatePlatformGetAiUsage(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePlatformGetAiUsageQueryResult = NonNullable<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>>
export type PrivatePlatformGetAiUsageQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePlatformGetAiUsage<TData = Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PrivatePlatformGetAiUsageParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformGetAiUsage>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformGetAiUsage>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformGetAiUsage<TData = Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformGetAiUsageParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformGetAiUsage>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformGetAiUsage>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformGetAiUsage<TData = Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformGetAiUsageParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePlatformGetAiUsage<TData = Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformGetAiUsageParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformGetAiUsage>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePlatformGetAiUsageQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePlatformListCapabilitiesQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/capabilities`
    ] as const;
    }


export const getPrivatePlatformListCapabilitiesQueryOptions = <TData = Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePlatformListCapabilitiesQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePlatformListCapabilities>>> = ({ signal }) => privatePlatformListCapabilities({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePlatformListCapabilitiesQueryResult = NonNullable<Awaited<ReturnType<typeof privatePlatformListCapabilities>>>
export type PrivatePlatformListCapabilitiesQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePlatformListCapabilities<TData = Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformListCapabilities>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformListCapabilities>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformListCapabilities<TData = Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformListCapabilities>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformListCapabilities>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformListCapabilities<TData = Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePlatformListCapabilities<TData = Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListCapabilities>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePlatformListCapabilitiesQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePlatformListEvalsQueryKey = (params?: PrivatePlatformListEvalsParams,) => {
    return [
    `${getBaseUrl()}/v1/evals`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivatePlatformListEvalsQueryOptions = <TData = Awaited<ReturnType<typeof privatePlatformListEvals>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PrivatePlatformListEvalsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListEvals>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePlatformListEvalsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePlatformListEvals>>> = ({ signal }) => privatePlatformListEvals(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListEvals>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePlatformListEvalsQueryResult = NonNullable<Awaited<ReturnType<typeof privatePlatformListEvals>>>
export type PrivatePlatformListEvalsQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePlatformListEvals<TData = Awaited<ReturnType<typeof privatePlatformListEvals>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PrivatePlatformListEvalsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListEvals>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformListEvals>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformListEvals>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformListEvals<TData = Awaited<ReturnType<typeof privatePlatformListEvals>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformListEvalsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListEvals>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformListEvals>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformListEvals>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformListEvals<TData = Awaited<ReturnType<typeof privatePlatformListEvals>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformListEvalsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListEvals>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePlatformListEvals<TData = Awaited<ReturnType<typeof privatePlatformListEvals>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformListEvalsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListEvals>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePlatformListEvalsQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getHealthCheckGetQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/health`
    ] as const;
    }


export const getHealthCheckGetQueryOptions = <TData = Awaited<ReturnType<typeof healthCheckGet>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof healthCheckGet>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getHealthCheckGetQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof healthCheckGet>>> = ({ signal }) => healthCheckGet({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof healthCheckGet>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type HealthCheckGetQueryResult = NonNullable<Awaited<ReturnType<typeof healthCheckGet>>>
export type HealthCheckGetQueryError = globalThis.Error & { info?: Problem; status?: number }


export function useHealthCheckGet<TData = Awaited<ReturnType<typeof healthCheckGet>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof healthCheckGet>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof healthCheckGet>>,
          TError,
          Awaited<ReturnType<typeof healthCheckGet>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useHealthCheckGet<TData = Awaited<ReturnType<typeof healthCheckGet>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof healthCheckGet>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof healthCheckGet>>,
          TError,
          Awaited<ReturnType<typeof healthCheckGet>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useHealthCheckGet<TData = Awaited<ReturnType<typeof healthCheckGet>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof healthCheckGet>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function useHealthCheckGet<TData = Awaited<ReturnType<typeof healthCheckGet>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof healthCheckGet>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getHealthCheckGetQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getInternalPlatformBatchAiCallsMutationKey = () => ['internalPlatformBatchAiCalls'] as const;

export const getInternalPlatformBatchAiCallsMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformBatchAiCalls>>, TError,InternalPlatformBatchAiCallsMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPlatformBatchAiCalls>>, TError,InternalPlatformBatchAiCallsMutationVariables, TContext> => {

const mutationKey = getInternalPlatformBatchAiCallsMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPlatformBatchAiCalls>>, InternalPlatformBatchAiCallsMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalPlatformBatchAiCalls(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPlatformBatchAiCallsMutationResult = NonNullable<Awaited<ReturnType<typeof internalPlatformBatchAiCalls>>>
    export type InternalPlatformBatchAiCallsMutationBody = AiCall[]
    export type InternalPlatformBatchAiCallsMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPlatformBatchAiCallsMutationVariables = {data: AiCall[]}

    export const useInternalPlatformBatchAiCalls = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformBatchAiCalls>>, TError,InternalPlatformBatchAiCallsMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPlatformBatchAiCalls>>,
        TError,
        InternalPlatformBatchAiCallsMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPlatformBatchAiCallsMutationOptions(options), queryClient);
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





export const getInternalPlatformPutDocumentMutationKey = () => ['internalPlatformPutDocument'] as const;

export const getInternalPlatformPutDocumentMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformPutDocument>>, TError,InternalPlatformPutDocumentMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPlatformPutDocument>>, TError,InternalPlatformPutDocumentMutationVariables, TContext> => {

const mutationKey = getInternalPlatformPutDocumentMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPlatformPutDocument>>, InternalPlatformPutDocumentMutationVariables> = (props) => {
          const {key,data} = props ?? {};

          return  internalPlatformPutDocument(key,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPlatformPutDocumentMutationResult = NonNullable<Awaited<ReturnType<typeof internalPlatformPutDocument>>>
    export type InternalPlatformPutDocumentMutationBody = InternalPlatformPutDocumentBody
    export type InternalPlatformPutDocumentMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPlatformPutDocumentMutationVariables = {key: DocumentKey;data: InternalPlatformPutDocumentBody}

    export const useInternalPlatformPutDocument = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformPutDocument>>, TError,InternalPlatformPutDocumentMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPlatformPutDocument>>,
        TError,
        InternalPlatformPutDocumentMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPlatformPutDocumentMutationOptions(options), queryClient);
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





export const getInternalPlatformBatchEvalResultsMutationKey = () => ['internalPlatformBatchEvalResults'] as const;

export const getInternalPlatformBatchEvalResultsMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformBatchEvalResults>>, TError,InternalPlatformBatchEvalResultsMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPlatformBatchEvalResults>>, TError,InternalPlatformBatchEvalResultsMutationVariables, TContext> => {

const mutationKey = getInternalPlatformBatchEvalResultsMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPlatformBatchEvalResults>>, InternalPlatformBatchEvalResultsMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalPlatformBatchEvalResults(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPlatformBatchEvalResultsMutationResult = NonNullable<Awaited<ReturnType<typeof internalPlatformBatchEvalResults>>>
    export type InternalPlatformBatchEvalResultsMutationBody = EvalResult[]
    export type InternalPlatformBatchEvalResultsMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPlatformBatchEvalResultsMutationVariables = {data: EvalResult[]}

    export const useInternalPlatformBatchEvalResults = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformBatchEvalResults>>, TError,InternalPlatformBatchEvalResultsMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPlatformBatchEvalResults>>,
        TError,
        InternalPlatformBatchEvalResultsMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPlatformBatchEvalResultsMutationOptions(options), queryClient);
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





export const getInternalPlatformExportTableQueryKey = (table: ExportTable,
    params?: InternalPlatformExportTableParams,) => {
    return [
    `${getBaseUrl()}/v1/internal/export/${table}`, ...(params ? [params] : [])
    ] as const;
    }


export const getInternalPlatformExportTableQueryOptions = <TData = Awaited<ReturnType<typeof internalPlatformExportTable>>, TError = globalThis.Error & { info?: Problem; status?: number }>(table: ExportTable,
    params?: InternalPlatformExportTableParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPlatformExportTable>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getInternalPlatformExportTableQueryKey(table,params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof internalPlatformExportTable>>> = ({ signal }) => internalPlatformExportTable(table,params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: table !== null && table !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof internalPlatformExportTable>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type InternalPlatformExportTableQueryResult = NonNullable<Awaited<ReturnType<typeof internalPlatformExportTable>>>
export type InternalPlatformExportTableQueryError = globalThis.Error & { info?: Problem; status?: number }


export function useInternalPlatformExportTable<TData = Awaited<ReturnType<typeof internalPlatformExportTable>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 table: ExportTable,
    params: undefined |  InternalPlatformExportTableParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPlatformExportTable>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPlatformExportTable>>,
          TError,
          Awaited<ReturnType<typeof internalPlatformExportTable>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPlatformExportTable<TData = Awaited<ReturnType<typeof internalPlatformExportTable>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 table: ExportTable,
    params?: InternalPlatformExportTableParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPlatformExportTable>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPlatformExportTable>>,
          TError,
          Awaited<ReturnType<typeof internalPlatformExportTable>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPlatformExportTable<TData = Awaited<ReturnType<typeof internalPlatformExportTable>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 table: ExportTable,
    params?: InternalPlatformExportTableParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPlatformExportTable>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function useInternalPlatformExportTable<TData = Awaited<ReturnType<typeof internalPlatformExportTable>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 table: ExportTable,
    params?: InternalPlatformExportTableParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPlatformExportTable>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getInternalPlatformExportTableQueryOptions(table,params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getInternalMarketsPutDayMutationKey = () => ['internalMarketsPutDay'] as const;

export const getInternalMarketsPutDayMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutDay>>, TError,InternalMarketsPutDayMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutDay>>, TError,InternalMarketsPutDayMutationVariables, TContext> => {

const mutationKey = getInternalMarketsPutDayMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalMarketsPutDay>>, InternalMarketsPutDayMutationVariables> = (props) => {
          const {date,data} = props ?? {};

          return  internalMarketsPutDay(date,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalMarketsPutDayMutationResult = NonNullable<Awaited<ReturnType<typeof internalMarketsPutDay>>>
    export type InternalMarketsPutDayMutationBody = MarketDayWrite
    export type InternalMarketsPutDayMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalMarketsPutDayMutationVariables = {date: string;data: MarketDayWrite}

    export const useInternalMarketsPutDay = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutDay>>, TError,InternalMarketsPutDayMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalMarketsPutDay>>,
        TError,
        InternalMarketsPutDayMutationVariables,
        TContext
      > => {
      return useMutation(getInternalMarketsPutDayMutationOptions(options), queryClient);
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





export const getInternalMarketsPutEventsMutationKey = () => ['internalMarketsPutEvents'] as const;

export const getInternalMarketsPutEventsMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutEvents>>, TError,InternalMarketsPutEventsMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutEvents>>, TError,InternalMarketsPutEventsMutationVariables, TContext> => {

const mutationKey = getInternalMarketsPutEventsMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalMarketsPutEvents>>, InternalMarketsPutEventsMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalMarketsPutEvents(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalMarketsPutEventsMutationResult = NonNullable<Awaited<ReturnType<typeof internalMarketsPutEvents>>>
    export type InternalMarketsPutEventsMutationBody = MarketEvent[]
    export type InternalMarketsPutEventsMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalMarketsPutEventsMutationVariables = {data: MarketEvent[]}

    export const useInternalMarketsPutEvents = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutEvents>>, TError,InternalMarketsPutEventsMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalMarketsPutEvents>>,
        TError,
        InternalMarketsPutEventsMutationVariables,
        TContext
      > => {
      return useMutation(getInternalMarketsPutEventsMutationOptions(options), queryClient);
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





export const getInternalMarketsPutHypothesesMutationKey = () => ['internalMarketsPutHypotheses'] as const;

export const getInternalMarketsPutHypothesesMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutHypotheses>>, TError,InternalMarketsPutHypothesesMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutHypotheses>>, TError,InternalMarketsPutHypothesesMutationVariables, TContext> => {

const mutationKey = getInternalMarketsPutHypothesesMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalMarketsPutHypotheses>>, InternalMarketsPutHypothesesMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalMarketsPutHypotheses(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalMarketsPutHypothesesMutationResult = NonNullable<Awaited<ReturnType<typeof internalMarketsPutHypotheses>>>
    export type InternalMarketsPutHypothesesMutationBody = Hypothesis[]
    export type InternalMarketsPutHypothesesMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalMarketsPutHypothesesMutationVariables = {data: Hypothesis[]}

    export const useInternalMarketsPutHypotheses = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutHypotheses>>, TError,InternalMarketsPutHypothesesMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalMarketsPutHypotheses>>,
        TError,
        InternalMarketsPutHypothesesMutationVariables,
        TContext
      > => {
      return useMutation(getInternalMarketsPutHypothesesMutationOptions(options), queryClient);
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





export const getInternalMarketsPutIndexBarsMutationKey = () => ['internalMarketsPutIndexBars'] as const;

export const getInternalMarketsPutIndexBarsMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutIndexBars>>, TError,InternalMarketsPutIndexBarsMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutIndexBars>>, TError,InternalMarketsPutIndexBarsMutationVariables, TContext> => {

const mutationKey = getInternalMarketsPutIndexBarsMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalMarketsPutIndexBars>>, InternalMarketsPutIndexBarsMutationVariables> = (props) => {
          const {code,data} = props ?? {};

          return  internalMarketsPutIndexBars(code,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalMarketsPutIndexBarsMutationResult = NonNullable<Awaited<ReturnType<typeof internalMarketsPutIndexBars>>>
    export type InternalMarketsPutIndexBarsMutationBody = IndexBar[]
    export type InternalMarketsPutIndexBarsMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalMarketsPutIndexBarsMutationVariables = {code: string;data: IndexBar[]}

    export const useInternalMarketsPutIndexBars = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutIndexBars>>, TError,InternalMarketsPutIndexBarsMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalMarketsPutIndexBars>>,
        TError,
        InternalMarketsPutIndexBarsMutationVariables,
        TContext
      > => {
      return useMutation(getInternalMarketsPutIndexBarsMutationOptions(options), queryClient);
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





export const getInternalMarketsPutWeeklyMutationKey = () => ['internalMarketsPutWeekly'] as const;

export const getInternalMarketsPutWeeklyMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutWeekly>>, TError,InternalMarketsPutWeeklyMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutWeekly>>, TError,InternalMarketsPutWeeklyMutationVariables, TContext> => {

const mutationKey = getInternalMarketsPutWeeklyMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalMarketsPutWeekly>>, InternalMarketsPutWeeklyMutationVariables> = (props) => {
          const {date,data} = props ?? {};

          return  internalMarketsPutWeekly(date,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalMarketsPutWeeklyMutationResult = NonNullable<Awaited<ReturnType<typeof internalMarketsPutWeekly>>>
    export type InternalMarketsPutWeeklyMutationBody = WeeklyReport
    export type InternalMarketsPutWeeklyMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalMarketsPutWeeklyMutationVariables = {date: string;data: WeeklyReport}

    export const useInternalMarketsPutWeekly = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalMarketsPutWeekly>>, TError,InternalMarketsPutWeeklyMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalMarketsPutWeekly>>,
        TError,
        InternalMarketsPutWeeklyMutationVariables,
        TContext
      > => {
      return useMutation(getInternalMarketsPutWeeklyMutationOptions(options), queryClient);
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





export const getInternalNewsPutArticlesMutationKey = () => ['internalNewsPutArticles'] as const;

export const getInternalNewsPutArticlesMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutArticles>>, TError,InternalNewsPutArticlesMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutArticles>>, TError,InternalNewsPutArticlesMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutArticlesMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutArticles>>, InternalNewsPutArticlesMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalNewsPutArticles(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutArticlesMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutArticles>>>
    export type InternalNewsPutArticlesMutationBody = Article[]
    export type InternalNewsPutArticlesMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutArticlesMutationVariables = {data: Article[]}

    export const useInternalNewsPutArticles = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutArticles>>, TError,InternalNewsPutArticlesMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutArticles>>,
        TError,
        InternalNewsPutArticlesMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutArticlesMutationOptions(options), queryClient);
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





export const getInternalNewsPruneArticlesMutationKey = () => ['internalNewsPruneArticles'] as const;

export const getInternalNewsPruneArticlesMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPruneArticles>>, TError,InternalNewsPruneArticlesMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPruneArticles>>, TError,InternalNewsPruneArticlesMutationVariables, TContext> => {

const mutationKey = getInternalNewsPruneArticlesMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPruneArticles>>, InternalNewsPruneArticlesMutationVariables> = (props) => {
          const {params} = props ?? {};

          return  internalNewsPruneArticles(params,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPruneArticlesMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPruneArticles>>>

    export type InternalNewsPruneArticlesMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPruneArticlesMutationVariables = {params: InternalNewsPruneArticlesParams}

    export const useInternalNewsPruneArticles = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPruneArticles>>, TError,InternalNewsPruneArticlesMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPruneArticles>>,
        TError,
        InternalNewsPruneArticlesMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPruneArticlesMutationOptions(options), queryClient);
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





export const getInternalNewsPutCalendarMutationKey = () => ['internalNewsPutCalendar'] as const;

export const getInternalNewsPutCalendarMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutCalendar>>, TError,InternalNewsPutCalendarMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutCalendar>>, TError,InternalNewsPutCalendarMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutCalendarMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutCalendar>>, InternalNewsPutCalendarMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalNewsPutCalendar(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutCalendarMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutCalendar>>>
    export type InternalNewsPutCalendarMutationBody = CalendarEvent[]
    export type InternalNewsPutCalendarMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutCalendarMutationVariables = {data: CalendarEvent[]}

    export const useInternalNewsPutCalendar = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutCalendar>>, TError,InternalNewsPutCalendarMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutCalendar>>,
        TError,
        InternalNewsPutCalendarMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutCalendarMutationOptions(options), queryClient);
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





export const getInternalNewsPutEarningsCardsMutationKey = () => ['internalNewsPutEarningsCards'] as const;

export const getInternalNewsPutEarningsCardsMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEarningsCards>>, TError,InternalNewsPutEarningsCardsMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEarningsCards>>, TError,InternalNewsPutEarningsCardsMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutEarningsCardsMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutEarningsCards>>, InternalNewsPutEarningsCardsMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalNewsPutEarningsCards(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutEarningsCardsMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutEarningsCards>>>
    export type InternalNewsPutEarningsCardsMutationBody = EarningsCard[]
    export type InternalNewsPutEarningsCardsMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutEarningsCardsMutationVariables = {data: EarningsCard[]}

    export const useInternalNewsPutEarningsCards = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEarningsCards>>, TError,InternalNewsPutEarningsCardsMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutEarningsCards>>,
        TError,
        InternalNewsPutEarningsCardsMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutEarningsCardsMutationOptions(options), queryClient);
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





export const getInternalNewsPutEditionMutationKey = () => ['internalNewsPutEdition'] as const;

export const getInternalNewsPutEditionMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEdition>>, TError,InternalNewsPutEditionMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEdition>>, TError,InternalNewsPutEditionMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutEditionMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutEdition>>, InternalNewsPutEditionMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  internalNewsPutEdition(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutEditionMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutEdition>>>
    export type InternalNewsPutEditionMutationBody = Edition
    export type InternalNewsPutEditionMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutEditionMutationVariables = {id: string;data: Edition}

    export const useInternalNewsPutEdition = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEdition>>, TError,InternalNewsPutEditionMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutEdition>>,
        TError,
        InternalNewsPutEditionMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutEditionMutationOptions(options), queryClient);
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





export const getInternalNewsPutEditionHtmlMutationKey = () => ['internalNewsPutEditionHtml'] as const;

export const getInternalNewsPutEditionHtmlMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEditionHtml>>, TError,InternalNewsPutEditionHtmlMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEditionHtml>>, TError,InternalNewsPutEditionHtmlMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutEditionHtmlMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutEditionHtml>>, InternalNewsPutEditionHtmlMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  internalNewsPutEditionHtml(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutEditionHtmlMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutEditionHtml>>>
    export type InternalNewsPutEditionHtmlMutationBody = string
    export type InternalNewsPutEditionHtmlMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutEditionHtmlMutationVariables = {id: string;data: string}

    export const useInternalNewsPutEditionHtml = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutEditionHtml>>, TError,InternalNewsPutEditionHtmlMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutEditionHtml>>,
        TError,
        InternalNewsPutEditionHtmlMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutEditionHtmlMutationOptions(options), queryClient);
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





export const getInternalNewsPutFilingsMutationKey = () => ['internalNewsPutFilings'] as const;

export const getInternalNewsPutFilingsMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutFilings>>, TError,InternalNewsPutFilingsMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutFilings>>, TError,InternalNewsPutFilingsMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutFilingsMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutFilings>>, InternalNewsPutFilingsMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalNewsPutFilings(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutFilingsMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutFilings>>>
    export type InternalNewsPutFilingsMutationBody = Filing[]
    export type InternalNewsPutFilingsMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutFilingsMutationVariables = {data: Filing[]}

    export const useInternalNewsPutFilings = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutFilings>>, TError,InternalNewsPutFilingsMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutFilings>>,
        TError,
        InternalNewsPutFilingsMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutFilingsMutationOptions(options), queryClient);
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





export const getInternalNewsPutInsiderTradesMutationKey = () => ['internalNewsPutInsiderTrades'] as const;

export const getInternalNewsPutInsiderTradesMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutInsiderTrades>>, TError,InternalNewsPutInsiderTradesMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutInsiderTrades>>, TError,InternalNewsPutInsiderTradesMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutInsiderTradesMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutInsiderTrades>>, InternalNewsPutInsiderTradesMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalNewsPutInsiderTrades(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutInsiderTradesMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutInsiderTrades>>>
    export type InternalNewsPutInsiderTradesMutationBody = InsiderTrade[]
    export type InternalNewsPutInsiderTradesMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutInsiderTradesMutationVariables = {data: InsiderTrade[]}

    export const useInternalNewsPutInsiderTrades = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutInsiderTrades>>, TError,InternalNewsPutInsiderTradesMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutInsiderTrades>>,
        TError,
        InternalNewsPutInsiderTradesMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutInsiderTradesMutationOptions(options), queryClient);
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





export const getInternalNewsPutSourceHealthMutationKey = () => ['internalNewsPutSourceHealth'] as const;

export const getInternalNewsPutSourceHealthMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutSourceHealth>>, TError,InternalNewsPutSourceHealthMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutSourceHealth>>, TError,InternalNewsPutSourceHealthMutationVariables, TContext> => {

const mutationKey = getInternalNewsPutSourceHealthMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalNewsPutSourceHealth>>, InternalNewsPutSourceHealthMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  internalNewsPutSourceHealth(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalNewsPutSourceHealthMutationResult = NonNullable<Awaited<ReturnType<typeof internalNewsPutSourceHealth>>>
    export type InternalNewsPutSourceHealthMutationBody = NewsSourceHealth
    export type InternalNewsPutSourceHealthMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalNewsPutSourceHealthMutationVariables = {id: string;data: NewsSourceHealth}

    export const useInternalNewsPutSourceHealth = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalNewsPutSourceHealth>>, TError,InternalNewsPutSourceHealthMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalNewsPutSourceHealth>>,
        TError,
        InternalNewsPutSourceHealthMutationVariables,
        TContext
      > => {
      return useMutation(getInternalNewsPutSourceHealthMutationOptions(options), queryClient);
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





export const getInternalPapersGetUploadQueryKey = (uploadId: string,) => {
    return [
    `${getBaseUrl()}/v1/internal/papers/uploads/${uploadId}`
    ] as const;
    }


export const getInternalPapersGetUploadQueryOptions = <TData = Awaited<ReturnType<typeof internalPapersGetUpload>>, TError = globalThis.Error & { info?: Problem; status?: number }>(uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUpload>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getInternalPapersGetUploadQueryKey(uploadId);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof internalPapersGetUpload>>> = ({ signal }) => internalPapersGetUpload(uploadId, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: uploadId !== null && uploadId !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUpload>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type InternalPapersGetUploadQueryResult = NonNullable<Awaited<ReturnType<typeof internalPapersGetUpload>>>
export type InternalPapersGetUploadQueryError = globalThis.Error & { info?: Problem; status?: number }


export function useInternalPapersGetUpload<TData = Awaited<ReturnType<typeof internalPapersGetUpload>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUpload>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPapersGetUpload>>,
          TError,
          Awaited<ReturnType<typeof internalPapersGetUpload>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPapersGetUpload<TData = Awaited<ReturnType<typeof internalPapersGetUpload>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUpload>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPapersGetUpload>>,
          TError,
          Awaited<ReturnType<typeof internalPapersGetUpload>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPapersGetUpload<TData = Awaited<ReturnType<typeof internalPapersGetUpload>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUpload>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function useInternalPapersGetUpload<TData = Awaited<ReturnType<typeof internalPapersGetUpload>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUpload>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getInternalPapersGetUploadQueryOptions(uploadId,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getInternalPapersPatchUploadMutationKey = () => ['internalPapersPatchUpload'] as const;

export const getInternalPapersPatchUploadMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPatchUpload>>, TError,InternalPapersPatchUploadMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPapersPatchUpload>>, TError,InternalPapersPatchUploadMutationVariables, TContext> => {

const mutationKey = getInternalPapersPatchUploadMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPapersPatchUpload>>, InternalPapersPatchUploadMutationVariables> = (props) => {
          const {uploadId,data} = props ?? {};

          return  internalPapersPatchUpload(uploadId,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPapersPatchUploadMutationResult = NonNullable<Awaited<ReturnType<typeof internalPapersPatchUpload>>>
    export type InternalPapersPatchUploadMutationBody = PaperUploadPatch
    export type InternalPapersPatchUploadMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPapersPatchUploadMutationVariables = {uploadId: string;data: PaperUploadPatch}

    export const useInternalPapersPatchUpload = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPatchUpload>>, TError,InternalPapersPatchUploadMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPapersPatchUpload>>,
        TError,
        InternalPapersPatchUploadMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPapersPatchUploadMutationOptions(options), queryClient);
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





export const getInternalPapersGetUploadFileQueryKey = (uploadId: string,) => {
    return [
    `${getBaseUrl()}/v1/internal/papers/uploads/${uploadId}/file`
    ] as const;
    }


export const getInternalPapersGetUploadFileQueryOptions = <TData = Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getInternalPapersGetUploadFileQueryKey(uploadId);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof internalPapersGetUploadFile>>> = ({ signal }) => internalPapersGetUploadFile(uploadId, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: uploadId !== null && uploadId !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type InternalPapersGetUploadFileQueryResult = NonNullable<Awaited<ReturnType<typeof internalPapersGetUploadFile>>>
export type InternalPapersGetUploadFileQueryError = globalThis.Error & { info?: Problem; status?: number }


export function useInternalPapersGetUploadFile<TData = Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPapersGetUploadFile>>,
          TError,
          Awaited<ReturnType<typeof internalPapersGetUploadFile>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPapersGetUploadFile<TData = Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPapersGetUploadFile>>,
          TError,
          Awaited<ReturnType<typeof internalPapersGetUploadFile>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPapersGetUploadFile<TData = Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function useInternalPapersGetUploadFile<TData = Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 uploadId: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetUploadFile>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getInternalPapersGetUploadFileQueryOptions(uploadId,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getInternalPapersPutPaperMutationKey = () => ['internalPapersPutPaper'] as const;

export const getInternalPapersPutPaperMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPaper>>, TError,InternalPapersPutPaperMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPaper>>, TError,InternalPapersPutPaperMutationVariables, TContext> => {

const mutationKey = getInternalPapersPutPaperMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPapersPutPaper>>, InternalPapersPutPaperMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  internalPapersPutPaper(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPapersPutPaperMutationResult = NonNullable<Awaited<ReturnType<typeof internalPapersPutPaper>>>
    export type InternalPapersPutPaperMutationBody = PaperWrite
    export type InternalPapersPutPaperMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPapersPutPaperMutationVariables = {id: string;data: PaperWrite}

    export const useInternalPapersPutPaper = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPaper>>, TError,InternalPapersPutPaperMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPapersPutPaper>>,
        TError,
        InternalPapersPutPaperMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPapersPutPaperMutationOptions(options), queryClient);
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





export const getInternalPapersPutFileMutationKey = () => ['internalPapersPutFile'] as const;

export const getInternalPapersPutFileMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutFile>>, TError,InternalPapersPutFileMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutFile>>, TError,InternalPapersPutFileMutationVariables, TContext> => {

const mutationKey = getInternalPapersPutFileMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPapersPutFile>>, InternalPapersPutFileMutationVariables> = (props) => {
          const {id,name,data} = props ?? {};

          return  internalPapersPutFile(id,name,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPapersPutFileMutationResult = NonNullable<Awaited<ReturnType<typeof internalPapersPutFile>>>
    export type InternalPapersPutFileMutationBody = Blob | string
    export type InternalPapersPutFileMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPapersPutFileMutationVariables = {id: string;name: 'source.pdf' | 'pages.jsonl' | 'pages.txt';data: Blob | string}

    export const useInternalPapersPutFile = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutFile>>, TError,InternalPapersPutFileMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPapersPutFile>>,
        TError,
        InternalPapersPutFileMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPapersPutFileMutationOptions(options), queryClient);
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





export const getInternalPapersGetFileQueryKey = (id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt',) => {
    return [
    `${getBaseUrl()}/v1/internal/papers/${id}/files/${name}`
    ] as const;
    }


export const getInternalPapersGetFileQueryOptions = <TData = Awaited<ReturnType<typeof internalPapersGetFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt', options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetFile>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getInternalPapersGetFileQueryKey(id,name);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof internalPapersGetFile>>> = ({ signal }) => internalPapersGetFile(id,name, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined && name !== null && name !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetFile>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type InternalPapersGetFileQueryResult = NonNullable<Awaited<ReturnType<typeof internalPapersGetFile>>>
export type InternalPapersGetFileQueryError = globalThis.Error & { info?: Problem; status?: number }


export function useInternalPapersGetFile<TData = Awaited<ReturnType<typeof internalPapersGetFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt', options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetFile>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPapersGetFile>>,
          TError,
          Awaited<ReturnType<typeof internalPapersGetFile>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPapersGetFile<TData = Awaited<ReturnType<typeof internalPapersGetFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt', options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetFile>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof internalPapersGetFile>>,
          TError,
          Awaited<ReturnType<typeof internalPapersGetFile>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function useInternalPapersGetFile<TData = Awaited<ReturnType<typeof internalPapersGetFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt', options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetFile>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function useInternalPapersGetFile<TData = Awaited<ReturnType<typeof internalPapersGetFile>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    name: 'source.pdf' | 'pages.jsonl' | 'pages.txt', options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof internalPapersGetFile>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getInternalPapersGetFileQueryOptions(id,name,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getInternalPapersPutPageMutationKey = () => ['internalPapersPutPage'] as const;

export const getInternalPapersPutPageMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPage>>, TError,InternalPapersPutPageMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPage>>, TError,InternalPapersPutPageMutationVariables, TContext> => {

const mutationKey = getInternalPapersPutPageMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPapersPutPage>>, InternalPapersPutPageMutationVariables> = (props) => {
          const {id,n,data} = props ?? {};

          return  internalPapersPutPage(id,n,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPapersPutPageMutationResult = NonNullable<Awaited<ReturnType<typeof internalPapersPutPage>>>
    export type InternalPapersPutPageMutationBody = Blob
    export type InternalPapersPutPageMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPapersPutPageMutationVariables = {id: string;n: number;data: Blob}

    export const useInternalPapersPutPage = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPage>>, TError,InternalPapersPutPageMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPapersPutPage>>,
        TError,
        InternalPapersPutPageMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPapersPutPageMutationOptions(options), queryClient);
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





export const getInternalPapersPutPrivateMutationKey = () => ['internalPapersPutPrivate'] as const;

export const getInternalPapersPutPrivateMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPrivate>>, TError,InternalPapersPutPrivateMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPrivate>>, TError,InternalPapersPutPrivateMutationVariables, TContext> => {

const mutationKey = getInternalPapersPutPrivateMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPapersPutPrivate>>, InternalPapersPutPrivateMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  internalPapersPutPrivate(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPapersPutPrivateMutationResult = NonNullable<Awaited<ReturnType<typeof internalPapersPutPrivate>>>
    export type InternalPapersPutPrivateMutationBody = PaperPrivate
    export type InternalPapersPutPrivateMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPapersPutPrivateMutationVariables = {id: string;data: PaperPrivate}

    export const useInternalPapersPutPrivate = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersPutPrivate>>, TError,InternalPapersPutPrivateMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPapersPutPrivate>>,
        TError,
        InternalPapersPutPrivateMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPapersPutPrivateMutationOptions(options), queryClient);
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





export const getInternalPapersCreateReviewMutationKey = () => ['internalPapersCreateReview'] as const;

export const getInternalPapersCreateReviewMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersCreateReview>>, TError,InternalPapersCreateReviewMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPapersCreateReview>>, TError,InternalPapersCreateReviewMutationVariables, TContext> => {

const mutationKey = getInternalPapersCreateReviewMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPapersCreateReview>>, InternalPapersCreateReviewMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  internalPapersCreateReview(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPapersCreateReviewMutationResult = NonNullable<Awaited<ReturnType<typeof internalPapersCreateReview>>>
    export type InternalPapersCreateReviewMutationBody = Review
    export type InternalPapersCreateReviewMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPapersCreateReviewMutationVariables = {id: string;data: Review}

    export const useInternalPapersCreateReview = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPapersCreateReview>>, TError,InternalPapersCreateReviewMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPapersCreateReview>>,
        TError,
        InternalPapersCreateReviewMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPapersCreateReviewMutationOptions(options), queryClient);
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





export const getInternalPlatformPutRunMutationKey = () => ['internalPlatformPutRun'] as const;

export const getInternalPlatformPutRunMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformPutRun>>, TError,InternalPlatformPutRunMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalPlatformPutRun>>, TError,InternalPlatformPutRunMutationVariables, TContext> => {

const mutationKey = getInternalPlatformPutRunMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalPlatformPutRun>>, InternalPlatformPutRunMutationVariables> = (props) => {
          const {runId,data} = props ?? {};

          return  internalPlatformPutRun(runId,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalPlatformPutRunMutationResult = NonNullable<Awaited<ReturnType<typeof internalPlatformPutRun>>>
    export type InternalPlatformPutRunMutationBody = Run
    export type InternalPlatformPutRunMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalPlatformPutRunMutationVariables = {runId: string;data: Run}

    export const useInternalPlatformPutRun = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalPlatformPutRun>>, TError,InternalPlatformPutRunMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalPlatformPutRun>>,
        TError,
        InternalPlatformPutRunMutationVariables,
        TContext
      > => {
      return useMutation(getInternalPlatformPutRunMutationOptions(options), queryClient);
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





export const getInternalWatchlistBatchMutationKey = () => ['internalWatchlistBatch'] as const;

export const getInternalWatchlistBatchMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalWatchlistBatch>>, TError,InternalWatchlistBatchMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof internalWatchlistBatch>>, TError,InternalWatchlistBatchMutationVariables, TContext> => {

const mutationKey = getInternalWatchlistBatchMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof internalWatchlistBatch>>, InternalWatchlistBatchMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  internalWatchlistBatch(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type InternalWatchlistBatchMutationResult = NonNullable<Awaited<ReturnType<typeof internalWatchlistBatch>>>
    export type InternalWatchlistBatchMutationBody = WatchItem[]
    export type InternalWatchlistBatchMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type InternalWatchlistBatchMutationVariables = {data: WatchItem[]}

    export const useInternalWatchlistBatch = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof internalWatchlistBatch>>, TError,InternalWatchlistBatchMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof internalWatchlistBatch>>,
        TError,
        InternalWatchlistBatchMutationVariables,
        TContext
      > => {
      return useMutation(getInternalWatchlistBatchMutationOptions(options), queryClient);
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





export const getPrivateMarketsCreateEventMutationKey = () => ['privateMarketsCreateEvent'] as const;

export const getPrivateMarketsCreateEventMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateMarketsCreateEvent>>, TError,PrivateMarketsCreateEventMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privateMarketsCreateEvent>>, TError,PrivateMarketsCreateEventMutationVariables, TContext> => {

const mutationKey = getPrivateMarketsCreateEventMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privateMarketsCreateEvent>>, PrivateMarketsCreateEventMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  privateMarketsCreateEvent(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivateMarketsCreateEventMutationResult = NonNullable<Awaited<ReturnType<typeof privateMarketsCreateEvent>>>
    export type PrivateMarketsCreateEventMutationBody = MarketEvent
    export type PrivateMarketsCreateEventMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivateMarketsCreateEventMutationVariables = {data: MarketEvent}

    export const usePrivateMarketsCreateEvent = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateMarketsCreateEvent>>, TError,PrivateMarketsCreateEventMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privateMarketsCreateEvent>>,
        TError,
        PrivateMarketsCreateEventMutationVariables,
        TContext
      > => {
      return useMutation(getPrivateMarketsCreateEventMutationOptions(options), queryClient);
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





export const getPrivateMarketsPutEventMutationKey = () => ['privateMarketsPutEvent'] as const;

export const getPrivateMarketsPutEventMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateMarketsPutEvent>>, TError,PrivateMarketsPutEventMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privateMarketsPutEvent>>, TError,PrivateMarketsPutEventMutationVariables, TContext> => {

const mutationKey = getPrivateMarketsPutEventMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privateMarketsPutEvent>>, PrivateMarketsPutEventMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  privateMarketsPutEvent(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivateMarketsPutEventMutationResult = NonNullable<Awaited<ReturnType<typeof privateMarketsPutEvent>>>
    export type PrivateMarketsPutEventMutationBody = MarketEvent
    export type PrivateMarketsPutEventMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivateMarketsPutEventMutationVariables = {id: string;data: MarketEvent}

    export const usePrivateMarketsPutEvent = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateMarketsPutEvent>>, TError,PrivateMarketsPutEventMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privateMarketsPutEvent>>,
        TError,
        PrivateMarketsPutEventMutationVariables,
        TContext
      > => {
      return useMutation(getPrivateMarketsPutEventMutationOptions(options), queryClient);
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





export const getPrivateMarketsDeleteEventMutationKey = () => ['privateMarketsDeleteEvent'] as const;

export const getPrivateMarketsDeleteEventMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateMarketsDeleteEvent>>, TError,PrivateMarketsDeleteEventMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privateMarketsDeleteEvent>>, TError,PrivateMarketsDeleteEventMutationVariables, TContext> => {

const mutationKey = getPrivateMarketsDeleteEventMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privateMarketsDeleteEvent>>, PrivateMarketsDeleteEventMutationVariables> = (props) => {
          const {id} = props ?? {};

          return  privateMarketsDeleteEvent(id,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivateMarketsDeleteEventMutationResult = NonNullable<Awaited<ReturnType<typeof privateMarketsDeleteEvent>>>

    export type PrivateMarketsDeleteEventMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivateMarketsDeleteEventMutationVariables = {id: string}

    export const usePrivateMarketsDeleteEvent = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateMarketsDeleteEvent>>, TError,PrivateMarketsDeleteEventMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privateMarketsDeleteEvent>>,
        TError,
        PrivateMarketsDeleteEventMutationVariables,
        TContext
      > => {
      return useMutation(getPrivateMarketsDeleteEventMutationOptions(options), queryClient);
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





export const getPrivateNewsSearchArticlesQueryKey = (params?: PrivateNewsSearchArticlesParams,) => {
    return [
    `${getBaseUrl()}/v1/news/articles/search`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivateNewsSearchArticlesQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params: PrivateNewsSearchArticlesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsSearchArticlesQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsSearchArticles>>> = ({ signal }) => privateNewsSearchArticles(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsSearchArticlesQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsSearchArticles>>>
export type PrivateNewsSearchArticlesQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsSearchArticles<TData = Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: PrivateNewsSearchArticlesParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsSearchArticles>>,
          TError,
          Awaited<ReturnType<typeof privateNewsSearchArticles>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsSearchArticles<TData = Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: PrivateNewsSearchArticlesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsSearchArticles>>,
          TError,
          Awaited<ReturnType<typeof privateNewsSearchArticles>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsSearchArticles<TData = Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: PrivateNewsSearchArticlesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsSearchArticles<TData = Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: PrivateNewsSearchArticlesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsSearchArticles>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsSearchArticlesQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateNewsListEditionsQueryKey = (params?: PrivateNewsListEditionsParams,) => {
    return [
    `${getBaseUrl()}/v1/news/editions`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivateNewsListEditionsQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsListEditions>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PrivateNewsListEditionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListEditions>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsListEditionsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsListEditions>>> = ({ signal }) => privateNewsListEditions(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsListEditions>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsListEditionsQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsListEditions>>>
export type PrivateNewsListEditionsQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsListEditions<TData = Awaited<ReturnType<typeof privateNewsListEditions>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PrivateNewsListEditionsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListEditions>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsListEditions>>,
          TError,
          Awaited<ReturnType<typeof privateNewsListEditions>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsListEditions<TData = Awaited<ReturnType<typeof privateNewsListEditions>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivateNewsListEditionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListEditions>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsListEditions>>,
          TError,
          Awaited<ReturnType<typeof privateNewsListEditions>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsListEditions<TData = Awaited<ReturnType<typeof privateNewsListEditions>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivateNewsListEditionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListEditions>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsListEditions<TData = Awaited<ReturnType<typeof privateNewsListEditions>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivateNewsListEditionsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListEditions>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsListEditionsQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateNewsGetEditionQueryKey = (id: string,) => {
    return [
    `${getBaseUrl()}/v1/news/editions/${id}`
    ] as const;
    }


export const getPrivateNewsGetEditionQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsGetEdition>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEdition>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsGetEditionQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsGetEdition>>> = ({ signal }) => privateNewsGetEdition(id, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEdition>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsGetEditionQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsGetEdition>>>
export type PrivateNewsGetEditionQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsGetEdition<TData = Awaited<ReturnType<typeof privateNewsGetEdition>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEdition>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetEdition>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetEdition>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetEdition<TData = Awaited<ReturnType<typeof privateNewsGetEdition>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEdition>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetEdition>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetEdition>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetEdition<TData = Awaited<ReturnType<typeof privateNewsGetEdition>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEdition>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsGetEdition<TData = Awaited<ReturnType<typeof privateNewsGetEdition>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEdition>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsGetEditionQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateNewsRateEditionMutationKey = () => ['privateNewsRateEdition'] as const;

export const getPrivateNewsRateEditionMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateNewsRateEdition>>, TError,PrivateNewsRateEditionMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privateNewsRateEdition>>, TError,PrivateNewsRateEditionMutationVariables, TContext> => {

const mutationKey = getPrivateNewsRateEditionMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privateNewsRateEdition>>, PrivateNewsRateEditionMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  privateNewsRateEdition(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivateNewsRateEditionMutationResult = NonNullable<Awaited<ReturnType<typeof privateNewsRateEdition>>>
    export type PrivateNewsRateEditionMutationBody = EditionFeedbackRequest
    export type PrivateNewsRateEditionMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivateNewsRateEditionMutationVariables = {id: string;data: EditionFeedbackRequest}

    export const usePrivateNewsRateEdition = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateNewsRateEdition>>, TError,PrivateNewsRateEditionMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privateNewsRateEdition>>,
        TError,
        PrivateNewsRateEditionMutationVariables,
        TContext
      > => {
      return useMutation(getPrivateNewsRateEditionMutationOptions(options), queryClient);
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





export const getPrivateNewsGetEditionHtmlQueryKey = (id: string,) => {
    return [
    `${getBaseUrl()}/v1/news/editions/${id}/html`
    ] as const;
    }


export const getPrivateNewsGetEditionHtmlQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsGetEditionHtmlQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>> = ({ signal }) => privateNewsGetEditionHtml(id, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsGetEditionHtmlQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>>
export type PrivateNewsGetEditionHtmlQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsGetEditionHtml<TData = Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetEditionHtml>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetEditionHtml>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetEditionHtml<TData = Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetEditionHtml>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetEditionHtml>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetEditionHtml<TData = Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsGetEditionHtml<TData = Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetEditionHtml>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsGetEditionHtmlQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateNewsListFeedbackQueryKey = (params?: PrivateNewsListFeedbackParams,) => {
    return [
    `${getBaseUrl()}/v1/news/feedback`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivateNewsListFeedbackQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsListFeedback>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PrivateNewsListFeedbackParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListFeedback>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsListFeedbackQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsListFeedback>>> = ({ signal }) => privateNewsListFeedback(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsListFeedback>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsListFeedbackQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsListFeedback>>>
export type PrivateNewsListFeedbackQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsListFeedback<TData = Awaited<ReturnType<typeof privateNewsListFeedback>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PrivateNewsListFeedbackParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListFeedback>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsListFeedback>>,
          TError,
          Awaited<ReturnType<typeof privateNewsListFeedback>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsListFeedback<TData = Awaited<ReturnType<typeof privateNewsListFeedback>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivateNewsListFeedbackParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListFeedback>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsListFeedback>>,
          TError,
          Awaited<ReturnType<typeof privateNewsListFeedback>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsListFeedback<TData = Awaited<ReturnType<typeof privateNewsListFeedback>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivateNewsListFeedbackParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListFeedback>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsListFeedback<TData = Awaited<ReturnType<typeof privateNewsListFeedback>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivateNewsListFeedbackParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListFeedback>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsListFeedbackQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateNewsFlagItemMutationKey = () => ['privateNewsFlagItem'] as const;

export const getPrivateNewsFlagItemMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateNewsFlagItem>>, TError,PrivateNewsFlagItemMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privateNewsFlagItem>>, TError,PrivateNewsFlagItemMutationVariables, TContext> => {

const mutationKey = getPrivateNewsFlagItemMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privateNewsFlagItem>>, PrivateNewsFlagItemMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  privateNewsFlagItem(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivateNewsFlagItemMutationResult = NonNullable<Awaited<ReturnType<typeof privateNewsFlagItem>>>
    export type PrivateNewsFlagItemMutationBody = ItemFeedbackRequest
    export type PrivateNewsFlagItemMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivateNewsFlagItemMutationVariables = {data: ItemFeedbackRequest}

    export const usePrivateNewsFlagItem = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateNewsFlagItem>>, TError,PrivateNewsFlagItemMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privateNewsFlagItem>>,
        TError,
        PrivateNewsFlagItemMutationVariables,
        TContext
      > => {
      return useMutation(getPrivateNewsFlagItemMutationOptions(options), queryClient);
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





export const getPrivateNewsListSourcesQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/news/sources`
    ] as const;
    }


export const getPrivateNewsListSourcesQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsListSources>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListSources>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsListSourcesQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsListSources>>> = ({ signal }) => privateNewsListSources({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsListSources>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsListSourcesQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsListSources>>>
export type PrivateNewsListSourcesQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsListSources<TData = Awaited<ReturnType<typeof privateNewsListSources>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListSources>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsListSources>>,
          TError,
          Awaited<ReturnType<typeof privateNewsListSources>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsListSources<TData = Awaited<ReturnType<typeof privateNewsListSources>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListSources>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsListSources>>,
          TError,
          Awaited<ReturnType<typeof privateNewsListSources>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsListSources<TData = Awaited<ReturnType<typeof privateNewsListSources>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListSources>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsListSources<TData = Awaited<ReturnType<typeof privateNewsListSources>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsListSources>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsListSourcesQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateNewsGetTimelineQueryKey = (symbol: string,
    params?: PrivateNewsGetTimelineParams,) => {
    return [
    `${getBaseUrl()}/v1/news/tickers/${symbol}/timeline`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivateNewsGetTimelineQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(symbol: string,
    params?: PrivateNewsGetTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsGetTimelineQueryKey(symbol,params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsGetTimeline>>> = ({ signal }) => privateNewsGetTimeline(symbol,params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: symbol !== null && symbol !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsGetTimelineQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsGetTimeline>>>
export type PrivateNewsGetTimelineQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsGetTimeline<TData = Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params: undefined |  PrivateNewsGetTimelineParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetTimeline>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetTimeline>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetTimeline<TData = Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params?: PrivateNewsGetTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetTimeline>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetTimeline>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetTimeline<TData = Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params?: PrivateNewsGetTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsGetTimeline<TData = Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params?: PrivateNewsGetTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetTimeline>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsGetTimelineQueryOptions(symbol,params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateNewsGetFullTimelineQueryKey = (symbol: string,
    params?: PrivateNewsGetFullTimelineParams,) => {
    return [
    `${getBaseUrl()}/v1/news/tickers/${symbol}/timeline/full`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivateNewsGetFullTimelineQueryOptions = <TData = Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(symbol: string,
    params?: PrivateNewsGetFullTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateNewsGetFullTimelineQueryKey(symbol,params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>> = ({ signal }) => privateNewsGetFullTimeline(symbol,params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: symbol !== null && symbol !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateNewsGetFullTimelineQueryResult = NonNullable<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>>
export type PrivateNewsGetFullTimelineQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateNewsGetFullTimeline<TData = Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params: undefined |  PrivateNewsGetFullTimelineParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetFullTimeline>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetFullTimeline>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetFullTimeline<TData = Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params?: PrivateNewsGetFullTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateNewsGetFullTimeline>>,
          TError,
          Awaited<ReturnType<typeof privateNewsGetFullTimeline>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateNewsGetFullTimeline<TData = Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params?: PrivateNewsGetFullTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateNewsGetFullTimeline<TData = Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 symbol: string,
    params?: PrivateNewsGetFullTimelineParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateNewsGetFullTimeline>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateNewsGetFullTimelineQueryOptions(symbol,params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersListPapersQueryKey = (params?: PrivatePapersListPapersParams,) => {
    return [
    `${getBaseUrl()}/v1/papers`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivatePapersListPapersQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersListPapers>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PrivatePapersListPapersParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListPapers>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersListPapersQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersListPapers>>> = ({ signal }) => privatePapersListPapers(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersListPapers>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersListPapersQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersListPapers>>>
export type PrivatePapersListPapersQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersListPapers<TData = Awaited<ReturnType<typeof privatePapersListPapers>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PrivatePapersListPapersParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListPapers>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersListPapers>>,
          TError,
          Awaited<ReturnType<typeof privatePapersListPapers>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersListPapers<TData = Awaited<ReturnType<typeof privatePapersListPapers>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePapersListPapersParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListPapers>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersListPapers>>,
          TError,
          Awaited<ReturnType<typeof privatePapersListPapers>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersListPapers<TData = Awaited<ReturnType<typeof privatePapersListPapers>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePapersListPapersParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListPapers>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersListPapers<TData = Awaited<ReturnType<typeof privatePapersListPapers>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePapersListPapersParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListPapers>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersListPapersQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersGetCatalogQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/papers/catalog`
    ] as const;
    }


export const getPrivatePapersGetCatalogQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersGetCatalogQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersGetCatalog>>> = ({ signal }) => privatePapersGetCatalog({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersGetCatalogQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersGetCatalog>>>
export type PrivatePapersGetCatalogQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersGetCatalog<TData = Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetCatalog>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetCatalog>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetCatalog<TData = Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetCatalog>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetCatalog>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetCatalog<TData = Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersGetCatalog<TData = Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetCatalog>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersGetCatalogQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersGetGraphQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/papers/graph`
    ] as const;
    }


export const getPrivatePapersGetGraphQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetGraph>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersGetGraphQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersGetGraph>>> = ({ signal }) => privatePapersGetGraph({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetGraph>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersGetGraphQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersGetGraph>>>
export type PrivatePapersGetGraphQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersGetGraph<TData = Awaited<ReturnType<typeof privatePapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetGraph>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetGraph>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetGraph>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetGraph<TData = Awaited<ReturnType<typeof privatePapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetGraph>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetGraph>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetGraph>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetGraph<TData = Awaited<ReturnType<typeof privatePapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetGraph>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersGetGraph<TData = Awaited<ReturnType<typeof privatePapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetGraph>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersGetGraphQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersListUploadsQueryKey = (params?: PrivatePapersListUploadsParams,) => {
    return [
    `${getBaseUrl()}/v1/papers/uploads`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivatePapersListUploadsQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersListUploads>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PrivatePapersListUploadsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListUploads>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersListUploadsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersListUploads>>> = ({ signal }) => privatePapersListUploads(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersListUploads>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersListUploadsQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersListUploads>>>
export type PrivatePapersListUploadsQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersListUploads<TData = Awaited<ReturnType<typeof privatePapersListUploads>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PrivatePapersListUploadsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListUploads>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersListUploads>>,
          TError,
          Awaited<ReturnType<typeof privatePapersListUploads>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersListUploads<TData = Awaited<ReturnType<typeof privatePapersListUploads>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePapersListUploadsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListUploads>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersListUploads>>,
          TError,
          Awaited<ReturnType<typeof privatePapersListUploads>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersListUploads<TData = Awaited<ReturnType<typeof privatePapersListUploads>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePapersListUploadsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListUploads>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersListUploads<TData = Awaited<ReturnType<typeof privatePapersListUploads>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePapersListUploadsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListUploads>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersListUploadsQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersUploadArxivMutationKey = () => ['privatePapersUploadArxiv'] as const;

export const getPrivatePapersUploadArxivMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersUploadArxiv>>, TError,PrivatePapersUploadArxivMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersUploadArxiv>>, TError,PrivatePapersUploadArxivMutationVariables, TContext> => {

const mutationKey = getPrivatePapersUploadArxivMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersUploadArxiv>>, PrivatePapersUploadArxivMutationVariables> = (props) => {
          const {data} = props ?? {};

          return  privatePapersUploadArxiv(data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersUploadArxivMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersUploadArxiv>>>
    export type PrivatePapersUploadArxivMutationBody = PaperArxivUploadRequest
    export type PrivatePapersUploadArxivMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersUploadArxivMutationVariables = {data: PaperArxivUploadRequest}

    export const usePrivatePapersUploadArxiv = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersUploadArxiv>>, TError,PrivatePapersUploadArxivMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersUploadArxiv>>,
        TError,
        PrivatePapersUploadArxivMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersUploadArxivMutationOptions(options), queryClient);
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





export const getPrivatePapersUploadPdfMutationKey = () => ['privatePapersUploadPdf'] as const;

export const getPrivatePapersUploadPdfMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersUploadPdf>>, TError,PrivatePapersUploadPdfMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersUploadPdf>>, TError,PrivatePapersUploadPdfMutationVariables, TContext> => {

const mutationKey = getPrivatePapersUploadPdfMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersUploadPdf>>, PrivatePapersUploadPdfMutationVariables> = (props) => {
          const {filename,data} = props ?? {};

          return  privatePapersUploadPdf(filename,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersUploadPdfMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersUploadPdf>>>
    export type PrivatePapersUploadPdfMutationBody = Blob
    export type PrivatePapersUploadPdfMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersUploadPdfMutationVariables = {filename: string;data: Blob}

    export const usePrivatePapersUploadPdf = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersUploadPdf>>, TError,PrivatePapersUploadPdfMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersUploadPdf>>,
        TError,
        PrivatePapersUploadPdfMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersUploadPdfMutationOptions(options), queryClient);
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





export const getPrivatePapersRetryUploadMutationKey = () => ['privatePapersRetryUpload'] as const;

export const getPrivatePapersRetryUploadMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersRetryUpload>>, TError,PrivatePapersRetryUploadMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersRetryUpload>>, TError,PrivatePapersRetryUploadMutationVariables, TContext> => {

const mutationKey = getPrivatePapersRetryUploadMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersRetryUpload>>, PrivatePapersRetryUploadMutationVariables> = (props) => {
          const {uploadId} = props ?? {};

          return  privatePapersRetryUpload(uploadId,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersRetryUploadMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersRetryUpload>>>

    export type PrivatePapersRetryUploadMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersRetryUploadMutationVariables = {uploadId: string}

    export const usePrivatePapersRetryUpload = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersRetryUpload>>, TError,PrivatePapersRetryUploadMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersRetryUpload>>,
        TError,
        PrivatePapersRetryUploadMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersRetryUploadMutationOptions(options), queryClient);
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





export const getPrivatePapersGetPaperQueryKey = (id: string,) => {
    return [
    `${getBaseUrl()}/v1/papers/${id}`
    ] as const;
    }


export const getPrivatePapersGetPaperQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPaper>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersGetPaperQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersGetPaper>>> = ({ signal }) => privatePapersGetPaper(id, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPaper>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersGetPaperQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersGetPaper>>>
export type PrivatePapersGetPaperQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersGetPaper<TData = Awaited<ReturnType<typeof privatePapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPaper>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPaper>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPaper>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPaper<TData = Awaited<ReturnType<typeof privatePapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPaper>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPaper>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPaper>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPaper<TData = Awaited<ReturnType<typeof privatePapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPaper>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersGetPaper<TData = Awaited<ReturnType<typeof privatePapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPaper>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersGetPaperQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersPatchPaperMutationKey = () => ['privatePapersPatchPaper'] as const;

export const getPrivatePapersPatchPaperMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersPatchPaper>>, TError,PrivatePapersPatchPaperMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersPatchPaper>>, TError,PrivatePapersPatchPaperMutationVariables, TContext> => {

const mutationKey = getPrivatePapersPatchPaperMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersPatchPaper>>, PrivatePapersPatchPaperMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  privatePapersPatchPaper(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersPatchPaperMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersPatchPaper>>>
    export type PrivatePapersPatchPaperMutationBody = PaperPatch
    export type PrivatePapersPatchPaperMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersPatchPaperMutationVariables = {id: string;data: PaperPatch}

    export const usePrivatePapersPatchPaper = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersPatchPaper>>, TError,PrivatePapersPatchPaperMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersPatchPaper>>,
        TError,
        PrivatePapersPatchPaperMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersPatchPaperMutationOptions(options), queryClient);
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





export const getPrivatePapersAskMutationKey = () => ['privatePapersAsk'] as const;

export const getPrivatePapersAskMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersAsk>>, TError,PrivatePapersAskMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersAsk>>, TError,PrivatePapersAskMutationVariables, TContext> => {

const mutationKey = getPrivatePapersAskMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersAsk>>, PrivatePapersAskMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  privatePapersAsk(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersAskMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersAsk>>>
    export type PrivatePapersAskMutationBody = PaperAskRequest
    export type PrivatePapersAskMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersAskMutationVariables = {id: string;data: PaperAskRequest}

    export const usePrivatePapersAsk = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersAsk>>, TError,PrivatePapersAskMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersAsk>>,
        TError,
        PrivatePapersAskMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersAskMutationOptions(options), queryClient);
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





export const getPrivatePapersCreateExplanationMutationKey = () => ['privatePapersCreateExplanation'] as const;

export const getPrivatePapersCreateExplanationMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersCreateExplanation>>, TError,PrivatePapersCreateExplanationMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersCreateExplanation>>, TError,PrivatePapersCreateExplanationMutationVariables, TContext> => {

const mutationKey = getPrivatePapersCreateExplanationMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersCreateExplanation>>, PrivatePapersCreateExplanationMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  privatePapersCreateExplanation(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersCreateExplanationMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersCreateExplanation>>>
    export type PrivatePapersCreateExplanationMutationBody = PaperExplanationCreate
    export type PrivatePapersCreateExplanationMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersCreateExplanationMutationVariables = {id: string;data: PaperExplanationCreate}

    export const usePrivatePapersCreateExplanation = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersCreateExplanation>>, TError,PrivatePapersCreateExplanationMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersCreateExplanation>>,
        TError,
        PrivatePapersCreateExplanationMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersCreateExplanationMutationOptions(options), queryClient);
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





export const getPrivatePapersPatchExplanationMutationKey = () => ['privatePapersPatchExplanation'] as const;

export const getPrivatePapersPatchExplanationMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersPatchExplanation>>, TError,PrivatePapersPatchExplanationMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersPatchExplanation>>, TError,PrivatePapersPatchExplanationMutationVariables, TContext> => {

const mutationKey = getPrivatePapersPatchExplanationMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersPatchExplanation>>, PrivatePapersPatchExplanationMutationVariables> = (props) => {
          const {id,eid,data} = props ?? {};

          return  privatePapersPatchExplanation(id,eid,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersPatchExplanationMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersPatchExplanation>>>
    export type PrivatePapersPatchExplanationMutationBody = PaperExplanationPatch
    export type PrivatePapersPatchExplanationMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersPatchExplanationMutationVariables = {id: string;eid: string;data: PaperExplanationPatch}

    export const usePrivatePapersPatchExplanation = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersPatchExplanation>>, TError,PrivatePapersPatchExplanationMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersPatchExplanation>>,
        TError,
        PrivatePapersPatchExplanationMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersPatchExplanationMutationOptions(options), queryClient);
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





export const getPrivatePapersGetPageQueryKey = (id: string,
    n: number,) => {
    return [
    `${getBaseUrl()}/v1/papers/${id}/pages/${n}`
    ] as const;
    }


export const getPrivatePapersGetPageQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersGetPage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string,
    n: number, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPage>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersGetPageQueryKey(id,n);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersGetPage>>> = ({ signal }) => privatePapersGetPage(id,n, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined && n !== null && n !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPage>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersGetPageQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersGetPage>>>
export type PrivatePapersGetPageQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersGetPage<TData = Awaited<ReturnType<typeof privatePapersGetPage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    n: number, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPage>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPage>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPage>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPage<TData = Awaited<ReturnType<typeof privatePapersGetPage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    n: number, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPage>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPage>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPage>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPage<TData = Awaited<ReturnType<typeof privatePapersGetPage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    n: number, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPage>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersGetPage<TData = Awaited<ReturnType<typeof privatePapersGetPage>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string,
    n: number, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPage>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersGetPageQueryOptions(id,n,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersGetPrivateQueryKey = (id: string,) => {
    return [
    `${getBaseUrl()}/v1/papers/${id}/private`
    ] as const;
    }


export const getPrivatePapersGetPrivateQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersGetPrivateQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersGetPrivate>>> = ({ signal }) => privatePapersGetPrivate(id, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersGetPrivateQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersGetPrivate>>>
export type PrivatePapersGetPrivateQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersGetPrivate<TData = Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPrivate>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPrivate>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPrivate<TData = Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPrivate>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPrivate>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPrivate<TData = Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersGetPrivate<TData = Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPrivate>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersGetPrivateQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersPutPrivateMutationKey = () => ['privatePapersPutPrivate'] as const;

export const getPrivatePapersPutPrivateMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersPutPrivate>>, TError,PrivatePapersPutPrivateMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersPutPrivate>>, TError,PrivatePapersPutPrivateMutationVariables, TContext> => {

const mutationKey = getPrivatePapersPutPrivateMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersPutPrivate>>, PrivatePapersPutPrivateMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  privatePapersPutPrivate(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersPutPrivateMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersPutPrivate>>>
    export type PrivatePapersPutPrivateMutationBody = PaperPrivateWrite
    export type PrivatePapersPutPrivateMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersPutPrivateMutationVariables = {id: string;data: PaperPrivateWrite}

    export const usePrivatePapersPutPrivate = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersPutPrivate>>, TError,PrivatePapersPutPrivateMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersPutPrivate>>,
        TError,
        PrivatePapersPutPrivateMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersPutPrivateMutationOptions(options), queryClient);
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





export const getPrivatePapersListReviewsQueryKey = (id: string,) => {
    return [
    `${getBaseUrl()}/v1/papers/${id}/reviews`
    ] as const;
    }


export const getPrivatePapersListReviewsQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersListReviews>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListReviews>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersListReviewsQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersListReviews>>> = ({ signal }) => privatePapersListReviews(id, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersListReviews>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersListReviewsQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersListReviews>>>
export type PrivatePapersListReviewsQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersListReviews<TData = Awaited<ReturnType<typeof privatePapersListReviews>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListReviews>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersListReviews>>,
          TError,
          Awaited<ReturnType<typeof privatePapersListReviews>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersListReviews<TData = Awaited<ReturnType<typeof privatePapersListReviews>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListReviews>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersListReviews>>,
          TError,
          Awaited<ReturnType<typeof privatePapersListReviews>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersListReviews<TData = Awaited<ReturnType<typeof privatePapersListReviews>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListReviews>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersListReviews<TData = Awaited<ReturnType<typeof privatePapersListReviews>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersListReviews>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersListReviewsQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePapersReviseMutationKey = () => ['privatePapersRevise'] as const;

export const getPrivatePapersReviseMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersRevise>>, TError,PrivatePapersReviseMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privatePapersRevise>>, TError,PrivatePapersReviseMutationVariables, TContext> => {

const mutationKey = getPrivatePapersReviseMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privatePapersRevise>>, PrivatePapersReviseMutationVariables> = (props) => {
          const {id,data} = props ?? {};

          return  privatePapersRevise(id,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivatePapersReviseMutationResult = NonNullable<Awaited<ReturnType<typeof privatePapersRevise>>>
    export type PrivatePapersReviseMutationBody = PaperReviseRequest
    export type PrivatePapersReviseMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivatePapersReviseMutationVariables = {id: string;data: PaperReviseRequest}

    export const usePrivatePapersRevise = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privatePapersRevise>>, TError,PrivatePapersReviseMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privatePapersRevise>>,
        TError,
        PrivatePapersReviseMutationVariables,
        TContext
      > => {
      return useMutation(getPrivatePapersReviseMutationOptions(options), queryClient);
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





export const getPrivatePapersGetPdfQueryKey = (id: string,) => {
    return [
    `${getBaseUrl()}/v1/papers/${id}/source.pdf`
    ] as const;
    }


export const getPrivatePapersGetPdfQueryOptions = <TData = Awaited<ReturnType<typeof privatePapersGetPdf>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPdf>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePapersGetPdfQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePapersGetPdf>>> = ({ signal }) => privatePapersGetPdf(id, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPdf>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePapersGetPdfQueryResult = NonNullable<Awaited<ReturnType<typeof privatePapersGetPdf>>>
export type PrivatePapersGetPdfQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePapersGetPdf<TData = Awaited<ReturnType<typeof privatePapersGetPdf>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPdf>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPdf>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPdf>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPdf<TData = Awaited<ReturnType<typeof privatePapersGetPdf>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPdf>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePapersGetPdf>>,
          TError,
          Awaited<ReturnType<typeof privatePapersGetPdf>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePapersGetPdf<TData = Awaited<ReturnType<typeof privatePapersGetPdf>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPdf>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePapersGetPdf<TData = Awaited<ReturnType<typeof privatePapersGetPdf>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePapersGetPdf>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePapersGetPdfQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsListDaysQueryKey = (params?: PublicMarketsListDaysParams,) => {
    return [
    `${getBaseUrl()}/v1/public/markets/days`, ...(params ? [params] : [])
    ] as const;
    }


export const getPublicMarketsListDaysQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsListDays>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PublicMarketsListDaysParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListDays>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsListDaysQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsListDays>>> = ({ signal }) => publicMarketsListDays(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListDays>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsListDaysQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsListDays>>>
export type PublicMarketsListDaysQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsListDays<TData = Awaited<ReturnType<typeof publicMarketsListDays>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PublicMarketsListDaysParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListDays>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListDays>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListDays>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListDays<TData = Awaited<ReturnType<typeof publicMarketsListDays>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListDaysParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListDays>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListDays>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListDays>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListDays<TData = Awaited<ReturnType<typeof publicMarketsListDays>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListDaysParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListDays>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsListDays<TData = Awaited<ReturnType<typeof publicMarketsListDays>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListDaysParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListDays>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsListDaysQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsGetLatestDayQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/public/markets/days/latest`
    ] as const;
    }


export const getPublicMarketsGetLatestDayQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsGetLatestDayQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>> = ({ signal }) => publicMarketsGetLatestDay({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsGetLatestDayQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>>
export type PublicMarketsGetLatestDayQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsGetLatestDay<TData = Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetLatestDay>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetLatestDay>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetLatestDay<TData = Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetLatestDay>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetLatestDay>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetLatestDay<TData = Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsGetLatestDay<TData = Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetLatestDay>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsGetLatestDayQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsGetDayQueryKey = (date: string,) => {
    return [
    `${getBaseUrl()}/v1/public/markets/days/${date}`
    ] as const;
    }


export const getPublicMarketsGetDayQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsGetDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetDay>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsGetDayQueryKey(date);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsGetDay>>> = ({ signal }) => publicMarketsGetDay(date, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: date !== null && date !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetDay>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsGetDayQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsGetDay>>>
export type PublicMarketsGetDayQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsGetDay<TData = Awaited<ReturnType<typeof publicMarketsGetDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetDay>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetDay>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetDay>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetDay<TData = Awaited<ReturnType<typeof publicMarketsGetDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetDay>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetDay>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetDay>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetDay<TData = Awaited<ReturnType<typeof publicMarketsGetDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetDay>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsGetDay<TData = Awaited<ReturnType<typeof publicMarketsGetDay>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetDay>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsGetDayQueryOptions(date,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsListEventsQueryKey = (params?: PublicMarketsListEventsParams,) => {
    return [
    `${getBaseUrl()}/v1/public/markets/events`, ...(params ? [params] : [])
    ] as const;
    }


export const getPublicMarketsListEventsQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsListEvents>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PublicMarketsListEventsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListEvents>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsListEventsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsListEvents>>> = ({ signal }) => publicMarketsListEvents(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListEvents>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsListEventsQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsListEvents>>>
export type PublicMarketsListEventsQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsListEvents<TData = Awaited<ReturnType<typeof publicMarketsListEvents>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PublicMarketsListEventsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListEvents>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListEvents>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListEvents>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListEvents<TData = Awaited<ReturnType<typeof publicMarketsListEvents>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListEventsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListEvents>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListEvents>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListEvents>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListEvents<TData = Awaited<ReturnType<typeof publicMarketsListEvents>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListEventsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListEvents>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsListEvents<TData = Awaited<ReturnType<typeof publicMarketsListEvents>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListEventsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListEvents>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsListEventsQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsListHypothesesQueryKey = (params?: PublicMarketsListHypothesesParams,) => {
    return [
    `${getBaseUrl()}/v1/public/markets/hypotheses`, ...(params ? [params] : [])
    ] as const;
    }


export const getPublicMarketsListHypothesesQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PublicMarketsListHypothesesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsListHypothesesQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsListHypotheses>>> = ({ signal }) => publicMarketsListHypotheses(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsListHypothesesQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsListHypotheses>>>
export type PublicMarketsListHypothesesQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsListHypotheses<TData = Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PublicMarketsListHypothesesParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListHypotheses>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListHypotheses>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListHypotheses<TData = Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListHypothesesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListHypotheses>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListHypotheses>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListHypotheses<TData = Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListHypothesesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsListHypotheses<TData = Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PublicMarketsListHypothesesParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListHypotheses>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsListHypothesesQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsListIndexBarsQueryKey = (code: string,
    params?: PublicMarketsListIndexBarsParams,) => {
    return [
    `${getBaseUrl()}/v1/public/markets/indices/${code}/bars`, ...(params ? [params] : [])
    ] as const;
    }


export const getPublicMarketsListIndexBarsQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError = globalThis.Error & { info?: Problem; status?: number }>(code: string,
    params?: PublicMarketsListIndexBarsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsListIndexBarsQueryKey(code,params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsListIndexBars>>> = ({ signal }) => publicMarketsListIndexBars(code,params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: code !== null && code !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsListIndexBarsQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsListIndexBars>>>
export type PublicMarketsListIndexBarsQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsListIndexBars<TData = Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 code: string,
    params: undefined |  PublicMarketsListIndexBarsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListIndexBars>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListIndexBars>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListIndexBars<TData = Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 code: string,
    params?: PublicMarketsListIndexBarsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListIndexBars>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListIndexBars>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListIndexBars<TData = Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 code: string,
    params?: PublicMarketsListIndexBarsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsListIndexBars<TData = Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 code: string,
    params?: PublicMarketsListIndexBarsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListIndexBars>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsListIndexBarsQueryOptions(code,params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsGetReferenceQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/public/markets/reference`
    ] as const;
    }


export const getPublicMarketsGetReferenceQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsGetReference>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetReference>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsGetReferenceQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsGetReference>>> = ({ signal }) => publicMarketsGetReference({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetReference>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsGetReferenceQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsGetReference>>>
export type PublicMarketsGetReferenceQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsGetReference<TData = Awaited<ReturnType<typeof publicMarketsGetReference>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetReference>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetReference>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetReference>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetReference<TData = Awaited<ReturnType<typeof publicMarketsGetReference>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetReference>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetReference>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetReference>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetReference<TData = Awaited<ReturnType<typeof publicMarketsGetReference>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetReference>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsGetReference<TData = Awaited<ReturnType<typeof publicMarketsGetReference>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetReference>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsGetReferenceQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsListWeekliesQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/public/markets/weeklies`
    ] as const;
    }


export const getPublicMarketsListWeekliesQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsListWeekliesQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsListWeeklies>>> = ({ signal }) => publicMarketsListWeeklies({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsListWeekliesQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsListWeeklies>>>
export type PublicMarketsListWeekliesQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsListWeeklies<TData = Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListWeeklies>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListWeeklies>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListWeeklies<TData = Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsListWeeklies>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsListWeeklies>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsListWeeklies<TData = Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsListWeeklies<TData = Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsListWeeklies>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsListWeekliesQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicMarketsGetWeeklyQueryKey = (date: string,) => {
    return [
    `${getBaseUrl()}/v1/public/markets/weeklies/${date}`
    ] as const;
    }


export const getPublicMarketsGetWeeklyQueryOptions = <TData = Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError = globalThis.Error & { info?: Problem; status?: number }>(date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicMarketsGetWeeklyQueryKey(date);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicMarketsGetWeekly>>> = ({ signal }) => publicMarketsGetWeekly(date, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: date !== null && date !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicMarketsGetWeeklyQueryResult = NonNullable<Awaited<ReturnType<typeof publicMarketsGetWeekly>>>
export type PublicMarketsGetWeeklyQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicMarketsGetWeekly<TData = Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetWeekly>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetWeekly>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetWeekly<TData = Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicMarketsGetWeekly>>,
          TError,
          Awaited<ReturnType<typeof publicMarketsGetWeekly>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicMarketsGetWeekly<TData = Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicMarketsGetWeekly<TData = Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 date: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicMarketsGetWeekly>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicMarketsGetWeeklyQueryOptions(date,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicPapersGetCatalogQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/public/papers/catalog`
    ] as const;
    }


export const getPublicPapersGetCatalogQueryOptions = <TData = Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicPapersGetCatalogQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicPapersGetCatalog>>> = ({ signal }) => publicPapersGetCatalog({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicPapersGetCatalogQueryResult = NonNullable<Awaited<ReturnType<typeof publicPapersGetCatalog>>>
export type PublicPapersGetCatalogQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicPapersGetCatalog<TData = Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetCatalog>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetCatalog>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetCatalog<TData = Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetCatalog>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetCatalog>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetCatalog<TData = Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicPapersGetCatalog<TData = Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetCatalog>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicPapersGetCatalogQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicPapersGetGraphQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/public/papers/graph`
    ] as const;
    }


export const getPublicPapersGetGraphQueryOptions = <TData = Awaited<ReturnType<typeof publicPapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetGraph>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicPapersGetGraphQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicPapersGetGraph>>> = ({ signal }) => publicPapersGetGraph({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetGraph>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicPapersGetGraphQueryResult = NonNullable<Awaited<ReturnType<typeof publicPapersGetGraph>>>
export type PublicPapersGetGraphQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicPapersGetGraph<TData = Awaited<ReturnType<typeof publicPapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetGraph>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetGraph>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetGraph>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetGraph<TData = Awaited<ReturnType<typeof publicPapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetGraph>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetGraph>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetGraph>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetGraph<TData = Awaited<ReturnType<typeof publicPapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetGraph>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicPapersGetGraph<TData = Awaited<ReturnType<typeof publicPapersGetGraph>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetGraph>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicPapersGetGraphQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicPapersGetSearchIndexQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/public/papers/search-index`
    ] as const;
    }


export const getPublicPapersGetSearchIndexQueryOptions = <TData = Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicPapersGetSearchIndexQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>> = ({ signal }) => publicPapersGetSearchIndex({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicPapersGetSearchIndexQueryResult = NonNullable<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>>
export type PublicPapersGetSearchIndexQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicPapersGetSearchIndex<TData = Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetSearchIndex>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetSearchIndex>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetSearchIndex<TData = Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetSearchIndex>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetSearchIndex>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetSearchIndex<TData = Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicPapersGetSearchIndex<TData = Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetSearchIndex>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicPapersGetSearchIndexQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPublicPapersGetPaperQueryKey = (id: string,) => {
    return [
    `${getBaseUrl()}/v1/public/papers/${id}`
    ] as const;
    }


export const getPublicPapersGetPaperQueryOptions = <TData = Awaited<ReturnType<typeof publicPapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetPaper>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPublicPapersGetPaperQueryKey(id);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof publicPapersGetPaper>>> = ({ signal }) => publicPapersGetPaper(id, { signal, ...fetchOptions });





   return  { queryKey, queryFn, enabled: id !== null && id !== undefined, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetPaper>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PublicPapersGetPaperQueryResult = NonNullable<Awaited<ReturnType<typeof publicPapersGetPaper>>>
export type PublicPapersGetPaperQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePublicPapersGetPaper<TData = Awaited<ReturnType<typeof publicPapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetPaper>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetPaper>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetPaper>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetPaper<TData = Awaited<ReturnType<typeof publicPapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetPaper>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof publicPapersGetPaper>>,
          TError,
          Awaited<ReturnType<typeof publicPapersGetPaper>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePublicPapersGetPaper<TData = Awaited<ReturnType<typeof publicPapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetPaper>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePublicPapersGetPaper<TData = Awaited<ReturnType<typeof publicPapersGetPaper>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 id: string, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof publicPapersGetPaper>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPublicPapersGetPaperQueryOptions(id,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivatePlatformListRunsQueryKey = (params?: PrivatePlatformListRunsParams,) => {
    return [
    `${getBaseUrl()}/v1/runs`, ...(params ? [params] : [])
    ] as const;
    }


export const getPrivatePlatformListRunsQueryOptions = <TData = Awaited<ReturnType<typeof privatePlatformListRuns>>, TError = globalThis.Error & { info?: Problem; status?: number }>(params?: PrivatePlatformListRunsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListRuns>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivatePlatformListRunsQueryKey(params);



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privatePlatformListRuns>>> = ({ signal }) => privatePlatformListRuns(params, { signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListRuns>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivatePlatformListRunsQueryResult = NonNullable<Awaited<ReturnType<typeof privatePlatformListRuns>>>
export type PrivatePlatformListRunsQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivatePlatformListRuns<TData = Awaited<ReturnType<typeof privatePlatformListRuns>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params: undefined |  PrivatePlatformListRunsParams, options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListRuns>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformListRuns>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformListRuns>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformListRuns<TData = Awaited<ReturnType<typeof privatePlatformListRuns>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformListRunsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListRuns>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privatePlatformListRuns>>,
          TError,
          Awaited<ReturnType<typeof privatePlatformListRuns>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivatePlatformListRuns<TData = Awaited<ReturnType<typeof privatePlatformListRuns>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformListRunsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListRuns>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivatePlatformListRuns<TData = Awaited<ReturnType<typeof privatePlatformListRuns>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
 params?: PrivatePlatformListRunsParams, options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privatePlatformListRuns>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivatePlatformListRunsQueryOptions(params,options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateWatchlistListQueryKey = () => {
    return [
    `${getBaseUrl()}/v1/watchlist`
    ] as const;
    }


export const getPrivateWatchlistListQueryOptions = <TData = Awaited<ReturnType<typeof privateWatchlistList>>, TError = globalThis.Error & { info?: Problem; status?: number }>( options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateWatchlistList>>, TError, TData>>, fetch?: RequestInit}
) => {

const {query: queryOptions, fetch: fetchOptions} = options ?? {};

  const queryKey =  queryOptions?.queryKey ?? getPrivateWatchlistListQueryKey();



    const queryFn: QueryFunction<Awaited<ReturnType<typeof privateWatchlistList>>> = ({ signal }) => privateWatchlistList({ signal, ...fetchOptions });





   return  { queryKey, queryFn, ...queryOptions} as UseQueryOptions<Awaited<ReturnType<typeof privateWatchlistList>>, TError, TData> & { queryKey: DataTag<QueryKey, TData, TError> }
}

export type PrivateWatchlistListQueryResult = NonNullable<Awaited<ReturnType<typeof privateWatchlistList>>>
export type PrivateWatchlistListQueryError = globalThis.Error & { info?: Problem; status?: number }


export function usePrivateWatchlistList<TData = Awaited<ReturnType<typeof privateWatchlistList>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options: { query:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateWatchlistList>>, TError, TData>> & Pick<
        DefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateWatchlistList>>,
          TError,
          Awaited<ReturnType<typeof privateWatchlistList>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  DefinedUseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateWatchlistList<TData = Awaited<ReturnType<typeof privateWatchlistList>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateWatchlistList>>, TError, TData>> & Pick<
        UndefinedInitialDataOptions<
          Awaited<ReturnType<typeof privateWatchlistList>>,
          TError,
          Awaited<ReturnType<typeof privateWatchlistList>>
        > , 'initialData'
      >, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }
export function usePrivateWatchlistList<TData = Awaited<ReturnType<typeof privateWatchlistList>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateWatchlistList>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
  ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> }

export function usePrivateWatchlistList<TData = Awaited<ReturnType<typeof privateWatchlistList>>, TError = globalThis.Error & { info?: Problem; status?: number }>(
  options?: { query?:Partial<UseQueryOptions<Awaited<ReturnType<typeof privateWatchlistList>>, TError, TData>>, fetch?: RequestInit}
 , queryClient?: QueryClient
 ):  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> } {

  const queryOptions = getPrivateWatchlistListQueryOptions(options)

  const query = useQuery(queryOptions, queryClient) as  UseQueryResult<TData, TError> & { queryKey: DataTag<QueryKey, TData, TError> };

  return withQueryKey(query, queryOptions.queryKey);
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





export const getPrivateWatchlistPutMutationKey = () => ['privateWatchlistPut'] as const;

export const getPrivateWatchlistPutMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateWatchlistPut>>, TError,PrivateWatchlistPutMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privateWatchlistPut>>, TError,PrivateWatchlistPutMutationVariables, TContext> => {

const mutationKey = getPrivateWatchlistPutMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privateWatchlistPut>>, PrivateWatchlistPutMutationVariables> = (props) => {
          const {symbol,data} = props ?? {};

          return  privateWatchlistPut(symbol,data,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivateWatchlistPutMutationResult = NonNullable<Awaited<ReturnType<typeof privateWatchlistPut>>>
    export type PrivateWatchlistPutMutationBody = WatchItem
    export type PrivateWatchlistPutMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivateWatchlistPutMutationVariables = {symbol: string;data: WatchItem}

    export const usePrivateWatchlistPut = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateWatchlistPut>>, TError,PrivateWatchlistPutMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privateWatchlistPut>>,
        TError,
        PrivateWatchlistPutMutationVariables,
        TContext
      > => {
      return useMutation(getPrivateWatchlistPutMutationOptions(options), queryClient);
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





export const getPrivateWatchlistRemoveMutationKey = () => ['privateWatchlistRemove'] as const;

export const getPrivateWatchlistRemoveMutationOptions = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateWatchlistRemove>>, TError,PrivateWatchlistRemoveMutationVariables, TContext>, fetch?: RequestInit}
): UseMutationOptions<Awaited<ReturnType<typeof privateWatchlistRemove>>, TError,PrivateWatchlistRemoveMutationVariables, TContext> => {

const mutationKey = getPrivateWatchlistRemoveMutationKey();
const {mutation: mutationOptions, fetch: fetchOptions} = options ?
      options.mutation && 'mutationKey' in options.mutation && options.mutation.mutationKey ?
      options
      : {...options, mutation: {...options.mutation, mutationKey}}
      : {mutation: { mutationKey, }, fetch: undefined};




      const mutationFn: MutationFunction<Awaited<ReturnType<typeof privateWatchlistRemove>>, PrivateWatchlistRemoveMutationVariables> = (props) => {
          const {symbol} = props ?? {};

          return  privateWatchlistRemove(symbol,fetchOptions)
        }






  return  { mutationFn, ...mutationOptions }}

    export type PrivateWatchlistRemoveMutationResult = NonNullable<Awaited<ReturnType<typeof privateWatchlistRemove>>>

    export type PrivateWatchlistRemoveMutationError = globalThis.Error & { info?: Problem; status?: number }
    export type PrivateWatchlistRemoveMutationVariables = {symbol: string}

    export const usePrivateWatchlistRemove = <TError = globalThis.Error & { info?: Problem; status?: number },
    TContext = unknown>(options?: { mutation?:UseMutationOptions<Awaited<ReturnType<typeof privateWatchlistRemove>>, TError,PrivateWatchlistRemoveMutationVariables, TContext>, fetch?: RequestInit}
 , queryClient?: QueryClient): UseMutationResult<
        Awaited<ReturnType<typeof privateWatchlistRemove>>,
        TError,
        PrivateWatchlistRemoveMutationVariables,
        TContext
      > => {
      return useMutation(getPrivateWatchlistRemoveMutationOptions(options), queryClient);
    }

