// 仅样例模式：状态存入本页会话，刷新可核对操作；不会写真实API。
import type { Paper, PaperPrivate, Upload } from "@bowen-hub/contracts";
import {
  PaperExplanationCreate,
  PaperExplanationPatch,
  PaperPatch,
  PaperPrivateWrite,
  Paper as PaperSchema,
  PaperPrivate as PrivateSchema,
  Upload as UploadSchema,
} from "@bowen-hub/contracts/zod";
import { HttpResponse, http } from "msw";
import graph from "../../../../../fixtures/samples/papers/GraphData.all.json" with { type: "json" };
import acl from "../../../../../fixtures/samples/papers/Paper.acl-2021.acl-long.500.json" with {
  type: "json",
};
import arxiv from "../../../../../fixtures/samples/papers/Paper.arxiv-2505.07078.json" with {
  type: "json",
};
import aclPrivate from "../../../../../fixtures/samples/papers/PaperPrivate.acl-2021.acl-long.500.json" with {
  type: "json",
};
import arxivPrivate from "../../../../../fixtures/samples/papers/PaperPrivate.arxiv-2505.07078.json" with {
  type: "json",
};
import catalog from "../../../../../fixtures/samples/papers/PapersCatalog.all.json" with {
  type: "json",
};
import review from "../../../../../fixtures/samples/papers/Review.synthetic.json" with {
  type: "json",
};
import failed from "../../../../../fixtures/samples/papers/Upload.failed.json" with {
  type: "json",
};
import ready from "../../../../../fixtures/samples/papers/Upload.ready.json" with { type: "json" };

const storageKey = "paper-demo-state-v1";
let papers: Paper[] = PaperSchema.array().parse([arxiv, acl]);
let uploads: Upload[] = UploadSchema.array().parse([ready, failed]);
let privateRows: Record<string, PaperPrivate> = {
  [arxiv.id]: PrivateSchema.parse(arxivPrivate),
  [acl.id]: PrivateSchema.parse(aclPrivate),
};
try {
  const saved = sessionStorage.getItem(storageKey);
  if (saved) {
    const value = JSON.parse(saved);
    papers = PaperSchema.array().parse(value.papers);
    uploads = UploadSchema.array().parse(value.uploads);
    privateRows = Object.fromEntries(
      papers.map((paper) => [paper.id, PrivateSchema.parse(value.privateRows[paper.id])]),
    );
  }
} catch {
  /* 损坏的演示数据恢复基础样例。 */
}
function persist() {
  sessionStorage.setItem(storageKey, JSON.stringify({ papers, uploads, privateRows }));
}
const problem = (detail: string, status = 404) =>
  HttpResponse.json(
    { type: "about:blank", title: detail, detail, status },
    { status, headers: { "Content-Type": "application/problem+json" } },
  );
