import type { APIRoute } from "astro";
import { getWeekly, listWeeklies } from "../../lib/data";
export async function getStaticPaths() {
  return (await listWeeklies()).map((row) => ({ params: { date: row.date } }));
}
export const GET: APIRoute = async ({ params }) => {
  const value = await getWeekly(params.date!);
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
