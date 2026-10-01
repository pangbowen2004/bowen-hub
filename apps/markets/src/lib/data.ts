import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type {
  MarketDay,
  MarketDaySummary,
  MarketReference,
  WeeklyReport,
  WeeklySummary,
} from "@bowen-hub/contracts";
import {
  configureClient,
  publicMarketsGetDay,
  publicMarketsGetLatestDay,
  publicMarketsGetReference,
  publicMarketsGetWeekly,
  publicMarketsListDays,
  publicMarketsListWeeklies,
} from "@bowen-hub/contracts/client";
import {
  MarketDay as DaySchema,
  MarketReference as ReferenceSchema,
  MarketDaySummary as SummarySchema,
  WeeklyReport as WeeklySchema,
} from "@bowen-hub/contracts/zod";

const source = process.env.DATA_SOURCE ?? "fixtures";
if (!["fixtures", "api"].includes(source)) throw new Error("DATA_SOURCE只支持fixtures或api");
if (source === "api") {
  if (!process.env.HUB_API_URL) throw new Error("DATA_SOURCE=api需要HUB_API_URL");
  configureClient({ baseUrl: process.env.HUB_API_URL });
}
async function fixture(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(resolve(process.cwd(), `../../fixtures/samples/markets/${name}`), "utf8"),
  );
}
export async function listDays(): Promise<MarketDaySummary[]> {
  if (source === "fixtures")
    return Promise.all(
      ["2026-08-28", "2026-08-27"].map(async (date) =>
        SummarySchema.parse(await fixture(`MarketDaySummary.${date}.json`)),
      ),
    );
  const rows: MarketDaySummary[] = [];
  let cursor: string | undefined;
  do {
    const page = await publicMarketsListDays({ limit: 100, cursor });
    rows.push(...page.items);
    cursor = page.nextCursor ?? undefined;
  } while (cursor);
  return rows;
}
export async function getDay(date?: string): Promise<MarketDay> {
  if (source === "api") return date ? publicMarketsGetDay(date) : publicMarketsGetLatestDay();
  return DaySchema.parse(await fixture(`MarketDay.${date ?? "2026-08-28"}.json`));
}
export async function listWeeklies(): Promise<WeeklySummary[]> {
  if (source === "api") return publicMarketsListWeeklies();
  const weekly = await getWeekly("2026-08-28");
  return [weekly];
}
export async function getWeekly(date: string): Promise<WeeklyReport> {
  return source === "api"
    ? publicMarketsGetWeekly(date)
    : WeeklySchema.parse(await fixture(`WeeklyReport.${date}.json`));
}
export async function getReference(): Promise<MarketReference> {
  return source === "api"
    ? publicMarketsGetReference()
    : ReferenceSchema.parse(await fixture("MarketReference.config.json"));
}
