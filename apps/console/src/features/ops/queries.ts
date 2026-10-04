// 运维页的数据读取：全部走生成的客户端，各分区各读各的，一个失败不拖累其他。
import {
  privateNewsListSources,
  privatePlatformGetAiUsage,
  privatePlatformListCapabilities,
  privatePlatformListEvals,
  privatePlatformListRuns,
} from "@bowen-hub/contracts/client";
import { useInfiniteQuery, useQuery } from "@tanstack/react-query";

export const opsKey = ["ops"] as const;

export function useRuns(job: string) {
  return useInfiniteQuery({
    queryKey: [...opsKey, "runs", job],
    initialPageParam: undefined as string | undefined,
    queryFn: ({ pageParam, signal }) =>
      privatePlatformListRuns({ job: job || undefined, cursor: pageParam, limit: 20 }, { signal }),
    getNextPageParam: (page) => page.nextCursor ?? undefined,
  });
}
export function useUsage(days: number) {
  return useQuery({
    queryKey: [...opsKey, "usage", days],
    queryFn: ({ signal }) => privatePlatformGetAiUsage({ days }, { signal }),
  });
}
export function useSources() {
  return useQuery({
    queryKey: [...opsKey, "sources"],
    queryFn: ({ signal }) => privateNewsListSources({ signal }),
  });
}
export function useCapabilities() {
  return useQuery({
    queryKey: [...opsKey, "capabilities"],
    queryFn: ({ signal }) => privatePlatformListCapabilities({ signal }),
  });
}
export function useEvals() {
  return useQuery({
    queryKey: [...opsKey, "evals"],
    queryFn: ({ signal }) => privatePlatformListEvals(undefined, { signal }),
  });
}
