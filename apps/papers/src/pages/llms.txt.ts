import type { APIRoute } from "astro";
import { getCatalog } from "../lib/data";
export const GET: APIRoute = async () =>
  new Response(
    `# 论文阅读馆\n中文导读与原文证据。\n` +
      (await getCatalog()).papers
        .filter((p) => p.visibility === "public")
        .map((p) => `- ${p.titleZh ?? p.title}：${p.oneSentence ?? ""} /papers/${p.id}.md`)
        .join("\n"),
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
