import { cny, pct } from "@bowen-hub/ui/format";
import type { APIRoute } from "astro";
import { getDay, listDays } from "../../lib/data";
export async function getStaticPaths() {
  return (await listDays()).map((row) => ({ params: { date: row.date } }));
}
export const GET: APIRoute = async ({ params }) => {
  const x = await getDay(params.date!);
  const text = [
    `# ${x.summary.headline}`,
    `日期：${x.date}`,
    x.summary.text,
    `成交额：${cny(x.market.turnoverCny)}；上涨覆盖：${pct(x.market.advanceShare)}；MA20上方：${pct(x.market.aboveMa20Share)}`,
    `支持：${x.summary.support}`,
    `反证：${x.summary.counterEvidence}`,
    "## 风险",
    ...x.summary.risks.map((row) => `- ${row.title}：${row.text}`),
    "## 次日验证",
    ...x.summary.nextValidations.map((row) => `- ${row.title}：${row.text}`),
    `数据缺口：${x.dataStatus.missing.join("、") || "无"}`,
    "研究辅助，不构成投资建议。",
  ].join("\n\n");
  return new Response(text, { headers: { "Content-Type": "text/markdown; charset=utf-8" } });
};
