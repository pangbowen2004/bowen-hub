// 按契约operationId登记全部论文接口，HTTP只适配生成校验与服务。
import * as schemas from "@bowen-hub/contracts/zod";
import type { Context, Handler } from "hono";
import type { z } from "zod";
import type { AppEnv } from "../../lib/env";
import { ApiError } from "../../lib/problem";
import * as qa from "./qa";
import * as service from "./service";

function parse<T extends z.ZodType>(schema: T, v: unknown): z.output<T> {
  const r = schema.safeParse(v);
  if (!r.success) throw new ApiError(400, "请求参数或正文不符合契约");
  return r.data;
}
async function json(c: Context<AppEnv>): Promise<unknown> {
  if (c.req.header("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== "application/json")
    throw new ApiError(415, "请求正文必须为JSON");
  try {
    return await c.req.json();
  } catch {
    throw new ApiError(400, "请求正文不是有效JSON");
  }
}
async function body<T extends z.ZodType>(c: Context<AppEnv>, s: T): Promise<z.output<T>> {
  return parse(s, await json(c));
}
const output = (raw: string) =>
  new Response(raw, { headers: { "Content-Type": "application/json" } });
function binary(c: Context<AppEnv>, type: string): number | undefined {
  if (c.req.header("Content-Type")?.split(";")[0]?.trim().toLowerCase() !== type)
    throw new ApiError(415, "文件媒体类型不符合契约");
  const raw = c.req.header("Content-Length");
  const length = raw === undefined ? undefined : Number(raw);
  if (length !== undefined && (!Number.isSafeInteger(length) || length < 1))
    throw new ApiError(400, "文件长度无效");
  if (!c.req.raw.body) throw new ApiError(400, "文件正文为空");
  return length;
}
export const handlers: Record<string, Handler<AppEnv>> = {
  PrivatePapers_listPapers: async (c) =>
    c.json(
      await service.listPapers(
        c.env.DB,
        parse(schemas.PrivatePapersListPapersQueryParams, c.req.query()),
      ),
    ),
  PrivatePapers_getPaper: async (c) =>
    output(
      await service.getPaper(
        c.env.DB,
        parse(schemas.PrivatePapersGetPaperParams, c.req.param()).id,
      ),
    ),
  PublicPapers_getPaper: async (c) =>
    output(
      await service.getPaper(
        c.env.DB,
        parse(schemas.PublicPapersGetPaperParams, c.req.param()).id,
        true,
      ),
    ),
  PrivatePapers_patchPaper: async (c) =>
    output(
      await service.patchPaper(
        c.env,
        parse(schemas.PrivatePapersPatchPaperParams, c.req.param()).id,
        await body(c, schemas.PrivatePapersPatchPaperBody),
      ),
    ),
  InternalPapers_putPaper: async (c) => {
    const { id } = parse(schemas.InternalPapersPutPaperParams, c.req.param());
    await service.putPaper(c.env.DB, id, await json(c));
    return c.body(null, 204);
  },
  PrivatePapers_getPrivate: async (c) =>
    c.json(
      await service.getPrivate(
        c.env.DB,
        parse(schemas.PrivatePapersGetPrivateParams, c.req.param()).id,
      ),
    ),
  PrivatePapers_putPrivate: async (c) =>
    c.json(
      await service.updatePrivate(
        c.env.DB,
        parse(schemas.PrivatePapersPutPrivateParams, c.req.param()).id,
        await body(c, schemas.PrivatePapersPutPrivateBody),
      ),
    ),
  InternalPapers_putPrivate: async (c) => {
    await service.putPrivate(
      c.env.DB,
      parse(schemas.InternalPapersPutPrivateParams, c.req.param()).id,
      await body(c, schemas.InternalPapersPutPrivateBody),
    );
    return c.body(null, 204);
  },
  PrivatePapers_createExplanation: async (c) =>
    c.json(
      await service.createExplanation(
        c.env.DB,
        parse(schemas.PrivatePapersCreateExplanationParams, c.req.param()).id,
        await body(c, schemas.PrivatePapersCreateExplanationBody),
      ),
    ),
  PrivatePapers_patchExplanation: async (c) => {
    const { id, eid } = parse(schemas.PrivatePapersPatchExplanationParams, c.req.param());
    return c.json(
      await service.patchExplanation(
        c.env.DB,
        id,
        eid,
        (await body(c, schemas.PrivatePapersPatchExplanationBody)).status,
      ),
    );
  },
  PrivatePapers_listReviews: async (c) =>
    c.json(
      await service.reviews(
        c.env.DB,
        parse(schemas.PrivatePapersListReviewsParams, c.req.param()).id,
      ),
    ),
  InternalPapers_createReview: async (c) => {
    await service.putReview(
      c.env.DB,
      parse(schemas.InternalPapersCreateReviewParams, c.req.param()).id,
      await body(c, schemas.InternalPapersCreateReviewBody),
    );
    return c.body(null, 204);
  },
  PrivatePapers_revise: async (c) => {
    await service.revise(
      c.env,
      parse(schemas.PrivatePapersReviseParams, c.req.param()).id,
      (await body(c, schemas.PrivatePapersReviseBody)).instructions,
    );
    return c.body(null, 204);
  },
  PrivatePapers_listUploads: async (c) =>
    c.json(
      await service.listUploads(
        c.env.DB,
        parse(schemas.PrivatePapersListUploadsQueryParams, c.req.query()).status,
      ),
    ),
  PrivatePapers_uploadArxiv: async (c) =>
    c.json(
      await service.uploadArxiv(
        c.env,
        (await body(c, schemas.PrivatePapersUploadArxivBody)).arxivUrl,
      ),
    ),
  PrivatePapers_uploadPdf: async (c) => {
    const { filename } = parse(schemas.PrivatePapersUploadPdfParams, c.req.param());
    return c.json(
      await service.uploadPdf(c.env, filename, c.req.raw.body, binary(c, "application/pdf")),
    );
  },
  PrivatePapers_retryUpload: async (c) =>
    c.json(
      await service.retryUpload(
        c.env,
        parse(schemas.PrivatePapersRetryUploadParams, c.req.param()).uploadId,
      ),
    ),
  InternalPapers_getUpload: async (c) =>
    c.json(
      await service.getUpload(
        c.env.DB,
        parse(schemas.InternalPapersGetUploadParams, c.req.param()).uploadId,
      ),
    ),
  InternalPapers_patchUpload: async (c) => {
    await service.patchUpload(
      c.env.DB,
      parse(schemas.InternalPapersPatchUploadParams, c.req.param()).uploadId,
      await body(c, schemas.InternalPapersPatchUploadBody),
    );
    return c.body(null, 204);
  },
  InternalPapers_getUploadFile: async (c) =>
    service.uploadFile(
      c.env,
      parse(schemas.InternalPapersGetUploadFileParams, c.req.param()).uploadId,
    ),
  PrivatePapers_getPdf: async (c) => {
    const { id } = parse(schemas.PrivatePapersGetPdfParams, c.req.param());
    await service.getPaper(c.env.DB, id);
    return service.file(c.env, id, "source.pdf");
  },
  PrivatePapers_getPage: async (c) => {
    const { id, n } = parse(schemas.PrivatePapersGetPageParams, c.req.param());
    await service.getPaper(c.env.DB, id);
    return service.file(c.env, id, `pages/${n}.png`);
  },
  InternalPapers_getFile: async (c) => {
    const { id, name } = parse(schemas.InternalPapersGetFileParams, c.req.param());
    return service.file(c.env, id, name);
  },
  InternalPapers_putFile: async (c) => {
    const { id, name } = parse(schemas.InternalPapersPutFileParams, c.req.param());
    const type = {
      "source.pdf": "application/pdf",
      "pages.jsonl": "application/x-ndjson",
      "pages.txt": "text/plain",
    }[name];
    await service.writePaperFile(c.env, id, name, c.req.raw.body, type, binary(c, type));
    return c.body(null, 204);
  },
  InternalPapers_putPage: async (c) => {
    const { id, n } = parse(schemas.InternalPapersPutPageParams, c.req.param());
    await service.writePaperFile(
      c.env,
      id,
      `pages/${n}.png`,
      c.req.raw.body,
      "image/png",
      binary(c, "image/png"),
    );
    return c.body(null, 204);
  },
  PrivatePapers_getCatalog: async (c) => output(await service.derived(c.env.DB, "catalog", false)),
  PrivatePapers_getGraph: async (c) => output(await service.derived(c.env.DB, "graph", false)),
  PublicPapers_getCatalog: async (c) => output(await service.derived(c.env.DB, "catalog", true)),
  PublicPapers_getGraph: async (c) => output(await service.derived(c.env.DB, "graph", true)),
  PublicPapers_getSearchIndex: async (c) => output(await service.derived(c.env.DB, "search", true)),
  PrivatePapers_ask: async (c) =>
    qa.response(
      c.env,
      parse(schemas.PrivatePapersAskParams, c.req.param()).id,
      (await body(c, schemas.PrivatePapersAskBody)).question,
      undefined,
      (task) => c.executionCtx.waitUntil(task),
    ),
};
