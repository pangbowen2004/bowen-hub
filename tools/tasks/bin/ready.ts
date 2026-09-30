// mise run tasks:ready
import { runMain } from "../src/cli.ts";
import { repoRoot } from "../src/git.ts";
import { runReady } from "../src/ready.ts";

runMain("tasks:ready", () => runReady(repoRoot(process.cwd())));
