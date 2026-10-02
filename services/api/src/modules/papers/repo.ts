// 论文存取只用绑定SQL；大文档返回原始JSON文本。
import type {
  GraphData,
  PaperPatch,
  PaperPrivate,
  PaperSummary,
  PaperWrite,
  Review,
  Upload,
} from "@bowen-hub/contracts";
export async function getPaper(
  db: D1Database,
  id: string,
  publicOnly = false,
): Promise<string | null> {
  // 降序移除关系数组项，避免下标移动；只修改公开响应，不覆盖原始文档。
  const statement = publicOnly
    ? db
        .prepare(`
    WITH RECURSIVE hidden AS (
      SELECT row_number() OVER(ORDER BY CAST(r.key AS INTEGER) DESC) AS seq,
        '$.relations['||r.key||']' AS path
      FROM papers AS p, json_each(p.doc,'$.relations') AS r
      WHERE p.id=? AND p.visibility='public'
        AND NOT EXISTS(SELECT 1 FROM papers AS target
          WHERE target.id=json_extract(r.value,'$.target') AND target.visibility='public')
    ), filtered(doc,seq) AS (
      SELECT doc,0 FROM papers WHERE id=? AND visibility='public'
      UNION ALL SELECT json_remove(filtered.doc,hidden.path),hidden.seq
        FROM filtered JOIN hidden ON hidden.seq=filtered.seq+1
    ) SELECT doc FROM filtered ORDER BY seq DESC LIMIT 1
  `)
        .bind(id, id)
    : db.prepare("SELECT doc FROM papers WHERE id=?").bind(id);
  const row = await statement.first<{ doc: string }>();
  return row?.doc ?? null;
}
export async function putPaper(db: D1Database, raw: string, value: PaperWrite): Promise<void> {
  const p = value.paper,
    s = value.summary;
  await db
    .prepare(
      "INSERT INTO papers(id,visibility,review,reading_depth,year,spaces,updated_at,summary,doc) VALUES(?,?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET visibility=excluded.visibility,review=excluded.review,reading_depth=excluded.reading_depth,year=excluded.year,spaces=excluded.spaces,updated_at=excluded.updated_at,summary=excluded.summary,doc=excluded.doc",
    )
    .bind(
      p.id,
      p.status.visibility,
      p.status.review,
      p.status.readingDepth,
      p.meta.year ?? null,
      JSON.stringify(p.spaces ?? []),
      p.status.updatedAt,
      JSON.stringify(s),
      raw,
    )
    .run();
}
export async function patchPaper(
  db: D1Database,
  id: string,
  patch: PaperPatch,
  today: string,
): Promise<void> {
  const columns: string[] = ["updated_at=?"],
    values: unknown[] = [today];
  const doc: string[] = ["'$.status.updatedAt',?"],
    summary: string[] = ["'$.updatedAt',?"],
    dv: unknown[] = [today],
    sv: unknown[] = [today];
  for (const key of ["visibility", "readingDepth", "spaces", "nextAction"] as const) {
    const v = patch[key];
    if (v === undefined) continue;
    const isArray = key === "spaces";
    doc.push(`'$.${isArray ? "spaces" : `status.${key}`}',${isArray ? "json(?)" : "?"}`);
    dv.push(isArray ? JSON.stringify(v) : v);
    if (key !== "nextAction") {
      summary.push(`'$.${key}',${isArray ? "json(?)" : "?"}`);
      sv.push(isArray ? JSON.stringify(v) : v);
      columns.push(`${key === "readingDepth" ? "reading_depth" : key}=?`);
      values.push(isArray ? JSON.stringify(v) : v);
    }
  }
  await db
    .prepare(
      `UPDATE papers SET ${columns.join(",")},doc=json_set(doc,${doc.join(",")}),summary=json_set(summary,${summary.join(",")}) WHERE id=?`,
    )
    .bind(...values, ...dv, ...sv, id)
    .run();
}
export interface ListQuery {
  limit: number;
  visibility?: string;
  review?: string;
  space?: string;
  q?: string;
  cursor?: { updatedAt: string; id: string };
}
export async function listPapers(db: D1Database, q: ListQuery): Promise<PaperSummary[]> {
  const where: string[] = [],
    args: unknown[] = [];
  for (const key of ["visibility", "review"] as const)
    if (q[key] !== undefined) {
      where.push(`${key}=?`);
      args.push(q[key]);
    }
  if (q.space !== undefined) {
    where.push("EXISTS(SELECT 1 FROM json_each(papers.spaces) WHERE value=?)");
    args.push(q.space);
  }
  if (q.q?.trim()) {
    where.push("id IN(SELECT id FROM papers_fts WHERE papers_fts MATCH ?)");
    args.push(`"${q.q.replaceAll('"', '""')}"`);
  }
  if (q.cursor) {
    where.push("(updated_at<? OR(updated_at=? AND id<?))");
    args.push(q.cursor.updatedAt, q.cursor.updatedAt, q.cursor.id);
  }
  const rows = await db
    .prepare(
      `SELECT summary FROM papers ${where.length ? `WHERE ${where.join(" AND ")}` : ""} ORDER BY updated_at DESC,id DESC LIMIT ?`,
    )
    .bind(...args, q.limit)
    .all<{ summary: string }>();
  return rows.results.map((r) => JSON.parse(r.summary) as PaperSummary);
}
export async function publicIds(db: D1Database): Promise<Set<string>> {
  const rows = await db
    .prepare("SELECT id FROM papers WHERE visibility='public'")
    .all<{ id: string }>();
  return new Set(rows.results.map((r) => r.id));
}
export async function getPrivate(db: D1Database, id: string): Promise<PaperPrivate | null> {
  const r = await db
    .prepare("SELECT mastery,notes,explanations,legacy_cards FROM paper_private WHERE id=?")
    .bind(id)
    .first<{
      mastery: PaperPrivate["mastery"];
      notes: string;
      explanations: string;
      legacy_cards: string;
    }>();
  return r
    ? {
        schemaVersion: 1,
        mastery: r.mastery,
        notes: r.notes,
        explanations: JSON.parse(r.explanations),
        legacyCards: JSON.parse(r.legacy_cards),
      }
    : null;
}
export async function putPrivate(db: D1Database, id: string, p: PaperPrivate): Promise<void> {
  await db
    .prepare(
      "INSERT INTO paper_private(id,mastery,notes,explanations,legacy_cards) VALUES(?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET mastery=excluded.mastery,notes=excluded.notes,explanations=excluded.explanations,legacy_cards=excluded.legacy_cards",
    )
    .bind(id, p.mastery, p.notes, JSON.stringify(p.explanations), JSON.stringify(p.legacyCards))
    .run();
}
export async function updatePrivate(
  db: D1Database,
  id: string,
  mastery: PaperPrivate["mastery"],
  notes: string,
): Promise<void> {
  await db
    .prepare(
      "INSERT INTO paper_private(id,mastery,notes,explanations,legacy_cards) VALUES(?,?,?,'[]','[]') ON CONFLICT(id) DO UPDATE SET mastery=excluded.mastery,notes=excluded.notes",
    )
    .bind(id, mastery, notes)
    .run();
}
export async function appendExplanation(db: D1Database, id: string, raw: string): Promise<void> {
  await db
    .prepare(
      "INSERT INTO paper_private(id,mastery,notes,explanations,legacy_cards) VALUES(?,'pending','',json_array(json(?)),'[]') ON CONFLICT(id) DO UPDATE SET explanations=json_insert(explanations,'$[#]',json(?))",
    )
    .bind(id, raw, raw)
    .run();
}
export async function patchExplanation(
  db: D1Database,
  id: string,
  eid: string,
  status: string,
): Promise<void> {
  await db
    .prepare(
      "UPDATE paper_private SET explanations=json_set(explanations,'$['||(SELECT key FROM json_each(explanations) WHERE json_extract(value,'$.id')=? LIMIT 1)||'].status',?) WHERE id=?",
    )
    .bind(eid, status, id)
    .run();
}
export async function reviews(db: D1Database, id: string): Promise<Review[]> {
  const rows = await db
    .prepare("SELECT payload FROM paper_reviews WHERE paper_id=? ORDER BY created_at DESC,id DESC")
    .bind(id)
    .all<{ payload: string }>();
  return rows.results.map((r) => JSON.parse(r.payload) as Review);
}
export async function putReview(db: D1Database, id: string, r: Review): Promise<void> {
  await db
    .prepare(
      "INSERT INTO paper_reviews(id,paper_id,created_at,payload) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,created_at=excluded.created_at WHERE paper_reviews.paper_id=excluded.paper_id",
    )
    .bind(r.id, id, r.createdAt, JSON.stringify(r))
    .run();
}
interface UploadRow {
  id: string;
  filename: string | null;
  arxiv_url: string | null;
  status: Upload["status"];
  error: string | null;
  paper_id: string | null;
  created_at: string;
  updated_at: string;
}
const upload = (r: UploadRow): Upload => ({
  id: r.id,
  filename: r.filename,
  arxivUrl: r.arxiv_url,
  status: r.status,
  error: r.error,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
  ...(r.paper_id ? { paperId: r.paper_id } : {}),
});
export async function getUpload(db: D1Database, id: string): Promise<Upload | null> {
  const r = await db.prepare("SELECT * FROM paper_uploads WHERE id=?").bind(id).first<UploadRow>();
  return r ? upload(r) : null;
}
export async function listUploads(db: D1Database, status?: string): Promise<Upload[]> {
  const statement = db.prepare(
    `SELECT * FROM paper_uploads ${status ? "WHERE status=?" : ""} ORDER BY created_at DESC,id DESC`,
  );
  const rows = await (status ? statement.bind(status) : statement).all<UploadRow>();
  return rows.results.map(upload);
}
export async function saveUpload(db: D1Database, u: Upload): Promise<void> {
  await db
    .prepare(
      "INSERT INTO paper_uploads(id,filename,arxiv_url,status,error,paper_id,created_at,updated_at) VALUES(?,?,?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET status=excluded.status,error=excluded.error,paper_id=excluded.paper_id,updated_at=excluded.updated_at",
    )
    .bind(
      u.id,
      u.filename,
      u.arxivUrl,
      u.status,
      u.error,
      u.paperId ?? null,
      u.createdAt,
      u.updatedAt,
    )
    .run();
}
export async function queueFailed(db: D1Database, id: string, at: string): Promise<boolean> {
  const result = await db
    .prepare(
      "UPDATE paper_uploads SET status='queued',error=NULL,updated_at=? WHERE id=? AND status='failed'",
    )
    .bind(at, id)
    .run();
  return result.meta.changes === 1;
}

