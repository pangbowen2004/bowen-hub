// 只对探测结果已实现的接口跑Schemathesis；每次使用独立临时D1，结束关闭Worker。
import { spawn, spawnSync } from "node:child_process";
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { parse, stringify } from "yaml";
import { contractFixture } from "../test/auth/contract-fixture.ts";
import { isDeclaredResourceMissing } from "./probe-response.ts";

const SCHEMATHESIS_VERSION = "4.28.0";
const args = process.argv.slice(2);
const taskIndex = args.indexOf("--task");
const task = taskIndex < 0 ? undefined : args[taskIndex + 1];
if (taskIndex >= 0) {
  if (!task || !/^T\d+$/.test(task)) throw new Error("--task需要任务号，如T02");
  args.splice(taskIndex, 2);
}
const dir = mkdtempSync(join(tmpdir(), "bowen-hub-contract-"));
const token = "offline-contract-service-token";
const secret = "offline-contract-auth-secret-only";
const fixture = await contractFixture(secret);
const environment = {
  ...process.env,
  WRANGLER_SEND_METRICS: "false",
  CLOUDFLARE_LOAD_DEV_VARS_FROM_DOT_ENV: "false",
};
const port = 18878;
const base = `http://127.0.0.1:${port}`;
// 官方扩展为二进制媒体生成字节并注册serializer，保留PDF/PNG接口与全部检查。
const binaryHook = join(dir, "binary_media.py");
writeFileSync(
  binaryHook,
  [
    "import schemathesis",
    "from hypothesis import strategies as st",
    'for media_type in ("application/pdf", "image/png"):',
    "    schemathesis.openapi.media_type(media_type, st.binary(min_size=0, max_size=4096))",
    "",
  ].join("\n"),
);
// 临时入口只回放GitHub任务派发，其余外部网络拒绝；生产入口不修改。
const entry = join(dir, "contract-worker.ts");
writeFileSync(
  entry,
  [
    `import api from ${JSON.stringify(resolve("src/index.ts"))};`,
    `export { PaperQaRuntime } from ${JSON.stringify(resolve("src/index.ts"))};`,
    "globalThis.fetch = async (input, init) => {",
    '  const url = new URL(typeof input === "string" ? input : input instanceof URL ? input.href : input.url);',
    '  const method = init?.method ?? (input instanceof Request ? input.method : "GET");',
    '  if (method === "POST" && url.origin === "https://api.github.com" && url.pathname === "/repos/contract-test/offline/dispatches") return new Response(null, { status: 204 });',
    '  throw new Error("离线契约验收禁止外部请求");',
    "};",
    "export default api;",
    "",
  ].join("\n"),
);
let worker: ReturnType<typeof spawn> | undefined;
let workerLog = "";
const run = (command: string, argv: string[], cwd = process.cwd()) => {
  const result = spawnSync(command, argv, {
    stdio: "inherit",
    env: command === "uvx" ? { ...environment, SCHEMATHESIS_HOOKS: binaryHook } : environment,
    cwd,
  });
  if (result.error) throw result.error;
  if (result.status !== 0) throw new Error(`${command}退出码${result.status}`);
};
try {
  run("pnpm", [
    "exec",
    "wrangler",
    "d1",
    "migrations",
    "apply",
    "bowen-hub",
    "--local",
    "--persist-to",
    dir,
  ]);
  const fixturePath = join(dir, "auth-fixture.sql");
  writeFileSync(fixturePath, fixture.sql);
  run("pnpm", [
    "exec",
    "wrangler",
    "d1",
    "execute",
    "bowen-hub",
    "--local",
    "--persist-to",
    dir,
    "--file",
    fixturePath,
  ]);
  worker = spawn(
    "pnpm",
    [
      "exec",
      "wrangler",
      "dev",
      entry,
      "--config",
      resolve("wrangler.jsonc"),
      "--local",
      "--port",
      String(port),
      "--inspector-port",
      "0",
      "--persist-to",
      dir,
      "--var",
      "APP_MODE:local",
      "--var",
      "GH_AUTOMATION_TOKEN:offline-contract-github-token",
      "--var",
      "GITHUB_REPO:contract-test/offline",
      "--var",
      `HUB_SERVICE_TOKEN:${token}`,
      "--var",
      `BETTER_AUTH_SECRET:${secret}`,
      "--var",
      `AUTH_BASE_URL:${base}`,
      "--var",
      "AUTH_RP_ID:127.0.0.1",
      "--var",
      `AUTH_TRUSTED_ORIGINS:${base}`,
      "--log-level",
      "error",
    ],
    { env: environment, stdio: ["ignore", "pipe", "pipe"], detached: process.platform !== "win32" },
  );
  worker.stdout?.on("data", (chunk) => {
    workerLog = (workerLog + String(chunk)).slice(-4000);
  });
  worker.stderr?.on("data", (chunk) => {
    workerLog = (workerLog + String(chunk)).slice(-4000);
  });
  let ready = false;
  for (let attempt = 0; attempt < 120; attempt++) {
    if (worker.exitCode !== null) throw new Error(`本地Worker提前退出：${workerLog}`);
    try {
      ready = (await fetch(`${base}/v1/health`)).status === 200;
    } catch {}
    if (ready) break;
    await new Promise((r) => setTimeout(r, 250));
  }
  if (!ready) throw new Error(`本地Worker启动超时：${workerLog}`);
  const spec = parse(readFileSync(resolve("../../contracts/generated/openapi.yaml"), "utf8")) as {
    paths: Record<
      string,
      Record<
        string,
        {
          operationId: string;
          "x-task": string;
          requestBody?: { content: Record<string, unknown> };
          responses: Record<string, unknown>;
          parameters?: { name: string; in: string; schema?: { enum?: string[]; $ref?: string } }[];
        }
      >
    >;
    components: { schemas: Record<string, { enum?: string[] }> };
  };
  const paths: typeof spec.paths = {};
  let skipped = 0;
  let selected = 0;
  for (const [path, methods] of Object.entries(spec.paths))
    for (const [method, operation] of Object.entries(methods)) {
      if (
        !["get", "put", "post", "patch", "delete"].includes(method) ||
        (task && operation["x-task"] !== task)
      )
        continue;
      const concrete = path.replace(/\{([^}]+)\}/g, (_match, name: string) => {
        const schema = operation.parameters?.find(
          (p) => p.in === "path" && p.name === name,
        )?.schema;
        return (
          schema?.enum?.[0] ??
          (schema?.$ref
            ? spec.components.schemas[schema.$ref.split("/").at(-1) ?? ""]?.enum?.[0]
            : undefined) ??
          "contract-probe"
        );
      });
      const headers: Record<string, string> = {};
      // 服务令牌用于GET和内部写；私有写使用真实签名测试会话与可信来源。
      if (method === "get" || path.startsWith("/v1/internal/"))
        headers.Authorization = `Bearer ${token}`;
      else {
        headers.Cookie = fixture.cookie;
        headers.Origin = base;
      }
      const hasBody = operation.requestBody !== undefined;
      if (hasBody)
        headers["Content-Type"] =
          Object.keys(operation.requestBody?.content ?? {})[0] ?? "application/json";
      const response = await fetch(`${base}${concrete}`, {
        method: method.toUpperCase(),
        headers,
        ...(hasBody ? { body: "{}" } : {}),
      });
      if (response.status === 501) {
        skipped++;
        continue;
      }
      // 空库的资源不存在应是契约Problem，而非未挂载路由的404。
      const declaredNotFound = await isDeclaredResourceMissing(response, operation.responses);
      if (
        [401, 403, 500].includes(response.status) ||
        (response.status === 404 && !declaredNotFound)
      )
        throw new Error(`接口探测失败${operation.operationId}：${response.status}`);
      if (!paths[path]) paths[path] = {};
      const operations = paths[path];
      if (!operations) throw new Error("接口路径登记失败");
      operations[method] = operation;
      selected++;
    }
  if (selected === 0) throw new Error(`任务${task ?? "全部"}没有已实现接口；跳过${skipped}个占位`);
  console.log(
    `Schemathesis ${SCHEMATHESIS_VERSION}：已实现${selected}个，跳过501占位${skipped}个${task ? `，任务${task}` : ""}`,
  );
  // 保留未授权边界：本地模式和服务令牌都不能绕过私有写会话。
  const deniedHeaders: Record<string, string>[] = [{}, { Authorization: `Bearer ${token}` }];
  for (const headers of deniedHeaders) {
    const denied = await fetch(`${base}/v1/watchlist/contract-probe`, {
      method: "DELETE",
      headers,
    });
    if (![401, 403].includes(denied.status)) throw new Error("未授权私有写入边界失效");
  }
  const groups: { name: string; paths: typeof spec.paths; headers: string[] }[] = [
    { name: "service", paths: {}, headers: [`Authorization: Bearer ${token}`] },
    { name: "session", paths: {}, headers: [`Cookie: ${fixture.cookie}`, `Origin: ${base}`] },
  ];
  for (const [path, methods] of Object.entries(paths))
    for (const [method, operation] of Object.entries(methods)) {
      const group = groups[method === "get" || path.startsWith("/v1/internal/") ? 0 : 1];
      if (!group) throw new Error("认证分组失败");
      const methods = group.paths[path] ?? {};
      group.paths[path] = methods;
      methods[method] = operation;
    }
  for (const group of groups) {
    if (!Object.keys(group.paths).length) continue;
    const schemaPath = join(dir, `implemented-${group.name}.yaml`);
    writeFileSync(schemaPath, stringify({ ...spec, paths: group.paths }));
    run(
      "uvx",
      [
        `schemathesis==${SCHEMATHESIS_VERSION}`,
        "run",
        schemaPath,
        "--url",
        base,
        "--phases",
        "fuzzing",
        "--max-examples",
        "20",
        "--generation-database",
        "none",
        "--generation-with-security-parameters",
        "false",
        "--checks",
        "not_a_server_error,status_code_conformance,content_type_conformance,response_schema_conformance",
        ...group.headers.flatMap((header) => ["--header", header]),
        ...args,
      ],
      dir,
    );
  }
} catch (error) {
  console.error(error instanceof Error ? error.message : "契约测试失败");
  process.exitCode = 1;
} finally {
  if (worker?.pid) {
    try {
      if (process.platform !== "win32") process.kill(-worker.pid, "SIGTERM");
      else worker.kill("SIGTERM");
    } catch {}
    await Promise.race([
      new Promise<void>((r) => worker?.once("exit", () => r())),
      new Promise<void>((r) => setTimeout(r, 2000)),
    ]);
  }
  rmSync(dir, { recursive: true, force: true });
}
