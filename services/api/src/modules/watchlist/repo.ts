import type { WatchItem } from "@bowen-hub/contracts";
import { asc, eq } from "drizzle-orm";
import { watchItems } from "../../db/schema/domain";
import { database } from "../../lib/db";

export async function list(binding: D1Database): Promise<WatchItem[]> {
  const rows = await database(binding)
    .select()
    .from(watchItems)
    .orderBy(asc(watchItems.group), asc(watchItems.symbol));
  return rows.map((row) => ({
    ...row,
    kind: row.kind as WatchItem["kind"],
    aliases: JSON.parse(row.aliases) as string[],
  }));
}
export async function putMany(binding: D1Database, items: WatchItem[]): Promise<void> {
  const db = database(binding);
  const statements = items.map((item) => {
    const values = { ...item, aliases: JSON.stringify(item.aliases) };
    return db
      .insert(watchItems)
      .values(values)
      .onConflictDoUpdate({ target: watchItems.symbol, set: values });
  });
  const [first, ...rest] = statements;
  if (first) await db.batch([first, ...rest]);
}
export async function remove(binding: D1Database, symbol: string): Promise<void> {
  await database(binding).delete(watchItems).where(eq(watchItems.symbol, symbol));
}
