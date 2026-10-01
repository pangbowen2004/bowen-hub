import { readFile, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { type Cloudflare, CloudflareError, client, resources } from "./cloudflare.ts";

async function existingOrCreate<T>(
  api: Cloudflare,
  path: string,
  createPath: string,
  body: unknown,
): Promise<T> {
  try {
    return await api.request<T>(path);
  } catch (error) {
    if (!(error instanceof CloudflareError) || error.status !== 404) throw error;
    return api.request<T>(createPath, "POST", body);
  }
}
export async function bootstrap(api: Cloudflare) {
  let database: { name: string; uuid: string } | undefined;
  for (let page = 1; ; page++) {
    const databases = await api.request<{ name: string; uuid: string }[]>(
      `d1/database?per_page=100&page=${page}`,
    );
    database = databases.find((item) => item.name === resources.database);
    if (database || databases.length < 100) break;
  }
  database ??= await api.request<{ name: string; uuid: string }>("d1/database", "POST", {
    name: resources.database,
  });
  await existingOrCreate<{ name: string }>(api, `r2/buckets/${resources.bucket}`, "r2/buckets", {
    name: resources.bucket,
  });
  const consoleProject = await existingOrCreate<{ name: string; production_branch: string }>(
    api,
    `pages/projects/${resources.console}`,
    "pages/projects",
    { name: resources.console, production_branch: "main" },
  );
  if (consoleProject.production_branch !== "main")
    throw new Error("控制台生产分支不是main，请根审查已有项目配置");
  // G0已建立网关；只确认存在，不替用户购买或建立第二个网关。
  await api.request(`ai-gateway/gateways/${resources.gateway}`);
  return {
    accountId: api.account,
    databaseId: database.uuid,
    databaseName: resources.database,
    bucketName: resources.bucket,
    consoleProject: resources.console,
    gatewayId: resources.gateway,
  };
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    const result = await bootstrap(client());
    const path = new URL("../services/api/wrangler.jsonc", import.meta.url);
    const config = JSON.parse(await readFile(path, "utf8"));
    config.d1_databases.find(
      (binding: { binding: string }) => binding.binding === "DB",
    ).database_id = result.databaseId;
    config.vars.CLOUDFLARE_ACCOUNT_ID = result.accountId;
    config.vars.AI_GATEWAY_ID = result.gatewayId;
    await writeFile(path, `${JSON.stringify(config, null, 2)}\n`);
    await writeFile(
      new URL("cloudflare.json", import.meta.url),
      `${JSON.stringify(result, null, 2)}\n`,
    );
    console.log("D1、R2、控制台、AI Gateway已确认；资源ID已写入配置");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "资源初始化失败");
    process.exitCode = 1;
  }
}
