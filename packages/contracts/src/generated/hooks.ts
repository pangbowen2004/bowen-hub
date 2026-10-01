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
  Problem,
  Run,
  RunPage,
  WatchItem
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

