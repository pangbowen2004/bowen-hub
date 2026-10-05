import { count } from "@bowen-hub/ui";
import { formatTime } from "./logic";
import { useSources } from "./queries";
import { SectionState } from "./SectionState";

export function SourcesSection() {
  const query = useSources();
  const rows = [...(query.data ?? [])].sort(
    (a, b) =>
      Number(b.status === "failed") - Number(a.status === "failed") || a.id.localeCompare(b.id),
  );
  const failed = rows.filter((row) => row.status === "failed").length;
  return (
    <section className="ops-section" aria-labelledby="ops-sources">
      <h2 id="ops-sources">数据源健康</h2>
      <p className="muted">
        各来源最近一次检查的结果；失败的排在前面。来源清单以配置为准，这里只记运行结果。
      </p>
      <SectionState loading={query.isPending} error={query.error} retry={query.refetch} />
      {query.data && rows.length === 0 && <p>还没有来源检查记录。</p>}
      {rows.length > 0 && (
        <>
          <p>
            共 {count(rows.length)} 个来源，
            {failed === 0 ? "最近一次检查全部正常" : `${count(failed)} 个检查失败`}。
          </p>
          <div className="table-wrap">
            <table>
              <caption className="sr-only">数据源最近一次检查</caption>
              <thead>
                <tr>
                  <th scope="col">来源</th>
                  <th scope="col">状态</th>
                  <th scope="col">最近检查（UTC+8）</th>
                  <th scope="col">错误信息</th>
                </tr>
              </thead>
              <tbody>
                {rows.map((row) => (
                  <tr key={row.id}>
                    <th scope="row" className="ops-mono">
                      {row.id}
                    </th>
                    <td>
                      <span
                        className="badge"
                        data-tone={row.status === "failed" ? "warning" : undefined}
                      >
                        {row.status === "failed" ? "失败" : "正常"}
                      </span>
                    </td>
                    <td className="ops-mono">{formatTime(row.checkedAt)}</td>
                    <td className="ops-wrap">{row.error ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </section>
  );
}
