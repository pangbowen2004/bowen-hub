// 真实Workers D1/R2与Hono路由；所有外部请求用离线假响应。
import { env } from "cloudflare:workers";
import type {
  GraphData,
  Paper,
  PaperPrivate,
  PaperSummary,
  PapersCatalog,
  PaperWrite,
} from "@bowen-hub/contracts";
import * as schemas from "@bowen-hub/contracts/zod";
import { afterEach, beforeEach, expect, it, vi } from "vitest";
import reviewFixture from "../../../../fixtures/samples/papers/Review.synthetic.json";
import { app } from "../../src/app";
import { handlers } from "../../src/modules/papers/routes";
import * as service from "../../src/modules/papers/service";
import { putDocument } from "../../src/modules/platform/service";
import { authenticatedCookie } from "../auth/fixture";

const paper = (id = "paper-1", visibility: Paper["status"]["visibility"] = "private"): Paper => ({
  schemaVersion: 1,
  id,
  meta: { title: `标题 ${id}` },
  status: {
    visibility,
    review: "draft",
    readingDepth: "R0",
    nextAction: "通读",
    updatedAt: "2026-10-02",
  },
  spaces: ["general-research"],
  guide: { oneSentence: "论据概述", article: "连续正文" },
  evidence: { claims: [] },
});
const summary = (p: Paper): PaperSummary => ({
  id: p.id,
  title: p.meta.title,
  titleZh: null,
  year: null,
  venue: null,
  oneSentence: p.guide?.oneSentence ?? null,
  spaces: p.spaces ?? [],
  readingDepth: p.status.readingDepth,
  paperKind: null,
  paperType: null,
  visibility: p.status.visibility,
  review: p.status.review,
  updatedAt: p.status.updatedAt,
  hasCode: false,
  conceptCount: 0,
});
const write = (p: Paper): PaperWrite => ({ paper: p, summary: summary(p) });
const request = async (path: string, method = "GET", body?: unknown, internal = false) =>
  app.request(
    `https://example.test/v1/${path}`,
    {
      method,
      headers: {
        ...(body === undefined ? {} : { "Content-Type": "application/json" }),
        ...(internal
          ? { Authorization: "Bearer test-service-token" }
          : path.startsWith("public/")
            ? {}
            : { Cookie: await authenticatedCookie(), Origin: env.AUTH_BASE_URL }),
      },
      body: body === undefined ? undefined : JSON.stringify(body),
    },
    env,
  );
