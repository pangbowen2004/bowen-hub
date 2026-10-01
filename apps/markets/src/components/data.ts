import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { Hypothesis, IndexBar, MarketEvent } from "@bowen-hub/contracts";
import {
  publicMarketsListEvents,
  publicMarketsListHypotheses,
  publicMarketsListIndexBars,
} from "@bowen-hub/contracts/client";
import {
  IndexBar as BarSchema,
  MarketEvent as EventSchema,
  Hypothesis as HypothesisSchema,
} from "@bowen-hub/contracts/zod";

async function fixture(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(resolve(process.cwd(), `../../fixtures/samples/markets/${name}`), "utf8"),
  );
}
function array(value: unknown): unknown[] {
  if (!Array.isArray(value)) throw new Error("样例必须为数组");
  return value;
}
export async function hypotheses(): Promise<Hypothesis[]> {
  if (process.env.DATA_SOURCE !== "api")
    return array(await fixture("Hypothesis.ledger.json")).map((x) => HypothesisSchema.parse(x));
  const rows: Hypothesis[] = [];
  let cursor: string | undefined;
  do {
    const page = await publicMarketsListHypotheses({ limit: 100, cursor });
    rows.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return rows;
}
export async function events(): Promise<MarketEvent[]> {
  return process.env.DATA_SOURCE === "api"
    ? publicMarketsListEvents()
    : array(await fixture("MarketEvent.calendar.json")).map((x) => EventSchema.parse(x));
}
export async function indexBars(date: string): Promise<IndexBar[]> {
  const rows =
    process.env.DATA_SOURCE === "api"
      ? await publicMarketsListIndexBars("000001.SH", { limit: 250 })
      : array(await fixture("IndexBar.000001.sh.json")).map((x) => BarSchema.parse(x));
  return rows
    .filter((x) => x.date <= date)
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-250);
}

/** Archive projection hides facts settled after that day; it does not claim a saved snapshot. */
export function hypothesesAsOf(rows: Hypothesis[], date: string): Hypothesis[] {
  return rows
    .filter((x) => x.createdOn <= date)
    .map((x) =>
      x.settledOn && x.settledOn > date
        ? {
            ...x,
            result: "PENDING",
            settledOn: null,
            actual: null,
            resultNote: "截至该归档日尚未结算；后续结果请到验证中心查看。",
          }
        : x,
    );
}
