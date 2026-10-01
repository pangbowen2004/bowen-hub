import type { WatchItem } from "@bowen-hub/contracts";
import { ApiError } from "../../lib/problem";
import * as repo from "./repo";

export const list = repo.list;
export const batch = repo.putMany;
export const remove = repo.remove;
export async function put(
  binding: D1Database,
  symbol: string,
  item: WatchItem,
): Promise<WatchItem> {
  if (item.symbol !== symbol) throw new ApiError(400, "股票代码与路径不一致");
  await repo.putMany(binding, [item]);
  return item;
}