beforeEach(async () => {
  for (const table of [
    "paper_private",
    "paper_reviews",
    "paper_uploads",
    "papers",
    "documents",
    "ai_calls",
  ])
    await env.DB.prepare(`DELETE FROM ${table}`).run();
  vi.spyOn(globalThis, "fetch").mockResolvedValue(new Response(null, { status: 204 }));
});
afterEach(() => vi.restoreAllMocks());
it("31个处理器全部登记，没有残留占位", () => {
  expect(Object.keys(handlers)).toHaveLength(31);
  expect(new Set(Object.keys(handlers)).size).toBe(31);
});
it("完整写入、原始读取、路径与摘要状态校验", async () => {
  const p = paper();
  expect((await request("internal/papers/paper-1", "PUT", write(p), true)).status).toBe(204);
  const r = await request("papers/paper-1");
  expect(r.status).toBe(200);
  expect(schemas.Paper.parse(await r.json())).toEqual(p);
  const bad = write(p);
  bad.summary.visibility = "public";
  expect((await request("internal/papers/paper-1", "PUT", bad, true)).status).toBe(400);
  expect((await request("internal/papers/different", "PUT", write(p), true)).status).toBe(400);
});
it("局部更新使用json_set，保留大正文，列与摘要同步且只派发公开变化", async () => {
  const p = paper();
  p.guide = { article: "保持正文".repeat(30000) };
  await service.putPaper(env.DB, p.id, write(p));
  const r = await request("papers/paper-1", "PATCH", {
    visibility: "public",
    spaces: ["quant-finance"],
    readingDepth: "R2",
    nextAction: "核查",
  });
  expect(r.status).toBe(200);
  expect(await r.json()).toMatchObject({
    guide: p.guide,
    status: { visibility: "public", readingDepth: "R2", nextAction: "核查" },
    spaces: ["quant-finance"],
  });
  const row = await env.DB.prepare(
    "SELECT visibility,reading_depth,spaces,summary FROM papers WHERE id=?",
  )
    .bind(p.id)
    .first<{ visibility: string; reading_depth: string; spaces: string; summary: string }>();
  expect(row?.visibility).toBe("public");
  expect(JSON.parse(row?.summary ?? "{}")).toMatchObject({
    visibility: "public",
    readingDepth: "R2",
    spaces: ["quant-finance"],
  });
  expect(vi.mocked(fetch).mock.calls[0]?.[1]?.body).toBe(
    JSON.stringify({ event_type: "papers-changed", client_payload: { id: p.id } }),
  );
});
it("列表稳定分页、筛选与FTS更新，不让NUL触发500", async () => {
  for (let i = 0; i < 25; i++)
    await service.putPaper(env.DB, `p-${i}`, write(paper(`p-${i}`, i % 2 ? "public" : "private")));
  const a = schemas.PaperPage.parse(await (await request("papers")).json());
  expect(a.items).toHaveLength(20);
  expect(a.nextCursor).not.toBeNull();
  const b = schemas.PaperPage.parse(await (await request(`papers?cursor=${a.nextCursor}`)).json());
  expect(b.items).toHaveLength(5);
  expect(new Set([...a.items, ...b.items].map((p) => p.id)).size).toBe(25);
  expect(
    (
      await service.listPapers(env.DB, {
        limit: 100,
        visibility: "public",
        space: "general-research",
        q: "标题",
      })
    ).items,
  ).toHaveLength(12);
  expect((await request("papers?q=%00")).status).toBe(400);
  expect((await request("papers?cursor=invalid")).status).toBe(400);
});
it("笔记只改掌握/notes，解释卡追加与状态修改保留迁移卡和出处", async () => {
  await service.putPaper(env.DB, "paper-1", write(paper()));
  const priv: PaperPrivate = {
    schemaVersion: 1,
    mastery: "pending",
    notes: "旧笔记",
    explanations: [],
    legacyCards: [{ title: "私人哨兵", markdown: "隐藏正文" }],
  };
  await service.putPrivate(env.DB, "paper-1", priv);
  const r = await request("papers/paper-1/private", "PUT", {
    mastery: "confirmed",
    notes: "新笔记",
  });
  expect(schemas.PaperPrivate.parse(await r.json()).legacyCards).toEqual(priv.legacyCards);
  const a = schemas.PaperExplanation.parse(
    await (
      await request("papers/paper-1/explanations", "POST", {
        question: "为何",
        answer: "论文说明",
        pages: [1],
        generatedBy: {
          capability: "papers.qa",
          version: 1,
          model: "test",
          at: new Date().toISOString(),
        },
      })
    ).json(),
  );
  expect(a.generatedBy?.model).toBe("test");
  expect(
    (await request(`papers/paper-1/explanations/${a.id}`, "PATCH", { status: "confirmed" })).status,
  ).toBe(200);
  expect((await service.getPrivate(env.DB, "paper-1")).explanations[0]?.status).toBe("confirmed");
  expect(
    (await request("papers/paper-1/explanations/absent", "PATCH", { status: "confirmed" })).status,
  ).toBe(404);
});
it("公开详情拒绝私有，公开撤销立即裁剪三种派生与孤立概念/边", async () => {
  const visible = paper("visible", "public"),
    hidden = paper("private-secret", "public");
  await service.putPaper(env.DB, visible.id, write(visible));
  await service.putPaper(env.DB, hidden.id, write(hidden));
  const graph: GraphData = {
    nodes: [
      { id: visible.id, kind: "paper", label: "公开" },
      { id: hidden.id, kind: "paper", label: "私有哨兵" },
      { id: "public-concept", kind: "concept", label: "公开概念" },
      { id: "secret-concept", kind: "concept", label: "隐藏概念" },
    ],
    edges: [
      { source: visible.id, target: "public-concept", type: "discusses" },
      { source: hidden.id, target: "secret-concept", type: "discusses" },
      { source: visible.id, target: hidden.id, type: "relation" },
    ],
    cooccurrence: [],
  };
  const catalog: PapersCatalog = {
    stats: { paperCount: 2, spaceCount: 0, conceptCount: 2, edgeCount: 3 },
    spaces: [],
    papers: [summary(visible), summary(hidden)],
  };
  await putDocument(env.DB, "papers.graph.public", JSON.stringify(graph));
  await putDocument(env.DB, "papers.catalog.public", JSON.stringify(catalog));
  await putDocument(
    env.DB,
    "papers.search.public",
    JSON.stringify({
      papers: [
        {
          id: visible.id,
          title: "公开",
          titleZh: null,
          authors: [],
          oneSentence: null,
          concepts: [],
          spaces: [],
        },
        {
          id: hidden.id,
          title: "私有哨兵",
          titleZh: null,
          authors: [],
          oneSentence: null,
          concepts: [],
          spaces: [],
        },
      ],
    }),
  );
  await service.patchPaper(env, hidden.id, { visibility: "private" });
  for (const route of ["catalog", "graph", "search-index"]) {
    const r = await request(`public/papers/${route}`);
    expect(r.status).toBe(200);
    const text = await r.text();
    expect(text).not.toContain("private-secret");
    expect(text).not.toContain("隐藏概念");
    expect(text).not.toContain("私有哨兵");
  }
  expect((await request("public/papers/private-secret")).status).toBe(404);
  expect((await request("public/papers/visible")).status).toBe(200);
});
it("服务令牌允许内部/私有读，禁止私有写；公开无令牌可读", async () => {
  expect(
    (
      await request(
        "papers/uploads/arxiv",
        "POST",
        { arxivUrl: "https://arxiv.org/abs/2505.07078" },
        true,
      )
    ).status,
  ).toBe(403);
  expect((await request("internal/papers/paper-1", "PUT", write(paper()))).status).toBe(401);
});
it("arXiv上传/retry保留id与paperId，严格域名及失败状态", async () => {
  const r = await request("papers/uploads/arxiv", "POST", {
    arxivUrl: "https://arxiv.org/abs/2505.07078v2",
  });
  const u = schemas.Upload.parse(await r.json());
  expect(u.status).toBe("queued");
  expect((await request(`papers/uploads/${u.id}/retry`, "POST")).status).toBe(409);
  await service.patchUpload(env.DB, u.id, {
    status: "failed",
    error: "审核失败",
    paperId: "arxiv-2505.07078-v2",
  });
  const retry = schemas.Upload.parse(
    await (await request(`papers/uploads/${u.id}/retry`, "POST")).json(),
  );
  expect(retry.id).toBe(u.id);
  expect(retry.paperId).toBe("arxiv-2505.07078-v2");
  expect(retry.error).toBeNull();
  for (const arxivUrl of [
    "https://arxiv.org.evil/abs/2505.07078",
    "https://arxiv.org@evil/abs/2505.07078",
    "http://arxiv.org/abs/2505.07078",
    "https://arxiv.org/abs/2505.07078?secret=x",
  ])
    expect((await request("papers/uploads/arxiv", "POST", { arxivUrl })).status).toBe(400);
  vi.mocked(fetch).mockResolvedValueOnce(new Response(null, { status: 500 }));
  expect(
    (
      await request("papers/uploads/arxiv", "POST", {
        arxivUrl: "https://arxiv.org/pdf/2505.07078",
      })
    ).status,
  ).toBe(502);
  expect((await service.listUploads(env.DB, "failed"))[0]?.error).toBe("入库任务触发失败");
});
it("20MB PDF真实流写入/读取，PNG及页文本媒体类型严格", async () => {
  const size = 20 * 1024 * 1024;
  let produced = 0;
  const stream = new ReadableStream<Uint8Array>({
    pull(controller) {
      if (produced === size) {
        controller.close();
        return;
      }
      const chunk = new Uint8Array(Math.min(65536, size - produced)).fill(77);
      produced += chunk.length;
      controller.enqueue(chunk);
    },
  });
  const r = await app.request(
    "https://example.test/v1/papers/uploads/paper.pdf",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(size),
        Cookie: await authenticatedCookie(),
        Origin: env.AUTH_BASE_URL,
      },
      body: stream,
    },
    env,
  );
  expect(r.status).toBe(200);
  const u = schemas.Upload.parse(await r.json());
  expect((await env.FILES.head(`uploads/${u.id}.pdf`))?.size).toBe(size);
  const download = await request(`internal/papers/uploads/${u.id}/file`, "GET", undefined, true);
  expect(download.headers.get("Content-Type")).toBe("application/pdf");
  const reader = download.body?.getReader();
  let received = 0;
  while (reader) {
    const part = await reader.read();
    if (part.done) break;
    expect(part.value.every((v: number) => v === 77)).toBe(true);
    received += part.value.length;
  }
  expect(received).toBe(size);
  const png = await app.request(
    "https://example.test/v1/internal/papers/paper-1/pages/1",
    {
      method: "PUT",
      headers: {
        "Content-Type": "image/png",
        Authorization: "Bearer test-service-token",
        "Content-Length": "4",
      },
      body: new Uint8Array([1, 2, 3, 4]),
    },
    env,
  );
  expect(png.status).toBe(204);
  const invalid = await app.request(
    "https://example.test/v1/internal/papers/paper-1/files/source.pdf",
    {
      method: "PUT",
      headers: { "Content-Type": "text/plain", Authorization: "Bearer test-service-token" },
      body: "wrong",
    },
    env,
  );
  expect(invalid.status).toBe(415);
});
it("Blob无显式Content-Length真实路径，不用整块缓存凑长度", async () => {
  const r = await app.request(
    "https://example.test/v1/papers/uploads/blob.pdf",
    {
      method: "PUT",
      headers: {
        "Content-Type": "application/pdf",
        Cookie: await authenticatedCookie(),
        Origin: env.AUTH_BASE_URL,
      },
      body: new Blob(["%PDF-offline"]),
    },
    env,
  );
  expect(r.status).toBe(200);
  const u = schemas.Upload.parse(await r.json());
  expect((await env.FILES.head(`uploads/${u.id}.pdf`))?.size).toBe(12);
});
it("未知长度任意流不能静默queued；错误长度存储失败保留记录", async () => {
  for (const length of [undefined, "5"]) {
    const r = await app.request(
      "https://example.test/v1/papers/uploads/stream.pdf",
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/pdf",
          Cookie: await authenticatedCookie(),
          Origin: env.AUTH_BASE_URL,
          ...(length ? { "Content-Length": length } : {}),
        },
        body: new ReadableStream({
          start(c) {
            c.enqueue(new Uint8Array([1, 2]));
            c.close();
          },
        }),
      },
      env,
    );
    expect(r.status).toBe(502);
    const failed = await service.listUploads(env.DB, "failed");
    expect(failed.length).toBeGreaterThan(0);
    expect(failed[0]?.error).toBe("PDF存储失败");
  }
});
it("所有论文读写补充：文件三种/review/upload状态/派生all/revise/ask未就绪", async () => {
  const p = paper();
  await service.putPaper(env.DB, p.id, write(p));
  for (const [name, type, text] of [
    ["source.pdf", "application/pdf", "%PDF-test"],
    ["pages.jsonl", "application/x-ndjson", '{"page":1,"lines":[]}'],
    ["pages.txt", "text/plain", "=== p.1 ===\n"],
  ] as const) {
    const r = await app.request(
      `https://example.test/v1/internal/papers/${p.id}/files/${name}`,
      {
        method: "PUT",
        headers: {
          "Content-Type": type,
          "Content-Length": String(new TextEncoder().encode(text).length),
          Authorization: "Bearer test-service-token",
        },
        body: text,
      },
      env,
    );
    expect(r.status).toBe(204);
    const get = await request(`internal/papers/${p.id}/files/${name}`, "GET", undefined, true);
    expect(get.headers.get("Content-Type")).toBe(type);
    expect(await get.text()).toBe(text);
  }
  expect((await request(`papers/${p.id}/source.pdf`)).status).toBe(200);
  await service.writePaperFile(
    env,
    p.id,
    "pages/1.png",
    new Blob(["png"]).stream(),
    "image/png",
    3,
  );
  expect((await request(`papers/${p.id}/pages/1`)).headers.get("Content-Type")).toBe("image/png");
  for (const path of ["catalog", "graph"]) {
    const raw =
      path === "catalog"
        ? {
            stats: { paperCount: 0, spaceCount: 0, conceptCount: 0, edgeCount: 0 },
            spaces: [],
            papers: [],
          }
        : { nodes: [], edges: [], cooccurrence: [] };
    await putDocument(env.DB, `papers.${path}.all`, JSON.stringify(raw));
    expect((await request(`papers/${path}`)).status).toBe(200);
  }
  expect((await request(`papers/${p.id}/reviews`)).status).toBe(200);
  expect(
    (await request(`papers/${p.id}/revise`, "POST", { instructions: "保留原状态，重写导读" }))
      .status,
  ).toBe(204);
  expect(
    vi.mocked(fetch).mock.calls.some(([, init]) => String(init?.body).includes("papers-revise")),
  ).toBe(true);
  const u = await service.uploadArxiv(env, "https://arxiv.org/abs/2505.07078");
  expect((await request(`internal/papers/uploads/${u.id}`, "GET", undefined, true)).status).toBe(
    200,
  );
  expect(
    (
      await request(
        `internal/papers/uploads/${u.id}`,
        "PATCH",
        { paperId: p.id, status: "authoring" },
        true,
      )
    ).status,
  ).toBe(204);
  expect((await request("papers/uploads?status=authoring")).status).toBe(200);
  expect(
    (await request(`internal/papers/uploads/${u.id}/file`, "GET", undefined, true)).status,
  ).toBe(404);
  expect((await request(`papers/${p.id}/ask`, "POST", { question: "问题" })).status).toBe(503);
});

