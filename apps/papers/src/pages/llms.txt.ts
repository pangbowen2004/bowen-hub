import type { APIRoute } from "astro";
import { getCatalog } from "../lib/data";
export const GET: APIRoute = async ({ site }) => {
  const catalog = await getCatalog();
  const url = (path: string) => new URL(path, site).href;
  return new Response(
    `# 论文阅读馆\n\n公开论文的中文导读与原文证据。仅含公开内容；解释性推断不等同于论文原文。\n\n## 论文\n\n${catalog.papers
      .filter((p) => p.visibility === "public")
      .map(
        (p) =>
          `- [${p.titleZh ?? p.title}](${url(`/papers/${p.id}.md`)}): ${p.oneSentence ?? p.title}`,
      )
      .join("\n")}\n`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
