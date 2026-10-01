import { resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { scaffold } from "./scaffold.ts";

const args = process.argv.slice(2);
if (args.includes("--help"))
  console.log("用法：mise run new:capability -- domain.name [--root <临时仓库>]");
else {
  const id = args[0];
  const index = args.indexOf("--root");
  const root = index >= 0 ? args[index + 1] : fileURLToPath(new URL("../../../", import.meta.url));
  if (!id || !root) {
    console.error("缺少能力 id 或 root");
    process.exitCode = 2;
  } else
    try {
      const paths = await scaffold(resolve(root), id);
      console.log(`已生成：\n${paths.join("\n")}\n补齐契约、提示词及评测后运行 mise run gen。`);
    } catch (error) {
      console.error(error instanceof Error ? error.message : "生成失败");
      process.exitCode = 1;
    }
}