it("审核真实契约/幂等与主键归属，不假报告跨论文写入成功", async () => {
  for (const id of ["paper-1", "paper-2"]) await service.putPaper(env.DB, id, write(paper(id)));
  const review = schemas.Review.parse(reviewFixture);
  expect((await request("internal/papers/paper-1/reviews", "POST", review, true)).status).toBe(204);
  expect((await request("internal/papers/paper-1/reviews", "POST", review, true)).status).toBe(204);
  const records = schemas.PrivatePapersListReviewsResponse.parse(
    await (await request("papers/paper-1/reviews")).json(),
  );
  expect(records).toHaveLength(1);
  expect(records[0]).toEqual(review);
  expect((await request("internal/papers/paper-2/reviews", "POST", review, true)).status).toBe(409);
});

it("公开关系目标撤销立即消失，SQL投影不改完整论文文档", async () => {
  const a = paper("a", "public"),
    b = paper("b", "public"),
    c = paper("c", "public");
  a.relations = [
    { target: b.id, type: "related", note: "保留完整关系" },
    { target: c.id, type: "related" },
  ];
  for (const p of [a, b, c]) await service.putPaper(env.DB, p.id, write(p));
  expect(
    schemas.Paper.parse(await (await request("public/papers/a")).json()).relations,
  ).toHaveLength(2);
  await service.patchPaper(env, "b", { visibility: "private" });
  const publicPaper = schemas.Paper.parse(await (await request("public/papers/a")).json());
  expect(publicPaper.relations).toEqual([{ target: "c", type: "related" }]);
  expect(JSON.parse(await service.getPaper(env.DB, "a")).relations).toEqual(a.relations);
  await service.patchPaper(env, "c", { visibility: "private" });
  expect(schemas.Paper.parse(await (await request("public/papers/a")).json()).relations).toEqual(
    [],
  );
});

