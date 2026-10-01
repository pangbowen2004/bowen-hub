import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
import type { GraphData, Paper, PapersCatalog, SearchIndex } from "@bowen-hub/contracts";
import {
  configureClient,
  publicPapersGetCatalog,
  publicPapersGetGraph,
  publicPapersGetPaper,
  publicPapersGetSearchIndex,
} from "@bowen-hub/contracts/client";
import {
  PapersCatalog as CatalogSchema,
  GraphData as GraphSchema,
  Paper as PaperSchema,
  SearchIndex as SearchSchema,
} from "@bowen-hub/contracts/zod";

const source = process.env.DATA_SOURCE ?? "fixtures";
if (!["fixtures", "api"].includes(source)) throw new Error("DATA_SOURCE只支持fixtures或api");
if (source === "api") {
  if (!process.env.HUB_API_URL) throw new Error("DATA_SOURCE=api需要HUB_API_URL");
  configureClient({ baseUrl: process.env.HUB_API_URL });
}
async function fixture(name: string): Promise<unknown> {
  return JSON.parse(
    await readFile(resolve(process.cwd(), `../../fixtures/samples/papers/${name}`), "utf8"),
  );
}
export async function getCatalog(): Promise<PapersCatalog> {
  return source === "api"
    ? publicPapersGetCatalog()
    : CatalogSchema.parse(await fixture("PapersCatalog.public.json"));
}
export async function getPaper(id: string): Promise<Paper> {
  const catalog = await getCatalog();
  if (!catalog.papers.some((paper) => paper.id === id && paper.visibility === "public"))
    throw new Error("公开论文不存在");
  const paper =
    source === "api"
      ? await publicPapersGetPaper(id)
      : PaperSchema.parse(await fixture(`Paper.${id}.json`));
  if (paper.status.visibility !== "public") throw new Error("公开论文不存在");
  return paper;
}
export async function getGraph(): Promise<GraphData> {
  return source === "api"
    ? publicPapersGetGraph()
    : GraphSchema.parse(await fixture("GraphData.public.json"));
}
export async function getSearchIndex(): Promise<SearchIndex> {
  return source === "api"
    ? publicPapersGetSearchIndex()
    : SearchSchema.parse(await fixture("SearchIndex.public.json"));
}
