import { fileURLToPath } from "node:url";
import { client, required, resources } from "./cloudflare.ts";
export const workerSecrets = [
  "OPENAI_API_KEY",
  "HUB_SERVICE_TOKEN",
  "BETTER_AUTH_SECRET",
  "GH_AUTOMATION_TOKEN",
] as const;
export async function configureWorker(names: string[], env: NodeJS.ProcessEnv = process.env) {
  if (!names.length || names.some((name) => !(workerSecrets as readonly string[]).includes(name)))
    throw new Error("显式指定允许上传的Worker密钥名称；不接受批量环境导出");
  // 先检查全部输入，避免因后续缺项造成部分上传。
  const values = names.map((name) => ({ name, text: required(name, env), type: "secret_text" }));
  const api = client(env);
  for (const value of values)
    await api.request(`workers/scripts/${resources.worker}/secrets`, "PUT", value);
}
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  try {
    await configureWorker(process.argv.slice(2));
    console.log("指定Worker密钥已设置（未输出值）");
  } catch (error) {
    console.error(error instanceof Error ? error.message : "密钥设置失败");
    process.exitCode = 1;
  }
}
