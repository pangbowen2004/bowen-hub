import type { APIRoute } from "astro";
import { getWeekly, listWeeklies } from "../../lib/data";
export const GET: APIRoute = async () => {
  const rows = await listWeeklies();
  const value = await getWeekly(rows[0]!.date);
  return new Response(value.markdown, {
    headers: { "Content-Type": "text/markdown; charset=utf-8" },
  });
};
