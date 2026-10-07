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
import { groupStudies, studyGraph } from "@bowen-hub/ui/react/Universe3D";

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
let catalogPromise: Promise<PapersCatalog> | undefined;
let graphPromise: Promise<GraphData> | undefined;
let searchPromise: Promise<SearchIndex> | undefined;
const paperPromises = new Map<string, Promise<Paper>>();
// 一次构建内复用公开投影；公开范围始终由API状态决定。
export function getCatalog(): Promise<PapersCatalog> {
  catalogPromise ??=
    source === "api"
      ? publicPapersGetCatalog()
      : fixture("PapersCatalog.public.json").then((value) => CatalogSchema.parse(value));
  return catalogPromise;
}
export function getPaper(id: string): Promise<Paper> {
  let pending = paperPromises.get(id);
  if (!pending) {
    pending = loadPaper(id);
    paperPromises.set(id, pending);
  }
  return pending;
}
async function loadPaper(id: string): Promise<Paper> {
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
export function getGraph(): Promise<GraphData> {
  graphPromise ??=
    source === "api"
      ? publicPapersGetGraph()
      : fixture("GraphData.public.json").then((value) => GraphSchema.parse(value));
  return graphPromise;
}
export function getSearchIndex(): Promise<SearchIndex> {
  searchPromise ??=
    source === "api"
      ? publicPapersGetSearchIndex()
      : fixture("SearchIndex.public.json").then((value) => SearchSchema.parse(value));
  return searchPromise;
}

export async function getStudyCatalog(): Promise<PapersCatalog> {
  const catalog = await getCatalog();
  return {
    ...catalog,
    papers: groupStudies(catalog.papers.filter((p) => p.visibility === "public")).map(
      (group) => group.paper,
    ),
  };
}
export async function getStudyGraph(): Promise<GraphData> {
  return studyGraph(
    await getGraph(),
    (await getCatalog()).papers.filter((p) => p.visibility === "public"),
  );
}
export async function getVisibleVersions(id: string) {
  const catalog = await getCatalog();
  return (
    groupStudies(catalog.papers.filter((p) => p.visibility === "public")).find((group) =>
      group.versions.some((p) => p.id === id),
    )?.versions ?? []
  );
}