it("旧arXiv学科标识保留版本与PDF入口", async () => {
  for (const arxivUrl of [
    "https://arxiv.org/abs/math.GT/0309136",
    "https://arxiv.org/pdf/cs.SE/0601001v2.pdf",
    "https://arxiv.org/abs/hep-th/9901001v3",
  ]) {
    const response = await request("papers/uploads/arxiv", "POST", { arxivUrl });
    expect(response.status).toBe(200);
    expect(schemas.Upload.parse(await response.json()).arxivUrl).toBe(arxivUrl);
  }
});
it("共现SQL只统计当前公开论文并去重同一论文概念边", async () => {
  await service.putPaper(env.DB, "visible", write(paper("visible", "public")));
  await service.putPaper(env.DB, "hidden", write(paper("hidden", "private")));
  const edges: GraphData["edges"] = [
    { source: "visible", target: "a", type: "discusses" },
    { source: "visible", target: "a", type: "discusses" },
    { source: "visible", target: "b", type: "discusses" },
    { source: "hidden", target: "a", type: "discusses" },
    { source: "hidden", target: "b", type: "discusses" },
  ];
  const repo = await import("../../src/modules/papers/repo");
  expect(await repo.publicCooccurrence(env.DB, edges)).toEqual([
    { source: "a", target: "b", count: 1 },
  ]);
  await service.patchPaper(env, "visible", { visibility: "private" });
  expect(await repo.publicCooccurrence(env.DB, edges)).toEqual([]);
});

