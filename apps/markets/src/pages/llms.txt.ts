import type { APIRoute } from "astro";
import { listDays, listWeeklies } from "../lib/data";
export const GET: APIRoute = async () => {
  const days = await listDays();
  const weeklies = await listWeeklies();
  return new Response(
    `# A 股观测台
研究辅助，不构成投资建议。
方法与口径：/methods/
最新摘要：/archive/${days[0]!.date}.md
最新周报：/weekly/${weeklies[0]!.date}.md`,
    { headers: { "Content-Type": "text/plain; charset=utf-8" } },
  );
};
