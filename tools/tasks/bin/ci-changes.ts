// mise run ci:changes（CI 用它决定“评测”“性能”两步跑不跑）
import { runChanges } from "../src/changes.ts";
import { runMain } from "../src/cli.ts";
import { repoRoot } from "../src/git.ts";

runMain("ci:changes", () => runChanges(repoRoot(process.cwd()), process.env.GITHUB_OUTPUT));
