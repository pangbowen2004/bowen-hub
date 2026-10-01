import type { APIRoute } from "astro";
import { getDay, listDays } from "../../lib/data";
export async function getStaticPaths() {
  return (await listDays()).map((row) => ({ params: { date: row.date } }));
}
export const GET: APIRoute = async ({ params }) => {
  const value = await getDay(params.date!);
  return new Response(
    `# ${value.summary.headline}\n\n日期：${value.date}\n\n${value.summary.text}`,
    { headers: { "Content-Type": "text/markdown; charset=utf-8" } },
  );
};