const find = (id: unknown) => papers.find((paper) => paper.id === id);
function summaries() {
  return catalog.papers.map((summary) => {
    const paper = find(summary.id);
    return paper ? { ...summary, spaces: paper.spaces ?? [], ...paper.status } : summary;
  });
}
export const paperHandlers = [
  http.get("/v1/papers", ({ request }) => {
    const url = new URL(request.url);
    const offset = Number(url.searchParams.get("cursor")?.replace("demo-", "") ?? 0);
    const limit = Number(url.searchParams.get("limit") ?? 20);
    const items = summaries();
    return HttpResponse.json({
      items: items.slice(offset, offset + limit),
      nextCursor: offset + limit < items.length ? `demo-${offset + limit}` : null,
    });
  }),
  http.get("/v1/papers/catalog", () => HttpResponse.json({ ...catalog, papers: summaries() })),
  http.get("/v1/papers/graph", () => HttpResponse.json(graph)),
  http.get("/v1/papers/uploads", () => HttpResponse.json(uploads)),
  http.post("/v1/papers/uploads/arxiv", async ({ request }) => {
    const input = (await request.json()) as { arxivUrl: string };
    const now = new Date().toISOString();
    const upload: Upload = {
      id: crypto.randomUUID(),
      filename: null,
      arxivUrl: input.arxivUrl,
      status: "queued",
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    uploads.unshift(upload);
    persist();
    return HttpResponse.json(upload, { status: 202 });
  }),
  http.put("/v1/papers/uploads/:filename", ({ params }) => {
    const now = new Date().toISOString();
    const upload: Upload = {
      id: crypto.randomUUID(),
      filename: String(params.filename),
      arxivUrl: null,
      status: "queued",
      error: null,
      createdAt: now,
      updatedAt: now,
    };
    uploads.unshift(upload);
    persist();
    return HttpResponse.json(upload, { status: 202 });
  }),
  http.post("/v1/papers/uploads/:uploadId/retry", ({ params }) => {
    const row = uploads.find((item) => item.id === params.uploadId);
    if (!row) return problem("入库记录不存在");
    row.status = "queued";
    row.error = null;
    row.updatedAt = new Date().toISOString();
    persist();
    return HttpResponse.json(row, { status: 202 });
  }),
  http.get("/v1/papers/:id", ({ params }) =>
    find(params.id) ? HttpResponse.json(find(params.id)) : problem("论文不存在"),
  ),
  http.patch("/v1/papers/:id", async ({ params, request }) => {
    const paper = find(params.id);
    if (!paper) return problem("论文不存在");
    const parsed = PaperPatch.safeParse(await request.json());
    if (!parsed.success) return problem("设置不符合契约", 400);
    const { spaces, ...status } = parsed.data;
    paper.status = { ...paper.status, ...status };
    if (spaces) paper.spaces = spaces;
    persist();
    return HttpResponse.json(paper);
  }),
  http.get("/v1/papers/:id/private", ({ params }) =>
    find(params.id) ? HttpResponse.json(privateRows[String(params.id)]) : problem("论文不存在"),
  ),
  http.put("/v1/papers/:id/private", async ({ params, request }) => {
    const row = privateRows[String(params.id)];
    if (!row) return problem("论文不存在");
    const parsed = PaperPrivateWrite.safeParse(await request.json());
    if (!parsed.success) return problem("私人内容不符合契约", 400);
    Object.assign(row, parsed.data);
    persist();
    return HttpResponse.json(row);
  }),
  http.post("/v1/papers/:id/explanations", async ({ params, request }) => {
    const row = privateRows[String(params.id)];
    if (!row) return problem("论文不存在");
    const parsed = PaperExplanationCreate.safeParse(await request.json());
    if (!parsed.success) return problem("解释卡不符合契约", 400);
    const explanation = {
      ...parsed.data,
      id: crypto.randomUUID(),
      status: "pending" as const,
      createdAt: new Date().toISOString(),
    };
    row.explanations.push(explanation);
    persist();
    return HttpResponse.json(explanation, { status: 201 });
  }),
  http.patch("/v1/papers/:id/explanations/:explanationId", async ({ params, request }) => {
    const row = privateRows[String(params.id)];
    const explanation = row?.explanations.find((item) => item.id === params.explanationId);
    if (!explanation) return problem("解释卡不存在");
    const parsed = PaperExplanationPatch.safeParse(await request.json());
    if (!parsed.success) return problem("确认状态不符合契约", 400);
    Object.assign(explanation, parsed.data);
    persist();
    return HttpResponse.json(explanation);
  }),
  http.get("/v1/papers/:id/reviews", ({ params }) =>
    find(params.id) ? HttpResponse.json([review]) : problem("论文不存在"),
  ),
  http.post("/v1/papers/:id/revise", ({ params }) =>
    find(params.id) ? new HttpResponse(null, { status: 202 }) : problem("论文不存在"),
  ),
  http.get("/v1/papers/:id/pages/:n", ({ params }) => {
    if (!find(params.id)) return problem("论文不存在");
    // 预览页图明确写出演示内容，真实模式使用API提供的PNG。
    const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="600" height="800"><rect width="600" height="800" fill="#f7f4ed"/><text x="40" y="100" font-size="24">PDF SAMPLE · PAGE ${Number(params.n)}</text></svg>`;
    return new HttpResponse(svg, { headers: { "Content-Type": "image/svg+xml" } });
  }),
  http.post("/v1/papers/:id/ask", async ({ params, request }) => {
    if (!find(params.id)) return problem("论文不存在");
    const { question } = (await request.json()) as { question: string };
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        const write = (value: unknown) =>
          controller.enqueue(encoder.encode(`data: ${JSON.stringify(value)}\n\n`));
        write({ type: "text-delta", delta: "这是一段样例回答：请核对原文的实验设置，" });
        write({ type: "text-delta", delta: "指标不能脱离材料支持的边界。" });
        if (question.includes("模拟失败")) write({ type: "error", errorText: "样例失败" });
        write({
          type: "data-paper-qa",
          data: {
            ok: !question.includes("模拟失败"),
            pages: [1],
            generatedBy: {
              capability: "papers.qa",
              version: 1,
              model: "fixture/fake",
              at: new Date().toISOString(),
            },
          },
        });
        write({ type: "finish" });
        controller.close();
      },
    });
    return new HttpResponse(stream, { headers: { "Content-Type": "text/event-stream" } });
  }),
];
