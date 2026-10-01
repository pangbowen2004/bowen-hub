interface Env {
  API: { fetch(request: Request): Promise<Response> };
}
interface Context {
  request: Request;
  env: Env;
  next(): Promise<Response>;
}
export function isProxyPath(path: string): boolean {
  return ["/v1", "/auth", "/mcp", "/.well-known"].some(
    (prefix) => path === prefix || path.startsWith(`${prefix}/`),
  );
}
export async function onRequest(context: Context): Promise<Response> {
  return isProxyPath(new URL(context.request.url).pathname)
    ? context.env.API.fetch(context.request)
    : context.next();
}
