import type { APIRoute } from "astro";
import { getWeekly, listWeeklies } from "../../lib/data";
export async function getStaticPaths() {
  return (await listWeeklies()).map((row) => ({ params: { date: row.date } }));
}
export const GET: APIRoute = async ({ params }) => {
  const value = await getWeekly(params.date!);
  return new Response(value.markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
