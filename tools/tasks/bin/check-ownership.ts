// mise run check:ownership（CI 里 PR 标题经环境变量 PR_TITLE 传入）
import { runOwnershipCheck } from "../src/check-ownership.ts";
import { runMain } from "../src/cli.ts";
import { repoRoot } from "../src/git.ts";

runMain("check:ownership", () => runOwnershipCheck(repoRoot(process.cwd()), process.env.PR_TITLE));