export async function reviewOwner(db: D1Database, id: string): Promise<string | null> {
  const row = await db
    .prepare("SELECT paper_id FROM paper_reviews WHERE id=?")
    .bind(id)
    .first<{ paper_id: string }>();
  return row?.paper_id ?? null;
}

export async function publicCooccurrence(
  db: D1Database,
  edges: GraphData["edges"],
): Promise<GraphData["cooccurrence"]> {
  const rows = await db
    .prepare(`
    WITH discusses AS (
      SELECT DISTINCT json_extract(e.value,'$.source') AS paper,
        json_extract(e.value,'$.target') AS concept
      FROM json_each(?) e
      JOIN papers p ON p.id=json_extract(e.value,'$.source') AND p.visibility='public'
      WHERE json_extract(e.value,'$.type')='discusses'
    )
    SELECT a.concept AS source,b.concept AS target,COUNT(*) AS count
    FROM discusses a JOIN discusses b ON a.paper=b.paper AND a.concept<b.concept
    GROUP BY a.concept,b.concept ORDER BY a.concept,b.concept
  `)
    .bind(JSON.stringify(edges))
    .all<GraphData["cooccurrence"][number]>();
  return rows.results;
}

// SQL投影让问答只读取公开稿所需的导读、证据与真实PDF页数。
export async function getQaContext(db: D1Database, id: string): Promise<string | null> {
  const row = await db
    .prepare(
      "SELECT json_object('guide',json_extract(doc,'$.guide'),'evidence',json_object('claims',json_extract(doc,'$.evidence.claims')),'structure',json_object('pageCount',json_extract(doc,'$.structure.pageCount'))) AS doc FROM papers WHERE id=?",
    )
    .bind(id)
    .first<{ doc: string }>();
  return row?.doc ?? null;
}
