import type { APIRoute } from "astro";
import { getCatalog, getPaper } from "../../lib/data";
export async function getStaticPaths() {
  return (await getCatalog()).papers
    .filter((p) => p.visibility === "public")
    .map((p) => ({ params: { id: p.id } }));
}
export const GET: APIRoute = async ({ params }) => {
  const paper = await getPaper(params.id!);
  return new Response(paper.guide?.article ?? `# ${paper.meta.title}`, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
