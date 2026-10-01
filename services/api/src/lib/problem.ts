import type { Context, Handler } from "hono";
import type { AppEnv } from "./env";
export class ApiError extends Error {
  constructor(
    public readonly status: number,
    message: string,
  ) {
    super(message);
  }
}
export function problem(c: Context<AppEnv>, status: number, detail: string): Response {
  return new Response(
    JSON.stringify({ type: "about:blank", title: detail, status, detail, instance: c.req.path }),
    {
      status,
      headers: { "Content-Type": "application/problem+json" },
    },
  );
}
export const unimplemented =
  (task: string): Handler<AppEnv> =>
  (c) =>
    problem(c, 501, `未实现（任务 ${task}）`);
