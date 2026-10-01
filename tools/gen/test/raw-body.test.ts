// 使用正式配置生成真实 fetch / React Query 请求函数，再检查交给 fetch 的正文。
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { stripTypeScriptTypes } from "node:module";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { generate, type Options } from "orval";
import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { orvalProjects } from "../src/orval.ts";
import { ROOT } from "../src/paths.ts";

let dir = "";
const mediaTypes = {
  Html: "text/html",
  Pdf: "application/pdf",
  Png: "image/png",
  Json: "application/json",
};
const generated: Record<string, string> = {};

beforeAll(async () => {
  dir = mkdtempSync(join(tmpdir(), "bowen-hub-raw-body-"));
  const paths = Object.fromEntries(
    Object.entries(mediaTypes).map(([name, mediaType]) => [
      `/${name.toLowerCase()}`,
      {
        put: {
          operationId: `put${name}`,
          requestBody: {
            required: true,
            content: {
              [mediaType]: {
                schema:
                  name === "Json"
                    ? {
                        type: "object",
                        properties: { title: { type: "string" } },
                        required: ["title"],
                      }
                    : name === "Html"
                      ? { type: "string" }
                      : { contentMediaType: mediaType },
              },
            },
          },
          responses: { "204": { description: "Saved" } },
        },
      },
    ]),
  );
  const input = join(dir, "openapi.json");
  writeFileSync(
    input,
    JSON.stringify({ openapi: "3.1.0", info: { title: "Raw body", version: "1" }, paths }),
  );
  for (const name of ["client", "hooks"]) {
    const project = orvalProjects()[name];
    if (
      !project ||
      typeof project.output !== "object" ||
      typeof project.input !== "object" ||
      Array.isArray(project.input)
    ) {
      throw new Error("正式 Orval 配置结构改变");
    }
    const target = join(dir, `${name}.ts`);
    const options: Options = {
      ...project,
      input: { ...project.input, target: input },
      output: {
        ...project.output,
        target,
        mode: "single",
        baseUrl: "http://localhost",
        mock: false,
      },
    };
    await generate(options, ROOT, { throwOnError: true, logLevel: "error" });
    generated[name] = readFileSync(target, "utf8");
  }
}, 120_000);

afterAll(() => {
  if (dir) rmSync(dir, { recursive: true, force: true });
});

describe.each(["client", "hooks"])("%s 的非 JSON 正文", (name) => {
  it("HTML 原始字符串、PDF/PNG Blob 原对象；JSON 仍编码", async () => {
    const requests: RequestInit[] = [];
    const fetch = async (_url: string, options: RequestInit): Promise<Response> => {
      requests.push(options);
      return new Response(null, { status: 204 });
    };
    // 去掉只与 React Query hooks 有关的导入；下面仅执行 Orval 导出的 HTTP 请求函数。
    const source = stripTypeScriptTypes(generated[name] ?? "", { mode: "strip" })
      .replace(/import[\s\S]*?from ['"][^'"]+['"];?/g, "")
      .replace(/\bexport /g, "");
    type Api = Record<string, (body: unknown) => Promise<void>>;
    const api = new Function("fetch", `${source}\nreturn { putHtml, putPdf, putPng, putJson };`)(
      fetch,
    ) as Api;
    const html = '<!doctype html><p title="新闻">原文\n换行</p>';
    const pdf = new Blob([new Uint8Array([0x25, 0x50, 0x44, 0x46, 0, 255])], {
      type: "application/pdf",
    });
    const png = new Blob([new Uint8Array([137, 80, 78, 71, 0, 255])], { type: "image/png" });
    const bodies = [html, pdf, png, { title: "新闻" }];
    for (const [index, kind] of Object.keys(mediaTypes).entries()) {
      const request = api[`put${kind}`];
      if (!request) throw new Error(`缺少 put${kind}`);
      await request(bodies[index]);
      expect(new Headers(requests[index]?.headers).get("Content-Type")).toBe(
        mediaTypes[kind as keyof typeof mediaTypes],
      );
      expect(requests[index]?.body).toBe(
        index === 3 ? JSON.stringify(bodies[index]) : bodies[index],
      );
    }
    expect(generated[name]).toMatch(/putHtmlBody: string/);
    expect(generated[name]).toMatch(/putPdfBody: Blob/);
    expect(generated[name]).toMatch(/putPngBody: Blob/);
  });
});