it("通用内部documents写入坏JSON后，五个论文派生GET明确404且Problem合格", async () => {
  const routes = [
    ["papers.catalog.all", "papers/catalog"],
    ["papers.graph.all", "papers/graph"],
    ["papers.catalog.public", "public/papers/catalog"],
    ["papers.graph.public", "public/papers/graph"],
    ["papers.search.public", "public/papers/search-index"],
  ] as const;
  for (const [key, route] of routes) {
    for (const value of [
      {},
      { papers: [null] },
      { nodes: [], edges: [] },
      { stats: {}, spaces: [], papers: "bad" },
    ]) {
      const stored = await request(`internal/documents/${key}`, "PUT", value, true);
      expect(stored.status).toBe(204);
      const response = await request(route);
      expect(response.status).toBe(404);
      expect(response.headers.get("Content-Type")).toContain("application/problem+json");
      const problem = schemas.Problem.parse(await response.json());
      expect(problem.status).toBe(404);
      expect(problem.detail).toBe("论文派生文档格式无效");
    }
  }
});
it("损坏的已存派生原文返回404；有效私有文档保持原字节，公开不泄漏多余键", async () => {
  for (const name of ["catalog", "graph", "search"] as const) {
    for (const publicOnly of [true, false]) {
      const key = `papers.${name}.${publicOnly ? "public" : "all"}`;
      for (const raw of ["{bad-json", "null", "[]", '"arbitrary"']) {
        await putDocument(env.DB, key, raw);
        await expect(service.derived(env.DB, name, publicOnly)).rejects.toMatchObject({
          status: 404,
          message: "论文派生文档格式无效",
        });
      }
    }
  }
  const graph = { nodes: [], edges: [], cooccurrence: [], privateExtra: "私人哨兵" };
  const catalog = {
    stats: { paperCount: 0, spaceCount: 0, conceptCount: 0, edgeCount: 0 },
    spaces: [],
    papers: [],
    privateExtra: "私人哨兵",
  };
  for (const [name, value] of [
    ["graph", graph],
    ["catalog", catalog],
  ] as const) {
    const raw = JSON.stringify(value, null, 2);
    await putDocument(env.DB, `papers.${name}.all`, raw);
    expect(await service.derived(env.DB, name, false)).toBe(raw);
    await putDocument(env.DB, `papers.${name}.public`, raw);
    expect(await service.derived(env.DB, name, true)).not.toContain("私人哨兵");
  }
});
it("公开目录需要裁剪时，损坏的依赖graph返回404而非500或假统计", async () => {
  const hidden = paper("hidden", "private");
  await service.putPaper(env.DB, hidden.id, write(hidden));
  await putDocument(
    env.DB,
    "papers.catalog.public",
    JSON.stringify({
      stats: { paperCount: 1, spaceCount: 0, conceptCount: 0, edgeCount: 0 },
      spaces: [],
      papers: [summary(hidden)],
    }),
  );
  await putDocument(env.DB, "papers.graph.public", "{}");
  const response = await request("public/papers/catalog");
  expect(response.status).toBe(404);
  expect(schemas.Problem.parse(await response.json()).detail).toBe("论文派生文档格式无效");
});

