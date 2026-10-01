import { env } from "cloudflare:workers";
import { expect, it } from "vitest";
import { isDeclaredResourceMissing } from "../../scripts/probe-response";
import { app } from "../../src/app";

const missing = (status = 404) =>
  new Response(
    JSON.stringify({
      type: "about:blank",
      title: "期次不存在",
      status,
      detail: "期次不存在",
      instance: "/v1/news/editions/missing",
    }),
    { status: 404, headers: { "Content-Type": "application/problem+json" } },
  );
it("契约探测允许已声明资源404并保留响应正文供后续检查", async () => {
  const response = missing();
  expect(await isDeclaredResourceMissing(response, { default: {} })).toBe(true);
  expect(await isDeclaredResourceMissing(response, { "404": {} })).toBe(true);
  expect(((await response.json()) as { status: number }).status).toBe(404);
});
it("真实未挂载接口即使符合Problem且有default响应也不能被放行", async () => {
  const response = await app.request("http://localhost/not-mounted-contract-operation", {}, env);
  expect(response.status).toBe(404);
  expect(await isDeclaredResourceMissing(response, { default: {} })).toBe(false);
});
it("未声明404、错误Problem状态、错误媒体类型和损坏JSON拒绝", async () => {
  expect(await isDeclaredResourceMissing(missing(), { "200": {} })).toBe(false);
  expect(await isDeclaredResourceMissing(missing(500), { default: {} })).toBe(false);
  expect(
    await isDeclaredResourceMissing(new Response("Not Found", { status: 404 }), { default: {} }),
  ).toBe(false);
  expect(
    await isDeclaredResourceMissing(
      new Response("{", { status: 404, headers: { "Content-Type": "application/problem+json" } }),
      { default: {} },
    ),
  ).toBe(false);
});
