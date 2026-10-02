// 服务用例：存取、局部写入与任务触发，不在Worker重算论文派生内容。
import { Buffer } from "node:buffer";
import type {
  GraphData,
  PaperExplanation,
  PaperExplanationCreate,
  PaperPatch,
  PaperPrivate,
  PaperPrivateWrite,
  PapersCatalog,
  PaperUploadPatch,
  PaperWrite,
  Review,
  SearchIndex,
  Upload,
} from "@bowen-hub/contracts";
import {
  PapersCatalog as CatalogSchema,
  GraphData as GraphSchema,
  SearchIndex as SearchSchema,
  PaperStatus as StatusSchema,
  PaperSummary as SummarySchema,
} from "@bowen-hub/contracts/zod";
import type { Bindings } from "../../lib/env";
import { dispatch } from "../../lib/github";
import { ApiError } from "../../lib/problem";
import { readFile, writeFile } from "../../lib/r2";
import { getDocument } from "../platform/service";
import * as repo from "./repo";
export function safeId(id: string): string {
  if (
    !id ||
    id === "." ||
    id === ".." ||
    /[/\\]/.test(id) ||
    [...id].some((c) => c.charCodeAt(0) < 32)
  )
    throw new ApiError(400, "论文标识无效");
  return id;
}
export async function getPaper(db: D1Database, id: string, publicOnly = false): Promise<string> {
  const raw = await repo.getPaper(db, safeId(id), publicOnly);
  if (raw === null) throw new ApiError(404, "论文不存在");
  return raw;
}
export async function putPaper(db: D1Database, id: string, value: unknown): Promise<void> {
  safeId(id);
  const v = value as PaperWrite;
  if (
    !v ||
    typeof v !== "object" ||
    !v.paper ||
    !v.summary ||
    v.paper.id !== id ||
    v.summary.id !== id ||
    (v.paper.schemaVersion !== undefined && v.paper.schemaVersion !== 1) ||
    !v.paper.status ||
    !v.paper.meta ||
    typeof v.paper.meta.title !== "string"
  )
    throw new ApiError(400, "论文主键或版本不符合契约");
  if (!StatusSchema.safeParse(v.paper.status).success)
    throw new ApiError(400, "论文状态不符合契约");
  const summary = SummarySchema.safeParse(v.summary);
  if (!summary.success) throw new ApiError(400, "论文摘要不符合契约");
  const s = summary.data,
    p = v.paper;
  if (
    p.meta.title !== s.title ||
    (p.meta.year ?? null) !== s.year ||
    p.status.visibility !== s.visibility ||
    p.status.review !== s.review ||
    p.status.readingDepth !== s.readingDepth ||
    p.status.updatedAt !== s.updatedAt ||
    JSON.stringify(p.spaces ?? []) !== JSON.stringify(s.spaces)
  )
    throw new ApiError(400, "论文与摘要状态不一致");
  for (const field of ["private", "notes", "mastery", "explanations", "legacyCards"])
    if (field in p) throw new ApiError(400, "私人字段必须单独存储");
  await repo.putPaper(db, JSON.stringify(p), { paper: p, summary: s });
}
function cursor(raw: string): { updatedAt: string; id: string } {
  try {
    const p = JSON.parse(Buffer.from(raw, "base64url").toString("utf8")) as {
      updatedAt?: unknown;
      id?: unknown;
    };
    if (typeof p.updatedAt !== "string" || typeof p.id !== "string") throw new Error();
    return { updatedAt: p.updatedAt, id: p.id };
  } catch {
    throw new ApiError(400, "分页游标无效");
  }
}
export async function listPapers(
  db: D1Database,
  q: {
    limit: number;
    visibility?: string;
    review?: string;
    space?: string;
    q?: string;
    cursor?: string;
  },
) {
  if (q.q?.includes("\0")) throw new ApiError(400, "搜索词无效");
  const rows = await repo.listPapers(db, {
    ...q,
    limit: q.limit + 1,
    cursor: q.cursor === undefined ? undefined : cursor(q.cursor),
  });
  const items = rows.slice(0, q.limit),
    last = items.at(-1);
  return {
    items,
    nextCursor:
      rows.length > q.limit && last
        ? Buffer.from(JSON.stringify({ updatedAt: last.updatedAt, id: last.id })).toString(
            "base64url",
          )
        : null,
  };
}
export async function patchPaper(env: Bindings, id: string, p: PaperPatch): Promise<string> {
  await getPaper(env.DB, id);
  await repo.patchPaper(env.DB, id, p, new Date().toISOString().slice(0, 10));
  if (p.visibility !== undefined || p.spaces !== undefined)
    await dispatch(env, "papers-changed", { id });
  return getPaper(env.DB, id);
}
export async function getPrivate(db: D1Database, id: string): Promise<PaperPrivate> {
  await getPaper(db, id);
  return (
    (await repo.getPrivate(db, id)) ?? {
      schemaVersion: 1,
      mastery: "pending",
      notes: "",
      explanations: [],
      legacyCards: [],
    }
  );
}
export async function putPrivate(db: D1Database, id: string, p: PaperPrivate): Promise<void> {
  await getPaper(db, id);
  await repo.putPrivate(db, id, p);
}
export async function updatePrivate(
  db: D1Database,
  id: string,
  p: PaperPrivateWrite,
): Promise<PaperPrivate> {
  await getPaper(db, id);
  await repo.updatePrivate(db, id, p.mastery, p.notes);
  return getPrivate(db, id);
}
export async function createExplanation(
  db: D1Database,
  id: string,
  p: PaperExplanationCreate,
): Promise<PaperExplanation> {
  await getPaper(db, id);
  const v: PaperExplanation = {
    ...p,
    id: crypto.randomUUID(),
    createdAt: new Date().toISOString(),
    status: "pending",
  };
  await repo.appendExplanation(db, id, JSON.stringify(v));
  return v;
}
export async function patchExplanation(
  db: D1Database,
  id: string,
  eid: string,
  status: PaperExplanation["status"],
): Promise<PaperExplanation> {
  const p = await getPrivate(db, id);
  if (!p.explanations.some((e) => e.id === eid)) throw new ApiError(404, "解释卡不存在");
  await repo.patchExplanation(db, id, eid, status);
  const value = (await getPrivate(db, id)).explanations.find((e) => e.id === eid);
  if (!value) throw new ApiError(404, "解释卡不存在");
  return value;
}
export async function reviews(db: D1Database, id: string): Promise<Review[]> {
  await getPaper(db, id);
  return repo.reviews(db, id);
}
export async function putReview(db: D1Database, id: string, p: Review): Promise<void> {
  await getPaper(db, id);
  const owner = await repo.reviewOwner(db, p.id);
  if (owner !== null && owner !== id) throw new ApiError(409, "审核记录已属于其他论文");
  await repo.putReview(db, id, p);
}
export async function derived(
  db: D1Database,
  name: "catalog" | "graph" | "search",
  publicOnly: boolean,
): Promise<string> {
  const raw = await getDocument(db, `papers.${name}.${publicOnly ? "public" : "all"}`);
  if (raw === null) throw new ApiError(404, "论文派生文档尚未生成");
  // 通用documents允许未知JSON，领域读取必须先验证对应生成契约。
  let json: unknown;
  try {
    json = JSON.parse(raw);
  } catch {
    throw new ApiError(404, "论文派生文档格式无效");
  }
  const checked = { catalog: CatalogSchema, graph: GraphSchema, search: SearchSchema }[
    name
  ].safeParse(json);
  if (!checked.success) throw new ApiError(404, "论文派生文档格式无效");
  if (!publicOnly) return raw;
  const ids = await repo.publicIds(db);
  if (name === "search") {
    const value = checked.data as SearchIndex;
    return JSON.stringify({ papers: value.papers.filter((p) => ids.has(p.id)) });
  }
  if (name === "catalog") {
    const value = checked.data as PapersCatalog;
    const papers = value.papers.filter((p) => ids.has(p.id));
    if (papers.length === value.papers.length) return JSON.stringify(value);
    const visibleGraph = JSON.parse(await derived(db, "graph", true)) as GraphData;
    const spaces = value.spaces.map((s) => ({
      ...s,
      paperCount: papers.filter((p) => p.spaces.includes(s.id)).length,
    }));
    return JSON.stringify({
      ...value,
      papers,
      spaces,
      stats: {
        ...value.stats,
        paperCount: papers.length,
        spaceCount: spaces.length,
        conceptCount: visibleGraph.nodes.filter((n) => n.kind === "concept").length,
        edgeCount: visibleGraph.edges.length,
      },
    });
  }
  const graph = checked.data as GraphData;
  const edges = graph.edges.filter(
    (e) =>
      !(e.type === "relation" && (!ids.has(e.source) || !ids.has(e.target))) &&
      (e.type === "relation" || ids.has(e.source)),
  );
  const keep = new Set(edges.flatMap((e) => [e.source, e.target]));
  for (const id of ids) keep.add(id);
  const nodes = graph.nodes.filter((n) => keep.has(n.id) && (n.kind !== "paper" || ids.has(n.id)));
  const allowed = new Set(nodes.map((n) => n.id));
  const visibleEdges = edges.filter((e) => allowed.has(e.source) && allowed.has(e.target));
  // 可见性即时投影保留，统计交给D1，避免Worker枚举所有概念对。
  const cooccurrence = await repo.publicCooccurrence(db, visibleEdges);
  return JSON.stringify({ nodes, edges: visibleEdges, cooccurrence });
}
export async function getUpload(db: D1Database, id: string): Promise<Upload> {
  const u = await repo.getUpload(db, safeId(id));
  if (!u) throw new ApiError(404, "上传记录不存在");
  return u;
}
export const listUploads = repo.listUploads;
export async function patchUpload(
  db: D1Database,
  id: string,
  patch: PaperUploadPatch,
): Promise<void> {
  const u = await getUpload(db, id);
  if (patch.paperId !== undefined) {
    safeId(patch.paperId);
    if (u.paperId !== undefined && u.paperId !== patch.paperId)
      throw new ApiError(409, "上传已定论文标识不能替换");
  }
  await repo.saveUpload(db, { ...u, ...patch, updatedAt: new Date().toISOString() });
}
async function trigger(env: Bindings, u: Upload): Promise<Upload> {
  try {
    await dispatch(env, "papers-ingest", { uploadId: u.id });
    return u;
  } catch (error) {
    await repo.saveUpload(env.DB, {
      ...u,
      status: "failed",
      error: "入库任务触发失败",
      updatedAt: new Date().toISOString(),
    });
    throw error;
  }
}
export async function uploadPdf(
  env: Bindings,
  filename: string,
  body: ReadableStream | null,
  length?: number,
): Promise<Upload> {
  safeId(filename);
  if (!body) throw new ApiError(400, "PDF正文为空");
  const now = new Date().toISOString();
  const u: Upload = {
    id: crypto.randomUUID(),
    filename,
    arxivUrl: null,
    status: "queued",
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  await repo.saveUpload(env.DB, u);
  try {
    await writeFile(env.FILES, `uploads/${u.id}.pdf`, body, "application/pdf", length);
  } catch {
    await repo.saveUpload(env.DB, { ...u, status: "failed", error: "PDF存储失败" });
    throw new ApiError(502, "PDF存储失败");
  }
  return trigger(env, u);
}
export async function uploadArxiv(env: Bindings, url: string): Promise<Upload> {
  let u: URL;
  try {
    u = new URL(url);
  } catch {
    throw new ApiError(400, "arXiv链接无效");
  }
  if (
    u.protocol !== "https:" ||
    u.hostname !== "arxiv.org" ||
    u.port !== "" ||
    (u.pathname.startsWith("/abs/") && u.pathname.endsWith(".pdf")) ||
    u.username ||
    u.password ||
    u.search ||
    u.hash ||
    !/^\/(abs|pdf)\/(\d{4}\.\d{4,5}|[a-z-]+(?:\.[A-Z]{2})?\/[0-9]{7})(v[1-9]\d*)?(\.pdf)?$/.test(
      u.pathname,
    )
  )
    throw new ApiError(400, "仅支持arXiv论文链接");
  const now = new Date().toISOString();
  const value: Upload = {
    id: crypto.randomUUID(),
    filename: null,
    arxivUrl: u.toString(),
    status: "queued",
    error: null,
    createdAt: now,
    updatedAt: now,
  };
  await repo.saveUpload(env.DB, value);
  return trigger(env, value);
}
export async function retryUpload(env: Bindings, id: string): Promise<Upload> {
  await getUpload(env.DB, id);
  if (!(await repo.queueFailed(env.DB, id, new Date().toISOString())))
    throw new ApiError(409, "只能重试失败上传");
  return trigger(env, await getUpload(env.DB, id));
}
export async function revise(env: Bindings, id: string, instructions: string): Promise<void> {
  await getPaper(env.DB, id);
  await dispatch(env, "papers-revise", { id, instructions });
}
export async function file(env: Bindings, id: string, name: string): Promise<Response> {
  return readFile(env.FILES, `papers/${safeId(id)}/${name}`);
}
export async function uploadFile(env: Bindings, id: string): Promise<Response> {
  const u = await getUpload(env.DB, id);
  if (u.filename === null) throw new ApiError(404, "arXiv上传没有上传PDF文件");
  return readFile(env.FILES, `uploads/${u.id}.pdf`);
}
export async function writePaperFile(
  env: Bindings,
  id: string,
  name: string,
  body: ReadableStream | null,
  type: string,
  length?: number,
): Promise<void> {
  safeId(id);
  try {
    await writeFile(env.FILES, `papers/${id}/${name}`, body, type, length);
  } catch {
    throw new ApiError(502, "论文文件存储失败");
  }
}