it("真实问答路由先核对论文就绪再检查key：不存在404/未就绪422/就绪无key503", async () => {
  const incomplete = paper("not-ready");
  incomplete.guide = undefined;
  const ready = paper("ready");
  ready.structure = { pageCount: 1 };
  await service.putPaper(env.DB, incomplete.id, write(incomplete));
  await service.putPaper(env.DB, ready.id, write(ready));
  await env.FILES.put(`papers/${ready.id}/pages.txt`, "=== p.1 ===\n真实本地回归页文本");
  const cookie = await authenticatedCookie();
  for (const question of ["", "论文说明了什么？"]) {
    for (const [id, status, detail] of [
      ["does-not-exist", 404, "论文不存在"],
      [incomplete.id, 422, "原文尚未就绪"],
      [ready.id, 503, "问答网关未配置"],
    ] as const) {
      const response = await app.request(
        `https://example.test/v1/papers/${id}/ask`,
        {
          method: "POST",
          headers: {
            Cookie: cookie,
            Origin: env.AUTH_BASE_URL,
            "Content-Type": "application/json",
          },
          body: JSON.stringify({ question }),
        },
        { ...env, OPENAI_API_KEY: undefined },
      );
      expect(response.status).toBe(status);
      expect(response.headers.get("Content-Type")).toContain("application/problem+json");
      expect(schemas.Problem.parse(await response.json())).toMatchObject({ status, detail });
    }
  }
  expect(fetch).not.toHaveBeenCalled();
});
