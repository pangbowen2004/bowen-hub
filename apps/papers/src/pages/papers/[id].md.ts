import type { APIRoute } from "astro";
import { paperMarkdown } from "../../components/paper";
import { getCatalog, getPaper } from "../../lib/data";
export async function getStaticPaths() {
  return (await getCatalog()).papers
    .filter((p) => p.visibility === "public")
    .map((p) => ({ params: { id: p.id } }));
}
export const GET: APIRoute = async ({ params }) => {
  const paper = await getPaper(params.id!);
  return new Response(paperMarkdown(paper), {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
