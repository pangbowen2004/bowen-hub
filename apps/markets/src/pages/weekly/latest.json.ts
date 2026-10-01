import type { APIRoute } from "astro";
import { getWeekly, listWeeklies } from "../../lib/data";
export const GET: APIRoute = async () => {
  const rows = await listWeeklies();
  const value = await getWeekly(rows[0]!.date);
  return new Response(JSON.stringify(value), {
    headers: { "Content-Type": "application/json; charset=utf-8" },
  });
};
